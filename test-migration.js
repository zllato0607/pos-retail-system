// Test database migration
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');
console.log('Database path:', dbPath);

try {
  const db = new sqlite3.Database(dbPath);
  
  // Check current table structure
  console.log('\n📋 Current products table structure:');
  const tableInfo = db.prepare("PRAGMA table_info(products)").all();
  tableInfo.forEach(column => {
    console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.dflt_value ? `DEFAULT ${column.dflt_value}` : ''}`);
  });
  
  // Check if category_id exists
  const hasCategoryId = tableInfo.some(column => column.name === 'category_id');
  console.log(`\n🔍 Has category_id column: ${hasCategoryId}`);
  
  // Check existing products
  const productCount = db.prepare("SELECT COUNT(*) as count FROM products").get();
  console.log(`📦 Total products: ${productCount.count}`);
  
  if (hasCategoryId) {
    const productsWithCategoryId = db.prepare("SELECT COUNT(*) as count FROM products WHERE category_id IS NOT NULL").get();
    console.log(`✅ Products with category_id: ${productsWithCategoryId.count}`);
  }
  
  // Check categories
  const categoryCount = db.prepare("SELECT COUNT(*) as count FROM categories").get();
  console.log(`📂 Total categories: ${categoryCount.count}`);
  
  db.close();
  console.log('\n✅ Database check completed');
  
} catch (error) {
  console.error('❌ Database error:', error.message);
}
