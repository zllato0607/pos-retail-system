import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Load environment variables
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config();
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'fixmobi1_pos',
  password: process.env.DB_PASSWORD || 'Br9c5v*49',
  database: process.env.DB_NAME || 'fixmobi1_pos',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Connected to MariaDB database');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Execute query with error handling
async function query(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Get single row
async function get(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results[0] || null;
  } catch (error) {
    console.error('Database get error:', error);
    throw error;
  }
}

// Execute with transaction
async function transaction(callback) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Initialize database tables
async function initializeTables() {
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      role ENUM('admin', 'manager', 'cashier') DEFAULT 'cashier',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Categories table
    `CREATE TABLE IF NOT EXISTS categories (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      color VARCHAR(7) DEFAULT '#3B82F6',
      icon VARCHAR(50),
      sort_order INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Products table
    `CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      barcode VARCHAR(50) UNIQUE,
      category_id VARCHAR(36),
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      cost DECIMAL(10,2) DEFAULT 0.00,
      stock_quantity INT DEFAULT 0,
      min_stock_level INT DEFAULT 10,
      image_url VARCHAR(255),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      INDEX idx_barcode (barcode),
      INDEX idx_category (category_id),
      INDEX idx_name (name)
    )`,

    // Customers table
    `CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20),
      address TEXT,
      loyalty_points INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_phone (phone)
    )`,

    // Sales table
    `CREATE TABLE IF NOT EXISTS sales (
      id VARCHAR(36) PRIMARY KEY,
      customer_id VARCHAR(36),
      user_id VARCHAR(36),
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      tax DECIMAL(10,2) DEFAULT 0.00,
      discount DECIMAL(10,2) DEFAULT 0.00,
      total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      payment_method ENUM('cash', 'card', 'digital') DEFAULT 'cash',
      status ENUM('pending', 'completed', 'cancelled', 'refunded') DEFAULT 'completed',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_date (created_at),
      INDEX idx_customer (customer_id),
      INDEX idx_status (status)
    )`,

    // Sale items table
    `CREATE TABLE IF NOT EXISTS sale_items (
      id VARCHAR(36) PRIMARY KEY,
      sale_id VARCHAR(36) NOT NULL,
      product_id VARCHAR(36) NOT NULL,
      product_name VARCHAR(200) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      discount DECIMAL(10,2) DEFAULT 0.00,
      total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      INDEX idx_sale (sale_id),
      INDEX idx_product (product_id)
    )`,

    // Inventory movements table
    `CREATE TABLE IF NOT EXISTS inventory_movements (
      id VARCHAR(36) PRIMARY KEY,
      product_id VARCHAR(36) NOT NULL,
      type ENUM('in', 'out', 'adjustment') NOT NULL,
      quantity INT NOT NULL,
      reference VARCHAR(200),
      notes TEXT,
      user_id VARCHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_product (product_id),
      INDEX idx_type (type),
      INDEX idx_date (created_at)
    )`,

    // Settings table
    `CREATE TABLE IF NOT EXISTS settings (
      key_name VARCHAR(100) PRIMARY KEY,
      value TEXT,
      description TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  ];

  console.log('🗄️ Initializing database tables...');
  
  for (const tableSQL of tables) {
    try {
      await query(tableSQL);
    } catch (error) {
      console.error('Error creating table:', error.message);
      throw error;
    }
  }
  
  console.log('✅ Database tables initialized successfully');
}

// Wrapper to provide better-sqlite3-like API for compatibility
function prepare(sql) {
  return {
    run: async (...params) => {
      return await query(sql, params);
    },
    get: async (...params) => {
      return await get(sql, params);
    },
    all: async (...params) => {
      return await query(sql, params);
    }
  };
}

// Synchronous versions for backward compatibility (will log warnings)
function prepareSync(sql) {
  console.warn('Warning: Using synchronous db.prepare() - this should be converted to async');
  return {
    run: (...params) => {
      throw new Error('Synchronous db.prepare().run() is not supported with MySQL. Use async/await.');
    },
    get: (...params) => {
      throw new Error('Synchronous db.prepare().get() is not supported with MySQL. Use async/await.');
    },
    all: (...params) => {
      throw new Error('Synchronous db.prepare().all() is not supported with MySQL. Use async/await.');
    }
  };
}

export default {
  pool,
  query,
  get,
  transaction,
  testConnection,
  initializeTables,
  prepare: prepareSync  // This will throw errors to help identify sync usage
};
