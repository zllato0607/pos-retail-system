import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { active_only } = req.query;
    
    let query = `
      SELECT c.*, 
             COUNT(p.id) as product_count,
             SUM(p.stock_quantity) as total_stock
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
      WHERE 1=1
    `;
    const params = [];

    if (active_only === 'true') {
      query += ' AND c.is_active = 1';
    }

    query += ' GROUP BY c.id ORDER BY c.sort_order ASC, c.name ASC';

    const categories = await db.query(query, params);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Get category by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const category = await db.get(
      'SELECT c.*, COUNT(p.id) as product_count, SUM(p.stock_quantity) as total_stock FROM categories c LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1 WHERE c.id = ? GROUP BY c.id',
      [req.params.id]
    );
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to get category' });
  }
});

// Create category
router.post('/', authenticateToken, async (req, res) => {
  console.log('POST /api/categories - Request received');
  console.log('Request body:', req.body);
  console.log('User:', req.user);
  
  try {
    if (!req.user) {
      console.log('No user found in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      console.log('Insufficient permissions for user:', req.user.role);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { name, description, color, icon, sort_order } = req.body;

    if (!name || name.trim() === '') {
      console.log('Category name is missing or empty');
      return res.status(400).json({ error: 'Category name is required' });
    }

    const id = uuidv4();
    console.log('Creating category with ID:', id);

    await db.query(
      'INSERT INTO categories (id, name, description, color, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name.trim(), description?.trim() || null, color || '#3B82F6', icon || null, sort_order || 0]
    );

    console.log('Category inserted successfully');

    const category = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    console.log('Created category:', category);
    
    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create category: ' + error.message });
  }
});

// Update category
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { name, description, color, icon, sort_order, is_active } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    if (icon !== undefined) {
      updates.push('icon = ?');
      params.push(icon);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(sort_order);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);

    await db.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, params);

    const category = await db.get('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(category);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if category has products
    const productCount = await db.get('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [req.params.id]);
    
    if (productCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing products. Move or delete products first.' 
      });
    }

    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get category products
router.get('/:id/products', authenticateToken, async (req, res) => {
  try {
    const { active_only } = req.query;
    
    let query = 'SELECT * FROM products WHERE category_id = ?';
    const params = [req.params.id];

    if (active_only === 'true') {
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY name ASC';

    const products = await db.query(query, params);
    res.json(products);
  } catch (error) {
    console.error('Get category products error:', error);
    res.status(500).json({ error: 'Failed to get category products' });
  }
});

// Get category statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await db.get(
      'SELECT COUNT(p.id) as total_products, SUM(p.stock_quantity) as total_stock, SUM(CASE WHEN p.stock_quantity <= p.min_stock_level THEN 1 ELSE 0 END) as low_stock_count, SUM(CASE WHEN p.stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count, AVG(p.price) as avg_price, SUM(p.stock_quantity * p.cost) as total_inventory_value FROM products p WHERE p.category_id = ? AND p.is_active = 1',
      [req.params.id]
    );

    res.json(stats);
  } catch (error) {
    console.error('Get category stats error:', error);
    res.status(500).json({ error: 'Failed to get category statistics' });
  }
});

// Reorder categories
router.put('/reorder', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories array is required' });
    }

    // Update sort order for each category
    for (let i = 0; i < categories.length; i++) {
      await db.query('UPDATE categories SET sort_order = ? WHERE id = ?', [i, categories[i].id]);
    }

    res.json({ message: 'Categories reordered successfully' });
  } catch (error) {
    console.error('Reorder categories error:', error);
    res.status(500).json({ error: 'Failed to reorder categories' });
  }
});

export default router;
