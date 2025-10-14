#!/usr/bin/env node

/**
 * MariaDB/MySQL Database Initialization Script for POS Retail System
 * This script sets up the database schema and initial data for Plesk hosting
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from './server/db-mysql.js';

console.log('🚀 Initializing POS Retail System Database (MariaDB/MySQL)...\n');

async function initializeDatabase() {
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    const connected = await db.testConnection();
    
    if (!connected) {
      console.error('❌ Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Initialize tables
    await db.initializeTables();

    // Check if admin user already exists
    const existingAdmin = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
    
    if (existingAdmin) {
      console.log('ℹ️ Admin user already exists, skipping user creation');
    } else {
      // Create admin user
      console.log('👤 Creating admin user...');
      const adminId = uuidv4();
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.query(`
        INSERT INTO users (id, username, password_hash, full_name, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [adminId, 'admin', hashedPassword, 'System Administrator', 'admin', true]);
      
      console.log('✅ Admin user created (username: admin, password: admin123)');
    }

    // Check if categories exist
    const existingCategories = await db.query('SELECT COUNT(*) as count FROM categories');
    
    if (existingCategories[0].count > 0) {
      console.log('ℹ️ Categories already exist, skipping category creation');
    } else {
      // Create default categories
      console.log('📂 Creating default categories...');
      const categories = [
        {
          id: uuidv4(),
          name: 'Electronics',
          description: 'Electronic devices and accessories',
          color: '#3B82F6'
        },
        {
          id: uuidv4(),
          name: 'Stationery',
          description: 'Office and school supplies',
          color: '#10B981'
        },
        {
          id: uuidv4(),
          name: 'General',
          description: 'General merchandise',
          color: '#F59E0B'
        }
      ];

      for (const category of categories) {
        await db.query(`
          INSERT INTO categories (id, name, description, color, is_active)
          VALUES (?, ?, ?, ?, ?)
        `, [category.id, category.name, category.description, category.color, true]);
      }
      
      console.log('✅ Default categories created');
    }

    // Check if products exist
    const existingProducts = await db.query('SELECT COUNT(*) as count FROM products');
    
    if (existingProducts[0].count > 0) {
      console.log('ℹ️ Products already exist, skipping product creation');
    } else {
      // Create sample products
      console.log('📦 Creating sample products...');
      
      // Get category IDs
      const electronicsCategory = await db.get('SELECT id FROM categories WHERE name = ?', ['Electronics']);
      const stationeryCategory = await db.get('SELECT id FROM categories WHERE name = ?', ['Stationery']);
      const generalCategory = await db.get('SELECT id FROM categories WHERE name = ?', ['General']);

      const products = [
        {
          id: uuidv4(),
          barcode: '1234567890123',
          name: 'Wireless Mouse',
          description: 'Ergonomic wireless mouse with USB receiver',
          category_id: electronicsCategory?.id,
          price: 29.99,
          cost: 15.00,
          stock_quantity: 50,
          min_stock_level: 10
        },
        {
          id: uuidv4(),
          barcode: '1234567890124',
          name: 'Notebook A4',
          description: 'Lined notebook 200 pages',
          category_id: stationeryCategory?.id,
          price: 5.99,
          cost: 2.50,
          stock_quantity: 100,
          min_stock_level: 20
        },
        {
          id: uuidv4(),
          barcode: '1234567890125',
          name: 'Coffee Mug',
          description: 'Ceramic coffee mug 350ml',
          category_id: generalCategory?.id,
          price: 12.99,
          cost: 6.00,
          stock_quantity: 25,
          min_stock_level: 5
        }
      ];

      for (const product of products) {
        await db.query(`
          INSERT INTO products (id, name, description, barcode, category_id, price, cost, stock_quantity, min_stock_level, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          product.id, product.name, product.description, product.barcode,
          product.category_id, product.price, product.cost,
          product.stock_quantity, product.min_stock_level, true
        ]);
      }
      
      console.log('✅ Sample products created');
    }

    // Check if settings exist
    const existingSettings = await db.query('SELECT COUNT(*) as count FROM settings');
    
    if (existingSettings[0].count > 0) {
      console.log('ℹ️ Settings already exist, skipping settings creation');
    } else {
      // Create default settings
      console.log('⚙️ Creating default settings...');
      const settings = [
        { key: 'business_name', value: 'POS Retail System', description: 'Business name' },
        { key: 'business_address', value: '', description: 'Business address' },
        { key: 'business_phone', value: '', description: 'Business phone number' },
        { key: 'business_email', value: '', description: 'Business email address' },
        { key: 'tax_rate', value: '0.10', description: 'Tax rate (10%)' },
        { key: 'currency', value: 'USD', description: 'Currency code' },
        { key: 'currency_symbol', value: '$', description: 'Currency symbol' },
        { key: 'receipt_footer', value: 'Thank you for your business!', description: 'Receipt footer text' },
        { key: 'low_stock_alert', value: '1', description: 'Enable low stock alerts' }
      ];

      for (const setting of settings) {
        await db.query(`
          INSERT INTO settings (key_name, value, description)
          VALUES (?, ?, ?)
        `, [setting.key, setting.value, setting.description]);
      }
      
      console.log('✅ Default settings created');
    }

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Database tables created');
    console.log('  ✅ Admin user: admin / admin123');
    console.log('  ✅ Default categories created');
    console.log('  ✅ Sample products created');
    console.log('  ✅ System settings configured');
    console.log('\n🚀 Your POS system is ready to use!');
    console.log('⚠️  Remember to change the admin password after first login.');

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run initialization
initializeDatabase();
