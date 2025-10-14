// Database migration script
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
console.log('🔄 Starting database migration...');
console.log('Database path:', dbPath);

try {
  const db = new sqlite3.Database(dbPath);
  
  // Check if category_id column exists
  const tableInfo = db.prepare("PRAGMA table_info(products)").all();
  const hasCategoryId = tableInfo.some(column => column.name === 'category_id');
  
  if (!hasCategoryId) {
    console.log('📝 Adding category_id column to products table...');
    
    // Add category_id column
    db.prepare('ALTER TABLE products ADD COLUMN category_id TEXT').run();
    console.log('✅ category_id column added');
    
    // Create default category
    const defaultCategoryId = 'cat-general';
    db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, description, color, icon, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(defaultCategoryId, 'General', 'General products', '#6B7280', 'Package', 0);
    
    // Update existing products
    const updateResult = db.prepare('UPDATE products SET category_id = ? WHERE category_id IS NULL OR category_id = ""').run(defaultCategoryId);
    console.log(`✅ Updated ${updateResult.changes} products to use category_id`);
    
  } else {
    console.log('ℹ️  Products table already has category_id column');
  }
  
  // Ensure all products have a category_id
  const productsWithoutCategory = db.prepare("SELECT COUNT(*) as count FROM products WHERE category_id IS NULL OR category_id = ''").get();
  
  if (productsWithoutCategory.count > 0) {
    console.log(`📝 Found ${productsWithoutCategory.count} products without category_id, fixing...`);
    
    // Create default category if it doesn't exist
    db.prepare(`
      INSERT OR IGNORE INTO categories (id, name, description, color, icon, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('cat-general', 'General', 'General products', '#6B7280', 'Package', 0);
    
    // Update products without category_id
    const updateResult = db.prepare("UPDATE products SET category_id = 'cat-general' WHERE category_id IS NULL OR category_id = ''").run();
    console.log(`✅ Updated ${updateResult.changes} products`);
  }
  
  db.close();
  console.log('✅ Database migration completed successfully!');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
