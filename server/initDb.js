import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, '..', 'database.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('🔧 Initializing database...');

// Create tables
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'cashier', 'manager')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Categories table
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Products table
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
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
    tax REAL NOT NULL,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card', 'mobile', 'other')),
    status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'refunded', 'cancelled')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
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
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- Inventory movements table
  CREATE TABLE IF NOT EXISTS inventory_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('in', 'out', 'adjustment')),
    quantity INTEGER NOT NULL,
    reference TEXT,
    notes TEXT,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Settings table
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Expenses table
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
  CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
  CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);
`);

// Insert default admin user
const hashedPassword = bcrypt.hashSync('admin123', 10);
const adminId = 'admin-' + Date.now();

try {
  db.prepare(`
    INSERT INTO users (id, username, password, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(adminId, 'admin', hashedPassword, 'Administrator', 'admin');
  console.log('✅ Default admin user created (username: admin, password: admin123)');
} catch (error) {
  if (error.message.includes('UNIQUE constraint failed')) {
    console.log('ℹ️  Admin user already exists');
  } else {
    throw error;
  }
}

// Insert default settings
const defaultSettings = [
  ['tax_rate', '0.15'],
  ['currency', 'USD'],
  ['currency_symbol', '$'],
  ['business_name', 'My Retail Store'],
  ['business_address', '123 Main Street'],
  ['business_phone', '+1234567890'],
  ['business_email', 'info@mystore.com'],
  ['receipt_footer', 'Thank you for your business!'],
  ['low_stock_alert', '1'],
  
  // Invoice Printing Settings
  ['invoice_template', 'standard'],
  ['invoice_logo_url', ''],
  ['invoice_paper_size', 'A4'],
  ['invoice_auto_print', '0'],
  ['invoice_copies', '2'],
  ['invoice_show_barcode', '1'],
  ['invoice_show_qr_code', '1'],
  ['invoice_numbering_prefix', 'INV-'],
  ['invoice_numbering_start', '1000'],
  ['invoice_footer_text', 'Terms: Payment due within 30 days'],
  
  // Fiscal Integration Settings
  ['fiscal_enabled', '0'],
  ['fiscal_certificate_path', ''],
  ['fiscal_certificate_password', ''],
  ['fiscal_api_endpoint', ''],
  ['fiscal_company_id', ''],
  ['fiscal_device_id', ''],
  ['fiscal_environment', 'test'],
  ['fiscal_auto_submit', '0'],
  ['fiscal_backup_enabled', '1'],
  ['fiscal_retry_attempts', '3'],
  
  // Tax Authority Settings
  ['tax_authority_name', 'Tax Authority'],
  ['tax_authority_id', ''],
  ['tax_registration_number', ''],
  ['vat_number', ''],
  ['fiscal_year_start', '01-01'],
  
  // Receipt Printer Settings
  ['printer_enabled', '0'],
  ['printer_name', ''],
  ['printer_paper_width', '80'],
  ['printer_cut_paper', '1'],
  ['printer_open_drawer', '1'],
  ['printer_encoding', 'UTF-8'],
];

const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
`);

for (const [key, value] of defaultSettings) {
  insertSetting.run(key, value);
}

console.log('📊 Database tables created successfully');

// Database migrations
console.log('🔄 Running database migrations...');

// Check if category_id column exists in products table
const tableInfo = db.prepare("PRAGMA table_info(products)").all();
const hasCategoryId = tableInfo.some(column => column.name === 'category_id');

if (!hasCategoryId) {
  console.log('📝 Adding category_id column to products table...');
  
  // Add category_id column
  db.prepare('ALTER TABLE products ADD COLUMN category_id TEXT').run();
  console.log('✅ category_id column added to products table');
} else {
  console.log('ℹ️  Products table already has category_id column');
}

console.log('✅ Database migrations completed');

// Create default categories
const defaultCategories = [
  {
    id: 'cat-electronics',
    name: 'Electronics',
    description: 'Electronic devices and accessories',
    color: '#3B82F6',
    icon: 'Smartphone',
    sort_order: 1
  },
  {
    id: 'cat-stationery',
    name: 'Stationery',
    description: 'Office and school supplies',
    color: '#10B981',
    icon: 'PenTool',
    sort_order: 2
  },
  {
    id: 'cat-home-kitchen',
    name: 'Home & Kitchen',
    description: 'Household items and kitchen accessories',
    color: '#F59E0B',
    icon: 'Home',
    sort_order: 3
  },
  {
    id: 'cat-clothing',
    name: 'Clothing',
    description: 'Apparel and fashion items',
    color: '#EF4444',
    icon: 'Shirt',
    sort_order: 4
  },
  {
    id: 'cat-food-beverage',
    name: 'Food & Beverage',
    description: 'Food items and drinks',
    color: '#8B5CF6',
    icon: 'Coffee',
    sort_order: 5
  }
];

const insertCategory = db.prepare(`
  INSERT OR IGNORE INTO categories (id, name, description, color, icon, sort_order)
  VALUES (?, ?, ?, ?, ?, ?)
`);

for (const category of defaultCategories) {
  insertCategory.run(
    category.id,
    category.name,
    category.description,
    category.color,
    category.icon,
    category.sort_order
  );
}

console.log('✅ Default categories created');

// Migrate existing products to use category_id
if (!hasCategoryId) {
  console.log('📝 Migrating existing products to use category_id...');
  
  // Create a default category for existing products
  const defaultCategoryId = 'cat-general';
  try {
    db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, description, color, icon, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(defaultCategoryId, 'General', 'General products', '#6B7280', 'Package', 0);
    
    // Update existing products to use the default category
    const updateResult = db.prepare('UPDATE products SET category_id = ? WHERE category_id IS NULL OR category_id = ""').run(defaultCategoryId);
    console.log(`✅ Updated ${updateResult.changes} products to use category_id`);
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

// Insert sample products
const sampleProducts = [
  {
    id: 'prod-1',
    barcode: '1234567890123',
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse with USB receiver',
    category_id: 'cat-electronics',
    price: 29.99,
    cost: 15.00,
    stock_quantity: 50,
    min_stock_level: 10,
  },
  {
    id: 'prod-2',
    barcode: '2345678901234',
    name: 'USB-C Cable',
    description: '6ft USB-C charging cable',
    category_id: 'cat-electronics',
    price: 12.99,
    cost: 5.00,
    stock_quantity: 100,
    min_stock_level: 20,
  },
  {
    id: 'prod-3',
    barcode: '3456789012345',
    name: 'Notebook A4',
    description: '200-page lined notebook',
    category_id: 'cat-stationery',
    price: 5.99,
    cost: 2.50,
    stock_quantity: 75,
    min_stock_level: 15,
  },
  {
    id: 'prod-4',
    barcode: '4567890123456',
    name: 'Ballpoint Pen (Pack of 10)',
    description: 'Blue ink ballpoint pens',
    category_id: 'cat-stationery',
    price: 8.99,
    cost: 3.00,
    stock_quantity: 60,
    min_stock_level: 10,
  },
  {
    id: 'prod-5',
    barcode: '5678901234567',
    name: 'Water Bottle',
    description: '1L stainless steel water bottle',
    category_id: 'cat-home-kitchen',
    price: 19.99,
    cost: 8.00,
    stock_quantity: 30,
    min_stock_level: 5,
  },
];

const insertProduct = db.prepare(`
  INSERT OR IGNORE INTO products (id, barcode, name, description, category_id, price, cost, stock_quantity, min_stock_level)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const product of sampleProducts) {
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
}

console.log('✅ Sample products created');

db.close();
console.log('🎉 Database initialization completed!');
