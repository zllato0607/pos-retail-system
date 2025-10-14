import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get inventory movements
router.get('/movements', authenticateToken, async (req, res) => {
  try {
    const { product_id, type, start_date, end_date } = req.query;
    
    let query = `
      SELECT im.*, p.name as product_name, u.full_name as user_name
      FROM inventory_movements im
      LEFT JOIN products p ON im.product_id = p.id
      LEFT JOIN users u ON im.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (product_id) {
      query += ' AND im.product_id = ?';
      params.push(product_id);
    }

    if (type) {
      query += ' AND im.type = ?';
      params.push(type);
    }

    if (start_date) {
      query += ' AND DATE(im.created_at) >= DATE(?)';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(im.created_at) <= DATE(?)';
      params.push(end_date);
    }

    query += ' ORDER BY im.created_at DESC LIMIT 100';

    const movements = await db.query(query, params);
    res.json(movements);
  } catch (error) {
    console.error('Get inventory movements error:', error);
    res.status(500).json({ error: 'Failed to get inventory movements' });
  }
});

// Add inventory (stock in)
router.post('/stock-in', authenticateToken, async (req, res) => {
  try {
    const { product_id, quantity, reference, notes } = req.body;

    if (!product_id || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid product or quantity' });
    }

    const movementId = uuidv4();

    // Use transaction for atomicity
    const connection = await db.pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute(
        'INSERT INTO inventory_movements (id, product_id, type, quantity, reference, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [movementId, product_id, 'in', quantity, reference || null, notes || null, req.user.id]
      );

      await connection.execute(
        'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [quantity, product_id]
      );

      await connection.commit();
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }

    const movement = await db.get(
      'SELECT im.*, p.name as product_name FROM inventory_movements im LEFT JOIN products p ON im.product_id = p.id WHERE im.id = ?',
      [movementId]
    );

    res.status(201).json(movement);
  } catch (error) {
    console.error('Stock in error:', error);
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

// Adjust inventory
router.post('/adjust', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { product_id, new_quantity, notes } = req.body;

    if (!product_id || new_quantity === undefined || new_quantity < 0) {
      return res.status(400).json({ error: 'Invalid product or quantity' });
    }

    const product = await db.get('SELECT stock_quantity FROM products WHERE id = ?', [product_id]);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const difference = new_quantity - product.stock_quantity;
    const movementId = uuidv4();

    // Use transaction for atomicity
    const connection = await db.pool.getConnection();
    await connection.beginTransaction();

    try {
      await connection.execute(
        'INSERT INTO inventory_movements (id, product_id, type, quantity, notes, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        [movementId, product_id, 'adjustment', Math.abs(difference), notes || null, req.user.id]
      );

      await connection.execute(
        'UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [new_quantity, product_id]
      );

      await connection.commit();
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }

    const movement = await db.get(
      'SELECT im.*, p.name as product_name FROM inventory_movements im LEFT JOIN products p ON im.product_id = p.id WHERE im.id = ?',
      [movementId]
    );

    res.status(201).json(movement);
  } catch (error) {
    console.error('Adjust inventory error:', error);
    res.status(500).json({ error: 'Failed to adjust inventory' });
  }
});

// Get inventory summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await db.get(
      'SELECT COUNT(*) as total_products, SUM(stock_quantity) as total_items, SUM(stock_quantity * cost) as total_value, COUNT(CASE WHEN stock_quantity <= min_stock_level THEN 1 END) as low_stock_count, COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock_count FROM products WHERE is_active = 1'
    );

    res.json(summary);
  } catch (error) {
    console.error('Get inventory summary error:', error);
    res.status(500).json({ error: 'Failed to get inventory summary' });
  }
});

export default router;
