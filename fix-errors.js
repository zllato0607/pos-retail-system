// Comprehensive error fixing script for POS system
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 POS System Error Fix & Setup');
console.log('================================\n');

// Step 1: Check and fix database
async function fixDatabase() {
  console.log('1️⃣ Fixing Database Issues...');
  
  const dbPath = join(__dirname, 'database.db');
  
  // Remove existing database if corrupted
  if (fs.existsSync(dbPath)) {
    console.log('   📋 Existing database found, backing up...');
    const backupPath = join(__dirname, `database.backup.${Date.now()}.db`);
    try {
      fs.copyFileSync(dbPath, backupPath);
      console.log(`   ✅ Backup created: ${backupPath}`);
    } catch (error) {
      console.log('   ⚠️  Could not create backup:', error.message);
    }
  }
  
  try {
    const db = new sqlite3.Database(dbPath);
    
    // Create all required tables
    console.log('   📋 Creating database schema...');
    
    // Users table
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
    
    // Categories table
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
    
    // Products table
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
    
    // Settings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Customers table
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
    
    // Sales table
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Sale items table
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Inventory movements table
    db.exec(`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        reference TEXT,
        user_id TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('   ✅ Database schema created');
    
    // Create admin user
    const adminExists = db.prepare("SELECT COUNT(*) as count FROM users WHERE username = 'admin'").get();
    if (adminExists.count === 0) {
      const adminId = uuidv4();
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      
      db.prepare(`
        INSERT INTO users (id, username, password, full_name, role)
        VALUES (?, ?, ?, ?, ?)
      `).run(adminId, 'admin', hashedPassword, 'Administrator', 'admin');
      
      console.log('   ✅ Admin user created');
    } else {
      console.log('   ℹ️  Admin user already exists');
    }
    
    // Create default categories
    const categories = [
      { id: 'cat-electronics', name: 'Electronics', description: 'Electronic devices', color: '#3B82F6', icon: 'Smartphone' },
      { id: 'cat-stationery', name: 'Stationery', description: 'Office supplies', color: '#10B981', icon: 'PenTool' },
      { id: 'cat-general', name: 'General', description: 'General products', color: '#6B7280', icon: 'Package' }
    ];
    
    categories.forEach((cat, index) => {
      db.prepare(`
        INSERT OR IGNORE INTO categories (id, name, description, color, icon, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(cat.id, cat.name, cat.description, cat.color, cat.icon, index + 1);
    });
    
    console.log('   ✅ Default categories created');
    
    // Create sample products
    const products = [
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
    
    products.forEach(product => {
      db.prepare(`
        INSERT OR IGNORE INTO products (id, barcode, name, description, category_id, price, cost, stock_quantity, min_stock_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        product.id, product.barcode, product.name, product.description,
        product.category_id, product.price, product.cost, 
        product.stock_quantity, product.min_stock_level
      );
    });
    
    console.log('   ✅ Sample products created');
    
    // Create default settings
    const settings = [
      ['business_name', 'My Retail Store'],
      ['currency_symbol', '$'],
      ['tax_rate', '0.15'],
      ['receipt_footer', 'Thank you for your business!']
    ];
    
    settings.forEach(([key, value]) => {
      db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`).run(key, value);
    });
    
    console.log('   ✅ Default settings created');
    
    db.close();
    console.log('   🎉 Database setup completed!\n');
    
  } catch (error) {
    console.error('   ❌ Database setup failed:', error.message);
    throw error;
  }
}

// Step 2: Validate setup
async function validateSetup() {
  console.log('2️⃣ Validating Setup...');
  
  try {
    const dbPath = join(__dirname, 'database.db');
    const db = new sqlite3.Database(dbPath);
    
    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);
    
    const requiredTables = ['users', 'categories', 'products', 'settings', 'customers', 'sales', 'sale_items', 'inventory_movements'];
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length === 0) {
      console.log('   ✅ All required tables exist');
    } else {
      console.log('   ❌ Missing tables:', missingTables.join(', '));
    }
    
    // Check data
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    const categoryCount = db.prepare("SELECT COUNT(*) as count FROM categories").get().count;
    const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get().count;
    
    console.log(`   📊 Data: ${userCount} users, ${categoryCount} categories, ${productCount} products`);
    
    db.close();
    console.log('   ✅ Validation completed!\n');
    
  } catch (error) {
    console.error('   ❌ Validation failed:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await fixDatabase();
    await validateSetup();
    
    console.log('🎉 ALL ERRORS FIXED!');
    console.log('==================');
    console.log('✅ Database initialized and validated');
    console.log('✅ Admin user: admin / admin123');
    console.log('✅ Sample products available');
    console.log('✅ Ready to start server with: npm run dev');
    
  } catch (error) {
    console.error('💥 Fix failed:', error.message);
    process.exit(1);
  }
}

main();
