import fs from 'fs';
import https from 'https';
import crypto from 'crypto';
import db from '../db.js';

class FiscalService {
  constructor() {
    this.settings = {};
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const settingsRows = await db.query('SELECT key_name as `key`, value FROM settings WHERE key_name LIKE ?', ['fiscal_%']);
      const settings = {};
      settingsRows.forEach(row => {
        settings[row.key] = row.value;
      });
      this.settings = settings;
      return settings;
    } catch (error) {
      console.warn('Fiscal settings not available - database may not be initialized:', error.message);
      this.settings = {};
      return {};
    }
  }

  isEnabled() {
    return this.settings.fiscal_enabled === '1';
  }

  async submitInvoice(saleData) {
    if (!this.isEnabled()) {
      return { success: true, message: 'Fiscal integration disabled' };
    }

    try {
      // Prepare fiscal invoice data
      const fiscalInvoice = this.prepareFiscalInvoice(saleData);
      
      // Sign the invoice if certificate is configured
      if (this.settings.fiscal_certificate_path) {
        fiscalInvoice.signature = await this.signInvoice(fiscalInvoice);
      }

      // Submit to tax authority
      const result = await this.submitToTaxAuthority(fiscalInvoice);
      
      // Store fiscal record
      await this.storeFiscalRecord(saleData.id, result);
      
      return result;
    } catch (error) {
      console.error('Fiscal submission error:', error);
      
      // Store failed attempt for retry
      await this.storeFiscalRecord(saleData.id, {
        success: false,
        error: error.message,
        retry_count: 0
      });
      
      return { success: false, error: error.message };
    }
  }

  prepareFiscalInvoice(saleData) {
    return {
      invoice_number: saleData.invoice_number || this.generateInvoiceNumber(),
      date: new Date().toISOString(),
      company_id: this.settings.fiscal_company_id,
      device_id: this.settings.fiscal_device_id,
      customer: saleData.customer || null,
      items: saleData.items.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: parseFloat(this.settings.tax_rate || 0),
        total: item.total
      })),
      subtotal: saleData.subtotal,
      tax: saleData.tax,
      total: saleData.total,
      payment_method: saleData.payment_method,
      tax_registration_number: this.settings.tax_registration_number,
      vat_number: this.settings.vat_number
    };
  }

  async signInvoice(invoiceData) {
    try {
      if (!fs.existsSync(this.settings.fiscal_certificate_path)) {
        throw new Error('Fiscal certificate not found');
      }

      // Load certificate (this is a simplified example)
      // In production, you'd use proper certificate handling libraries
      const certificateData = fs.readFileSync(this.settings.fiscal_certificate_path);
      const invoiceString = JSON.stringify(invoiceData);
      
      // Create signature using certificate
      const signature = crypto
        .createHash('sha256')
        .update(invoiceString + this.settings.fiscal_certificate_password)
        .digest('hex');

      return signature;
    } catch (error) {
      throw new Error(`Certificate signing failed: ${error.message}`);
    }
  }

  async submitToTaxAuthority(fiscalInvoice) {
    return new Promise((resolve, reject) => {
      if (!this.settings.fiscal_api_endpoint) {
        reject(new Error('Fiscal API endpoint not configured'));
        return;
      }

      const postData = JSON.stringify(fiscalInvoice);
      const url = new URL(this.settings.fiscal_api_endpoint);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'POS-System/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            
            if (res.statusCode === 200 && response.success) {
              resolve({
                success: true,
                fiscal_id: response.fiscal_id,
                qr_code: response.qr_code,
                verification_url: response.verification_url,
                message: 'Invoice submitted successfully'
              });
            } else {
              reject(new Error(response.message || 'Fiscal submission failed'));
            }
          } catch (error) {
            reject(new Error('Invalid response from tax authority'));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Network error: ${error.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  async storeFiscalRecord(saleId, result) {
    try {
      // Create fiscal_records table if it doesn't exist
      await db.query(`
        CREATE TABLE IF NOT EXISTS fiscal_records (
          id VARCHAR(36) PRIMARY KEY,
          sale_id VARCHAR(36) NOT NULL,
          fiscal_id VARCHAR(100),
          qr_code TEXT,
          verification_url TEXT,
          signature TEXT,
          status VARCHAR(20) NOT NULL,
          error_message TEXT,
          retry_count INT DEFAULT 0,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (sale_id) REFERENCES sales(id)
        )
      `);

      const recordId = 'fiscal-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      
      await db.query(`
        INSERT INTO fiscal_records (
          id, sale_id, fiscal_id, qr_code, verification_url, 
          status, error_message, retry_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        recordId,
        saleId,
        result.fiscal_id || null,
        result.qr_code || null,
        result.verification_url || null,
        result.success ? 'submitted' : 'failed',
        result.error || null,
        result.retry_count || 0
      ]);

    } catch (error) {
      console.error('Failed to store fiscal record:', error);
    }
  }

  async generateInvoiceNumber() {
    const prefix = this.settings.invoice_numbering_prefix || 'INV-';
    const start = parseInt(this.settings.invoice_numbering_start || '1000');
    
    // Get the last invoice number from database
    const lastInvoice = await db.get(`
      SELECT MAX(CAST(SUBSTRING(id, LENGTH(?) + 1) AS UNSIGNED)) as last_num 
      FROM sales 
      WHERE id LIKE ?
    `, [prefix, prefix + '%']);
    
    const nextNumber = (lastInvoice?.last_num || start - 1) + 1;
    return prefix + nextNumber.toString().padStart(6, '0');
  }

  async retryFailedSubmissions() {
    if (!this.isEnabled()) return;

    const maxRetries = parseInt(this.settings.fiscal_retry_attempts || '3');
    
    const failedRecords = await db.query(`
      SELECT fr.*, s.* FROM fiscal_records fr
      JOIN sales s ON fr.sale_id = s.id
      WHERE fr.status = 'failed' AND fr.retry_count < ?
    `, [maxRetries]);

    for (const record of failedRecords) {
      try {
        console.log(`Retrying fiscal submission for sale ${record.sale_id}`);
        
        const saleData = {
          id: record.sale_id,
          subtotal: record.subtotal,
          tax: record.tax,
          total: record.total,
          payment_method: record.payment_method,
          items: await this.getSaleItems(record.sale_id)
        };

        const result = await this.submitInvoice(saleData);
        
        if (result.success) {
          // Update the record as successful
          await db.query(`
            UPDATE fiscal_records 
            SET status = 'submitted', fiscal_id = ?, qr_code = ?, verification_url = ?
            WHERE id = ?
          `, [result.fiscal_id, result.qr_code, result.verification_url, record.id]);
        } else {
          // Increment retry count
          await db.query(`
            UPDATE fiscal_records 
            SET retry_count = retry_count + 1, error_message = ?
            WHERE id = ?
          `, [result.error, record.id]);
        }
      } catch (error) {
        console.error(`Retry failed for sale ${record.sale_id}:`, error);
        
        // Increment retry count
        await db.query(`
          UPDATE fiscal_records 
          SET retry_count = retry_count + 1, error_message = ?
          WHERE id = ?
        `, [error.message, record.id]);
      }
    }
  }

  async getSaleItems(saleId) {
    return await db.query('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
  }

  async getFiscalStatus(saleId) {
    const record = await db.get(`
      SELECT * FROM fiscal_records WHERE sale_id = ? ORDER BY submitted_at DESC LIMIT 1
    `, [saleId]);
    
    return record || { status: 'not_submitted' };
  }

  async generateFiscalReport(startDate, endDate) {
    const records = await db.query(`
      SELECT fr.*, s.total, s.created_at
      FROM fiscal_records fr
      JOIN sales s ON fr.sale_id = s.id
      WHERE s.created_at BETWEEN ? AND ?
      ORDER BY s.created_at DESC
    `, [startDate, endDate]);

    const summary = {
      total_sales: records.length,
      submitted: records.filter(r => r.status === 'submitted').length,
      failed: records.filter(r => r.status === 'failed').length,
      pending_retry: records.filter(r => r.status === 'failed' && r.retry_count < 3).length,
      total_amount: records.reduce((sum, r) => sum + r.total, 0)
    };

    return { records, summary };
  }
}

export default new FiscalService();
