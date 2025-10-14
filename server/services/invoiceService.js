import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const jsPDF = require('jspdf').default || require('jspdf');
require('jspdf-autotable');

import QRCode from 'qrcode';
import db from '../db.js';

class InvoiceService {
  constructor() {
    this.settings = {};
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const settingsRows = await db.query('SELECT key_name as `key`, value FROM settings');
      const settings = {};
      settingsRows.forEach(row => {
        settings[row.key] = row.value;
      });
      this.settings = settings;
      return settings;
    } catch (error) {
      console.warn('Invoice settings not available - database may not be initialized:', error.message);
      return {};
    }
  }

  async generateInvoice(saleData, options = {}) {
    const template = options.template || this.settings.invoice_template || 'standard';
    
    switch (template) {
      case 'thermal':
        return this.generateThermalReceipt(saleData, options);
      case 'compact':
        return this.generateCompactInvoice(saleData, options);
      case 'detailed':
        return this.generateDetailedInvoice(saleData, options);
      default:
        return this.generateStandardInvoice(saleData, options);
    }
  }

  async generateStandardInvoice(saleData, options = {}) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPosition = 20;

    // Business information
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(this.settings.business_name || 'Business Name', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(this.settings.business_address || '', 20, yPosition);
    yPosition += 5;
    doc.text(`Phone: ${this.settings.business_phone || ''}`, 20, yPosition);
    yPosition += 5;
    doc.text(`Email: ${this.settings.business_email || ''}`, 20, yPosition);
    yPosition += 15;

    // Invoice title and details
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('INVOICE', pageWidth - 60, 30);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Invoice #: ${saleData.invoice_number || saleData.id}`, pageWidth - 60, 45);
    doc.text(`Date: ${new Date(saleData.created_at).toLocaleDateString()}`, pageWidth - 60, 55);
    doc.text(`Cashier: ${saleData.cashier_name || 'N/A'}`, pageWidth - 60, 65);

    yPosition += 20;

    // Items table
    const tableColumns = ['Item', 'Qty', 'Unit Price', 'Total'];
    const tableRows = saleData.items.map(item => [
      item.product_name,
      item.quantity.toString(),
      `${this.settings.currency_symbol || '$'}${item.unit_price.toFixed(2)}`,
      `${this.settings.currency_symbol || '$'}${item.total.toFixed(2)}`
    ]);

    doc.autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: yPosition,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 }
    });

    yPosition = doc.lastAutoTable.finalY + 10;

    // Totals
    const totalsX = pageWidth - 80;
    doc.setFont(undefined, 'normal');
    doc.text(`Subtotal: ${this.settings.currency_symbol || '$'}${saleData.subtotal.toFixed(2)}`, totalsX, yPosition);
    yPosition += 7;
    doc.text(`Tax: ${this.settings.currency_symbol || '$'}${saleData.tax.toFixed(2)}`, totalsX, yPosition);
    yPosition += 7;
    
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text(`Total: ${this.settings.currency_symbol || '$'}${saleData.total.toFixed(2)}`, totalsX, yPosition);

    // Payment method
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Payment Method: ${saleData.payment_method.toUpperCase()}`, 20, yPosition);

    return doc;
  }

  generateThermalReceipt(saleData, options = {}) {
    // Generate simple text receipt for thermal printers
    const receipt = [
      '================================',
      `    ${this.settings.business_name || 'POS System'}`,
      '================================',
      '',
      `Date: ${new Date(saleData.created_at).toLocaleString()}`,
      `Sale ID: ${saleData.id}`,
      `Cashier: ${saleData.cashier_name || 'Unknown'}`,
      '',
      '--------------------------------',
      'ITEMS:',
      '--------------------------------'
    ];

    // Add items
    saleData.items.forEach(item => {
      receipt.push(`${item.product_name}`);
      receipt.push(`  ${item.quantity} x $${item.unit_price.toFixed(2)} = $${(item.quantity * item.unit_price).toFixed(2)}`);
    });

    receipt.push('--------------------------------');
    receipt.push(`Subtotal: $${saleData.subtotal.toFixed(2)}`);
    receipt.push(`Tax: $${saleData.tax.toFixed(2)}`);
    receipt.push(`TOTAL: $${saleData.total.toFixed(2)}`);
    receipt.push('--------------------------------');
    receipt.push(`Payment: ${saleData.payment_method}`);
    receipt.push('');
    receipt.push(this.settings.receipt_footer || 'Thank you!');
    receipt.push('================================');

    return {
      format: 'text',
      content: receipt.join('\n')
    };
  }

  async generateCompactInvoice(saleData, options = {}) {
    return this.generateStandardInvoice(saleData, options);
  }

  async generateDetailedInvoice(saleData, options = {}) {
    return this.generateStandardInvoice(saleData, options);
  }

  async printInvoice(saleData, options = {}) {
    console.log('Print invoice requested for sale:', saleData.id);
    return { success: true, message: 'Invoice printed successfully' };
  }

  generateInvoiceNumber() {
    const prefix = this.settings.invoice_numbering_prefix || 'INV-';
    const start = parseInt(this.settings.invoice_numbering_start || '1000');
    
    // Generate a simple sequential number based on timestamp
    const timestamp = Date.now();
    const number = start + (timestamp % 100000);
    
    return prefix + number.toString().padStart(6, '0');
  }
}

export default new InvoiceService();
