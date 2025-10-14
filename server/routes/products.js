import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

// Try to import multer, fallback if not available
let multer;
let upload;

try {
  const multerModule = await import('multer');
  multer = multerModule.default;
  upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    }
  });
} catch (error) {
  console.warn('Multer not available, file upload disabled:', error.message);
  upload = null;
}

const router = express.Router();

// Get all products
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category_id, search, active_only } = req.query;
    
    let query = `
      SELECT p.*, c.name as category_name, c.color as category_color
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (active_only === 'true') {
      query += ' AND p.is_active = 1';
    }

    query += ' ORDER BY p.name ASC';

    const products = await db.query(query, params);
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Get product by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Get product by barcode
router.get('/barcode/:barcode', authenticateToken, async (req, res) => {
  try {
    const product = await db.get('SELECT * FROM products WHERE barcode = ?', [req.params.barcode]);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product by barcode error:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Create product
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      barcode,
      name,
      description,
      category_id,
      price,
      cost,
      stock_quantity,
      min_stock_level,
      image_url,
    } = req.body;

    if (!name || !category_id || price === undefined || cost === undefined) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Verify category exists
    const category = await db.get('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const id = uuidv4();

    await db.query(
      'INSERT INTO products (id, barcode, name, description, category_id, price, cost, stock_quantity, min_stock_level, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, barcode || null, name, description || null, category_id, price, cost, stock_quantity || 0, min_stock_level || 10, image_url || null]
    );

    const product = await db.get(
      'SELECT p.*, c.name as category_name, c.color as category_color FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
      [id]
    );
    
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Barcode already exists' });
    }
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      barcode,
      name,
      description,
      category_id,
      price,
      cost,
      stock_quantity,
      min_stock_level,
      image_url,
      is_active,
    } = req.body;

    const updates = [];
    const params = [];

    if (barcode !== undefined) {
      updates.push('barcode = ?');
      params.push(barcode);
    }
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (category_id !== undefined) {
      // Verify category exists
      const category = await db.get('SELECT id FROM categories WHERE id = ?', [category_id]);
      if (!category) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      updates.push('category_id = ?');
      params.push(category_id);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }
    if (cost !== undefined) {
      updates.push('cost = ?');
      params.push(cost);
    }
    if (stock_quantity !== undefined) {
      updates.push('stock_quantity = ?');
      params.push(stock_quantity);
    }
    if (min_stock_level !== undefined) {
      updates.push('min_stock_level = ?');
      params.push(min_stock_level);
    }
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      params.push(image_url);
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

    await db.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);

    const product = await db.get(
      'SELECT p.*, c.name as category_name, c.color as category_color FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
      [req.params.id]
    );
    
    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get categories (for backward compatibility)
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await db.query('SELECT name FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC');
    res.json(categories.map(c => c.name));
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Get low stock products
router.get('/alerts/low-stock', authenticateToken, async (req, res) => {
  try {
    const products = await db.query(
      'SELECT * FROM products WHERE stock_quantity <= min_stock_level AND is_active = 1 ORDER BY stock_quantity ASC'
    );
    
    res.json(products);
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ error: 'Failed to get low stock products' });
  }
});

// Simple export endpoint (returns JSON)
router.get('/export-json', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const products = await db.query('SELECT * FROM products ORDER BY name');
    const categories = await db.query('SELECT * FROM categories');
    
    res.json({
      success: true,
      products: products,
      categories: categories,
      count: products.length
    });
  } catch (error) {
    console.error('Export JSON error:', error);
    res.status(500).json({ error: 'Failed to export products data' });
  }
});

// Export products to CSV
router.get('/export', authenticateToken, async (req, res) => {
  console.log('Export endpoint called by user:', req.user.username);
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    console.log('Querying products for export...');
    
    // Get all products with category names
    let products;
    try {
      products = await db.query(
        'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.name'
      );
      console.log(`Found ${products.length} products to export`);
    } catch (dbError) {
      console.error('Database query failed:', dbError);
      // Fallback: get products without category names
      products = await db.query('SELECT * FROM products ORDER BY name');
      console.log(`Fallback: Found ${products.length} products to export`);
    }

    // Generate CSV headers
    const headers = [
      'Name', 'Description', 'Barcode', 'Category', 'Price', 'Cost', 
      'Stock Quantity', 'Min Stock Level', 'Active'
    ];

    // Convert products to CSV rows
    const rows = products.map(product => [
      product.name || '',
      product.description || '',
      product.barcode || '',
      product.category_name || '',
      product.price || 0,
      product.cost || 0,
      product.stock_quantity || 0,
      product.min_stock_level || 0,
      product.is_active ? 'Yes' : 'No'
    ]);

    // Create CSV content
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Set response headers for file download
    const filename = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export products error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ error: 'Failed to export products: ' + error.message });
  }
});

// Simple import endpoint (without file upload)
router.post('/import-text', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { csvContent } = req.body;
    
    if (!csvContent) {
      return res.status(400).json({ error: 'No CSV content provided' });
    }

    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV must contain at least a header row and one data row' });
    }

    // Parse CSV
    const headers = parseCSVLine(lines[0]);
    const errors = [];
    let successCount = 0;

    // Get categories for lookup
    const categories = await db.query('SELECT id, name FROM categories');
    const categoryLookup = {};
    categories.forEach(cat => {
      categoryLookup[cat.name.toLowerCase()] = cat.id;
    });

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const product = parseProductFromCSV(headers, values, categoryLookup);
        
        if (product) {
          // Insert or update product
          const existingProduct = await db.get('SELECT id FROM products WHERE barcode = ? OR name = ?', [product.barcode, product.name]);

          if (existingProduct) {
            // Update existing product
            await db.query(
              'UPDATE products SET name = ?, description = ?, barcode = ?, category_id = ?, price = ?, cost = ?, stock_quantity = ?, min_stock_level = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [product.name, product.description, product.barcode, product.category_id,
               product.price, product.cost, product.stock_quantity, product.min_stock_level,
               product.is_active ? 1 : 0, existingProduct.id]
            );
          } else {
            // Insert new product
            await db.query(
              'INSERT INTO products (id, name, description, barcode, category_id, price, cost, stock_quantity, min_stock_level, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [uuidv4(), product.name, product.description, product.barcode, product.category_id,
               product.price, product.cost, product.stock_quantity, product.min_stock_level,
               product.is_active ? 1 : 0]
            );
          }
          
          successCount++;
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Import completed: ${successCount} products processed`,
      imported: successCount,
      errors: errors
    });

  } catch (error) {
    console.error('Import products error:', error);
    res.status(500).json({ error: 'Failed to import products' });
  }
});

// Import products from CSV
router.post('/import', authenticateToken, (req, res, next) => {
  // Check if multer is available
  if (!upload) {
    return res.status(500).json({ 
      error: 'File upload not available. Please install multer package: npm install multer' 
    });
  }
  
  // Use multer middleware
  upload.single('csvFile')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No CSV file provided' });
      }

    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV file must contain at least a header row and one data row' });
    }

    // Parse CSV
    const headers = parseCSVLine(lines[0]);
    const products = [];
    const errors = [];
    let successCount = 0;

    // Get categories for lookup
    const categories = await db.query('SELECT id, name FROM categories');
    const categoryLookup = {};
    categories.forEach(cat => {
      categoryLookup[cat.name.toLowerCase()] = cat.id;
    });

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const product = parseProductFromCSV(headers, values, categoryLookup);
        
        if (product) {
          // Insert or update product
          const existingProduct = await db.get('SELECT id FROM products WHERE barcode = ? OR name = ?', [product.barcode, product.name]);

          if (existingProduct) {
            // Update existing product
            await db.query(
              'UPDATE products SET name = ?, description = ?, barcode = ?, category_id = ?, price = ?, cost = ?, stock_quantity = ?, min_stock_level = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
              [product.name, product.description, product.barcode, product.category_id,
               product.price, product.cost, product.stock_quantity, product.min_stock_level,
               product.is_active ? 1 : 0, existingProduct.id]
            );
          } else {
            // Insert new product
            await db.query(
              'INSERT INTO products (id, name, description, barcode, category_id, price, cost, stock_quantity, min_stock_level, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [uuidv4(), product.name, product.description, product.barcode, product.category_id,
               product.price, product.cost, product.stock_quantity, product.min_stock_level,
               product.is_active ? 1 : 0]
            );
          }
          
          successCount++;
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Import completed: ${successCount} products processed`,
      imported: successCount,
      errors: errors
    });

    } catch (error) {
      console.error('Import products error:', error);
      res.status(500).json({ error: 'Failed to import products' });
    }
  });
});

// Helper functions for CSV parsing
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseProductFromCSV(headers, values, categoryLookup) {
  const product = {};
  
  const columnMapping = {
    'name': 'name',
    'description': 'description', 
    'barcode': 'barcode',
    'category': 'category_name',
    'price': 'price',
    'cost': 'cost',
    'stock quantity': 'stock_quantity',
    'min stock level': 'min_stock_level',
    'active': 'is_active'
  };

  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    const productField = columnMapping[normalizedHeader];
    const value = values[index] || '';

    if (productField) {
      switch (productField) {
        case 'price':
        case 'cost':
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue < 0) {
            throw new Error(`Invalid ${productField}: ${value}`);
          }
          product[productField] = numValue;
          break;

        case 'stock_quantity':
        case 'min_stock_level':
          const intValue = parseInt(value) || 0;
          product[productField] = Math.max(0, intValue);
          break;

        case 'is_active':
          product[productField] = ['yes', 'true', '1', 'active'].includes(value.toLowerCase());
          break;

        case 'category_name':
          const categoryId = categoryLookup[value.toLowerCase()];
          product.category_id = categoryId || null;
          break;

        default:
          product[productField] = value.trim();
      }
    }
  });

  // Validate required fields
  if (!product.name) {
    throw new Error('Product name is required');
  }

  if (product.price === undefined) {
    throw new Error('Price is required');
  }

  // Set defaults
  product.cost = product.cost || 0;
  product.stock_quantity = product.stock_quantity || 0;
  product.min_stock_level = product.min_stock_level || 10;
  product.is_active = product.is_active !== undefined ? product.is_active : true;

  return product;
}

export default router;
