import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import fiscalService from '../services/fiscalService.js';
import invoiceService from '../services/invoiceService.js';

const router = express.Router();

// Get all sales
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, status, customer_id } = req.query;
    
    let query = `
      SELECT s.*, c.name as customer_name, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND DATE(s.created_at) >= DATE(?)';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(s.created_at) <= DATE(?)';
      params.push(end_date);
    }

    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }

    if (customer_id) {
      query += ' AND s.customer_id = ?';
      params.push(customer_id);
    }

    query += ' ORDER BY s.created_at DESC';

    const sales = await db.query(query, params);
    res.json(sales);
  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Failed to get sales' });
  }
});

// Get sale by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const sale = await db.get(
      'SELECT s.*, c.name as customer_name, u.full_name as cashier_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?',
      [req.params.id]
    );
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const items = await db.query('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);
    
    res.json({ ...sale, items });
  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Failed to get sale' });
  }
});

// Create sale
router.post('/', authenticateToken, async (req, res) => {
  console.log('Creating sale for user:', req.user.id);
  console.log('Sale data:', req.body);
  
  try {
    const {
      customer_id,
      items,
      subtotal,
      tax,
      discount,
      total,
      payment_method,
      notes,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Sale must have at least one item' });
    }

    if (!payment_method) {
      return res.status(400).json({ error: 'Payment method required' });
    }

    const saleId = uuidv4();

    // Use transaction for atomicity
    const connection = await db.pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert sale
      await connection.execute(
        'INSERT INTO sales (id, customer_id, user_id, subtotal, tax, discount, total, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [saleId, customer_id || null, req.user.id, subtotal, tax, discount || 0, total, payment_method, notes || null]
      );

      // Insert sale items and update inventory
      for (const item of items) {
        const itemId = uuidv4();
        
        await connection.execute(
          'INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, discount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [itemId, saleId, item.product_id, item.product_name, item.quantity, item.unit_price, item.discount || 0, item.total]
        );

        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );

        const movementId = uuidv4();
        await connection.execute(
          'INSERT INTO inventory_movements (id, product_id, type, quantity, reference, user_id) VALUES (?, ?, ?, ?, ?, ?)',
          [movementId, item.product_id, 'out', item.quantity, `Sale ${saleId}`, req.user.id]
        );
      }

      // Update customer loyalty points if customer exists
      if (customer_id) {
        const points = Math.floor(total / 10); // 1 point per $10 spent
        await connection.execute(
          'UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?',
          [points, customer_id]
        );
      }

      await connection.commit();
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }

    const sale = await db.get(
      'SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?',
      [saleId]
    );

    const saleItems = await db.query('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);

    // Generate invoice number
    let invoiceNumber;
    try {
      invoiceNumber = await invoiceService.generateInvoiceNumber();
      console.log('Generated invoice number:', invoiceNumber);
    } catch (error) {
      console.error('Failed to generate invoice number:', error);
      invoiceNumber = `INV-${Date.now()}`;
    }
    
    // Update sale with invoice number
    await db.query(
      'UPDATE sales SET notes = ? WHERE id = ?',
      [`Invoice: ${invoiceNumber}${notes ? ` | ${notes}` : ''}`, saleId]
    );

    const saleData = { 
      ...sale, 
      items: saleItems, 
      invoice_number: invoiceNumber,
      cashier_name: req.user.full_name 
    };

    // Handle fiscal integration (async)
    if (fiscalService.isEnabled()) {
      fiscalService.submitInvoice(saleData).catch(error => {
        console.error('Fiscal submission failed:', error);
      });
    }

    // Handle auto-printing (async)
    const settings = await invoiceService.loadSettings();
    if (settings.invoice_auto_print === '1') {
      invoiceService.printInvoice(saleData).catch(error => {
        console.error('Auto-print failed:', error);
      });
    }

    res.status(201).json(saleData);
  } catch (error) {
    console.error('Create sale error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    
    let errorMessage = 'Failed to create sale';
    if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Database not initialized - run database setup';
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Database schema mismatch - run database migration';
    }
    
    res.status(500).json({ error: errorMessage, details: error.message });
  }
});

// Refund sale
router.post('/:id/refund', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const sale = await db.get('SELECT * FROM sales WHERE id = ?', [req.params.id]);
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.status === 'refunded') {
      return res.status(400).json({ error: 'Sale already refunded' });
    }

    const items = await db.query('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);

    // Use transaction for atomicity
    const connection = await db.pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute('UPDATE sales SET status = ? WHERE id = ?', ['refunded', req.params.id]);

      for (const item of items) {
        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
        
        const movementId = uuidv4();
        await connection.execute(
          'INSERT INTO inventory_movements (id, product_id, type, quantity, reference, user_id) VALUES (?, ?, ?, ?, ?, ?)',
          [movementId, item.product_id, 'in', item.quantity, `Refund ${req.params.id}`, req.user.id]
        );
      }

      // Deduct loyalty points if customer exists
      if (sale.customer_id) {
        const points = Math.floor(sale.total / 10);
        await connection.execute(
          'UPDATE customers SET loyalty_points = loyalty_points - ? WHERE id = ?',
          [points, sale.customer_id]
        );
      }

      await connection.commit();
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }

    res.json({ message: 'Sale refunded successfully' });
  } catch (error) {
    console.error('Refund sale error:', error);
    res.status(500).json({ error: 'Failed to refund sale' });
  }
});

// Get sales statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)';
      params.push(start_date, end_date);
    }

    const stats = await db.get(
      `SELECT 
        COUNT(*) as total_sales,
        SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status = 'completed' THEN total ELSE NULL END) as average_sale,
        SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded_count
      FROM sales
      ${dateFilter}`,
      params
    );

    res.json(stats);
  } catch (error) {
    console.error('Get sales stats error:', error);
    res.status(500).json({ error: 'Failed to get sales statistics' });
  }
});

// Print invoice
router.post('/:id/print', authenticateToken, async (req, res) => {
  try {
    const sale = await db.get(
      'SELECT s.*, c.name as customer_name, u.full_name as cashier_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?',
      [req.params.id]
    );
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const items = await db.query('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);
    
    const saleData = { 
      ...sale, 
      items,
      invoice_number: sale.notes?.match(/Invoice: ([^\|]+)/)?.[1] || sale.id
    };

    const result = await invoiceService.printInvoice(saleData, req.body);
    res.json(result);
  } catch (error) {
    console.error('Print invoice error:', error);
    res.status(500).json({ error: 'Failed to print invoice' });
  }
});

// Generate invoice PDF
router.get('/:id/invoice', authenticateToken, async (req, res) => {
  try {
    const sale = db.prepare(`
      SELECT s.*, c.name as customer_name, u.full_name as cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(req.params.id);
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(req.params.id);
    
    const saleData = { 
      ...sale, 
      items,
      invoice_number: sale.notes?.match(/Invoice: ([^\|]+)/)?.[1] || sale.id
    };

    const doc = await invoiceService.generateInvoice(saleData);
    
    if (doc.format === 'text') {
      res.setHeader('Content-Type', 'text/plain');
      res.send(doc.content);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${saleData.invoice_number}.pdf"`);
      res.send(Buffer.from(doc.output('arraybuffer')));
    }
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// Get fiscal status
router.get('/:id/fiscal-status', authenticateToken, async (req, res) => {
  try {
    const status = await fiscalService.getFiscalStatus(req.params.id);
    res.json(status);
  } catch (error) {
    console.error('Get fiscal status error:', error);
    res.status(500).json({ error: 'Failed to get fiscal status' });
  }
});

// Retry fiscal submission
router.post('/:id/fiscal-retry', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const sale = await db.get(
      'SELECT s.*, c.name as customer_name, u.full_name as cashier_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?',
      [req.params.id]
    );
    
    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const items = await db.query('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);
    
    const saleData = { 
      ...sale, 
      items,
      invoice_number: sale.notes?.match(/Invoice: ([^\|]+)/)?.[1] || sale.id
    };

    const result = await fiscalService.submitInvoice(saleData);
    res.json(result);
  } catch (error) {
    console.error('Fiscal retry error:', error);
    res.status(500).json({ error: 'Failed to retry fiscal submission' });
  }
});

// Get fiscal report
router.get('/fiscal/report', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { start_date, end_date } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date required' });
    }

    const report = await fiscalService.generateFiscalReport(start_date, end_date);
    res.json(report);
  } catch (error) {
    console.error('Fiscal report error:', error);
    res.status(500).json({ error: 'Failed to generate fiscal report' });
  }
});

export default router;
