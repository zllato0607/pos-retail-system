// Simple database initialization script
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.db');
console.log('🔄 Initializing database at:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Create users table
  console.log('📋 Creating users table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create categories table
  console.log('📋 Creating categories table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#3B82F6',
      icon TEXT DEFAULT 'Package',
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create products table
  console.log('📋 Creating products table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT,
      price REAL NOT NULL,
      cost REAL NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      min_stock_level INTEGER DEFAULT 10,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create settings table
  console.log('📋 Creating settings table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create customers table
  console.log('📋 Creating customers table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      loyalty_points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create sales table
  console.log('📋 Creating sales table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      customer_id TEXT,
      user_id TEXT NOT NULL,
      subtotal REAL NOT NULL,
      tax REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create sale_items table
  console.log('📋 Creating sale_items table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Create inventory_movements table
  console.log('📋 Creating inventory_movements table...');
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reference TEXT,
      user_id TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create default admin user
  console.log('👤 Creating default admin user...');
  const adminId = uuidv4();
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  try {
    db.prepare(`
      INSERT INTO users (id, username, password, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminId, 'admin', hashedPassword, 'Administrator', 'admin');
    console.log('✅ Admin user created (username: admin, password: admin123)');
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log('ℹ️  Admin user already exists');
    } else {
      throw error;
    }
  }

  // Create default categories
  console.log('📂 Creating default categories...');
  const defaultCategories = [
    { id: 'cat-electronics', name: 'Electronics', description: 'Electronic devices', color: '#3B82F6', icon: 'Smartphone' },
    { id: 'cat-stationery', name: 'Stationery', description: 'Office supplies', color: '#10B981', icon: 'PenTool' },
    { id: 'cat-general', name: 'General', description: 'General products', color: '#6B7280', icon: 'Package' }
  ];

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name, description, color, icon, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  defaultCategories.forEach((cat, index) => {
    insertCategory.run(cat.id, cat.name, cat.description, cat.color, cat.icon, index + 1);
  });

  // Create default settings
  console.log('⚙️  Creating default settings...');
  const defaultSettings = [
    ['business_name', 'My Retail Store'],
    ['currency_symbol', '$'],
    ['tax_rate', '0.15'],
    ['receipt_footer', 'Thank you for your business!']
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);

  defaultSettings.forEach(([key, value]) => {
    insertSetting.run(key, value);
  });

  // Create sample products
  console.log('📦 Creating sample products...');
  const sampleProducts = [
    {
      id: 'prod-1',
      barcode: '1234567890123',
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      category_id: 'cat-electronics',
      price: 29.99,
      cost: 15.00,
      stock_quantity: 50,
      min_stock_level: 10
    },
    {
      id: 'prod-2',
      barcode: '1234567890124',
      name: 'Notebook A4',
      description: 'Lined notebook 200 pages',
      category_id: 'cat-stationery',
      price: 5.99,
      cost: 2.50,
      stock_quantity: 100,
      min_stock_level: 20
    },
    {
      id: 'prod-3',
      barcode: '1234567890125',
      name: 'Coffee Mug',
      description: 'Ceramic coffee mug 350ml',
      category_id: 'cat-general',
      price: 12.99,
      cost: 6.00,
      stock_quantity: 25,
      min_stock_level: 5
    }
  ];

  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (id, barcode, name, description, category_id, price, cost, stock_quantity, min_stock_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  sampleProducts.forEach(product => {
    insertProduct.run(
      product.id,
      product.barcode,
      product.name,
      product.description,
      product.category_id,
      product.price,
      product.cost,
      product.stock_quantity,
      product.min_stock_level
    );
  });

  db.close();
  console.log('✅ Database initialization completed successfully!');
  console.log('🔑 Login with: username=admin, password=admin123');
  console.log('📦 Sample products created for testing sales');
  
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}
