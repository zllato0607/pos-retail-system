// Quick setup script to fix all issues and get POS working
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Quick POS Setup & Fix');
console.log('=======================\n');

const dbPath = join(__dirname, 'database.db');

try {
  const db = new sqlite3.Database(dbPath);
  
  console.log('1️⃣ Creating database schema...');
  
  // Create all tables
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Categories table
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
    );
    
    -- Products table
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
    );
    
    -- Customers table
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      loyalty_points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Sales table
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Sale items table
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Inventory movements table
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      reference TEXT,
      user_id TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('✅ Database schema created');
  
  console.log('2️⃣ Creating admin user...');
  
  // Create admin user
  const adminId = uuidv4();
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  db.prepare(`
    INSERT OR REPLACE INTO users (id, username, password, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(adminId, 'admin', hashedPassword, 'Administrator', 'admin');
  
  console.log('✅ Admin user: admin / admin123');
  
  console.log('3️⃣ Creating categories...');
  
  // Create categories
  const categories = [
    { id: 'cat-electronics', name: 'Electronics', description: 'Electronic devices', color: '#3B82F6', icon: 'Smartphone' },
    { id: 'cat-stationery', name: 'Stationery', description: 'Office supplies', color: '#10B981', icon: 'PenTool' },
    { id: 'cat-general', name: 'General', description: 'General products', color: '#6B7280', icon: 'Package' }
  ];
  
  categories.forEach((cat, index) => {
    db.prepare(`
      INSERT OR REPLACE INTO categories (id, name, description, color, icon, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(cat.id, cat.name, cat.description, cat.color, cat.icon, index + 1);
  });
  
  console.log('✅ Categories created');
  
  console.log('4️⃣ Creating sample products...');
  
  // Create products
  const products = [
    {
      id: 'prod-1',
      barcode: '1234567890123',
      name: 'Wireless Mouse',
      description: 'Ergonomic wireless mouse',
      category_id: 'cat-electronics',
      price: 29.99,
      cost: 15.00,
      stock_quantity: 50
    },
    {
      id: 'prod-2',
      barcode: '1234567890124',
      name: 'Notebook A4',
      description: 'Lined notebook 200 pages',
      category_id: 'cat-stationery',
      price: 5.99,
      cost: 2.50,
      stock_quantity: 100
    },
    {
      id: 'prod-3',
      barcode: '1234567890125',
      name: 'Coffee Mug',
      description: 'Ceramic coffee mug 350ml',
      category_id: 'cat-general',
      price: 12.99,
      cost: 6.00,
      stock_quantity: 25
    }
  ];
  
  products.forEach(product => {
    db.prepare(`
      INSERT OR REPLACE INTO products (id, barcode, name, description, category_id, price, cost, stock_quantity, min_stock_level)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product.id, product.barcode, product.name, product.description,
      product.category_id, product.price, product.cost, 
      product.stock_quantity, 10
    );
  });
  
  console.log('✅ Sample products created');
  
  console.log('5️⃣ Creating settings...');
  
  // Create settings
  const settings = [
    ['business_name', 'My Retail Store'],
    ['currency_symbol', '$'],
    ['tax_rate', '0.15'],
    ['receipt_footer', 'Thank you for your business!'],
    ['invoice_numbering_prefix', 'INV-'],
    ['invoice_numbering_start', '1000']
  ];
  
  settings.forEach(([key, value]) => {
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, value);
  });
  
  console.log('✅ Settings configured');
  
  db.close();
  
  console.log('\n🎉 SETUP COMPLETE!');
  console.log('==================');
  console.log('✅ Database: All tables created');
  console.log('✅ Login: admin / admin123');
  console.log('✅ Products: 3 sample products ready');
  console.log('✅ Categories: Electronics, Stationery, General');
  console.log('✅ Settings: Tax rate, currency configured');
  console.log('\n🚀 Start server: npm run dev');
  console.log('🛒 Test POS: Login → POS → Add products → Checkout');
  
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}
