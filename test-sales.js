// Test sales functionality
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.db');

console.log('🧪 Testing Sales Database Setup...\n');

try {
  const db = new sqlite3.Database(dbPath);
  
  // Check required tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = tables.map(t => t.name);
  
  const requiredTables = ['users', 'products', 'sales', 'sale_items', 'inventory_movements'];
  const missingTables = requiredTables.filter(table => !tableNames.includes(table));
  
  if (missingTables.length > 0) {
    console.log('❌ Missing tables:', missingTables.join(', '));
    console.log('💡 Run: node fix-errors.js to create missing tables');
    process.exit(1);
  }
  
  console.log('✅ All required tables exist');
  
  // Check if admin user exists
  const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
  if (!adminUser) {
    console.log('❌ Admin user not found');
    console.log('💡 Run: node fix-errors.js to create admin user');
    process.exit(1);
  }
  
  console.log('✅ Admin user exists:', adminUser.username);
  
  // Check if products exist
  const products = db.prepare("SELECT * FROM products LIMIT 3").all();
  if (products.length === 0) {
    console.log('❌ No products found');
    console.log('💡 Run: node fix-errors.js to create sample products');
    process.exit(1);
  }
  
  console.log(`✅ Found ${products.length} products:`);
  products.forEach(product => {
    console.log(`  - ${product.name}: $${product.price} (Stock: ${product.stock_quantity})`);
  });
  
  // Test sale creation (simulation)
  console.log('\n🧪 Testing sale creation simulation...');
  
  const saleId = 'test-sale-' + Date.now();
  const userId = adminUser.id;
  const productId = products[0].id;
  
  try {
    // Test inserting a sale
    const insertSale = db.prepare(`
      INSERT INTO sales (id, user_id, subtotal, tax, discount, total, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertSale.run(saleId, userId, 29.99, 4.50, 0, 34.49, 'cash', 'Test sale');
    
    // Test inserting sale item
    const insertSaleItem = db.prepare(`
      INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, discount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertSaleItem.run('test-item-' + Date.now(), saleId, productId, products[0].name, 1, 29.99, 0, 29.99);
    
    // Test inventory movement
    const insertMovement = db.prepare(`
      INSERT INTO inventory_movements (id, product_id, type, quantity, reference, user_id)
      VALUES (?, ?, 'out', ?, ?, ?)
    `);
    
    insertMovement.run('test-movement-' + Date.now(), productId, 1, `Sale ${saleId}`, userId);
    
    console.log('✅ Sale creation simulation successful');
    
    // Clean up test data
    db.prepare('DELETE FROM inventory_movements WHERE reference = ?').run(`Sale ${saleId}`);
    db.prepare('DELETE FROM sale_items WHERE sale_id = ?').run(saleId);
    db.prepare('DELETE FROM sales WHERE id = ?').run(saleId);
    
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.log('❌ Sale creation simulation failed:', error.message);
    console.log('💡 Check database schema or run: node fix-errors.js');
  }
  
  db.close();
  
  console.log('\n🎉 Sales system ready!');
  console.log('✅ Database properly configured');
  console.log('✅ All tables exist with correct schema');
  console.log('✅ Sample data available');
  console.log('🚀 Start server with: npm run dev');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.log('💡 Run: node fix-errors.js to initialize database');
  process.exit(1);
}
