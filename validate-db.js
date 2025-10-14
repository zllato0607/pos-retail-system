// Validate database structure and fix common issues
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.db');

console.log('🔍 Validating database structure...');

try {
  const db = new sqlite3.Database(dbPath);
  
  // Check if database file exists and is accessible
  console.log('✅ Database file accessible');
  
  // Get list of all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('\n📋 Current tables:');
  tables.forEach(table => {
    console.log(`  - ${table.name}`);
  });
  
  // Required tables for POS system
  const requiredTables = [
    'users', 'categories', 'products', 'settings', 
    'customers', 'sales', 'sale_items', 'inventory_movements'
  ];
  
  console.log('\n🔍 Checking required tables...');
  const existingTableNames = tables.map(t => t.name);
  const missingTables = requiredTables.filter(table => !existingTableNames.includes(table));
  
  if (missingTables.length > 0) {
    console.log('❌ Missing tables:', missingTables.join(', '));
    console.log('💡 Run: node init-database.js to create missing tables');
  } else {
    console.log('✅ All required tables exist');
  }
  
  // Check if admin user exists
  try {
    const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
    if (adminUser) {
      console.log('✅ Admin user exists');
    } else {
      console.log('❌ Admin user missing');
    }
  } catch (error) {
    console.log('❌ Cannot check admin user:', error.message);
  }
  
  // Check if categories exist
  try {
    const categories = db.prepare("SELECT COUNT(*) as count FROM categories").get();
    console.log(`✅ Categories: ${categories.count} found`);
  } catch (error) {
    console.log('❌ Cannot check categories:', error.message);
  }
  
  // Check if products exist
  try {
    const products = db.prepare("SELECT COUNT(*) as count FROM products").get();
    console.log(`✅ Products: ${products.count} found`);
  } catch (error) {
    console.log('❌ Cannot check products:', error.message);
  }
  
  db.close();
  console.log('\n🎯 Database validation completed!');
  
} catch (error) {
  console.error('❌ Database validation failed:', error.message);
  
  if (error.code === 'SQLITE_CANTOPEN') {
    console.log('💡 Database file does not exist. Run: node init-database.js');
  } else {
    console.log('💡 Try running: node init-database.js to reinitialize');
  }
}
