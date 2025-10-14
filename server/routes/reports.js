import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Sales report
router.get('/sales', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, group_by } = req.query;
    
    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)';
      params.push(start_date, end_date);
    }

    let groupBy = '';
    let selectDate = '';

    if (group_by === 'day') {
      selectDate = 'DATE(created_at) as date,';
      groupBy = 'GROUP BY DATE(created_at)';
    } else if (group_by === 'month') {
      selectDate = "DATE_FORMAT(created_at, '%Y-%m') as date,";
      groupBy = "GROUP BY DATE_FORMAT(created_at, '%Y-%m')";
    } else if (group_by === 'year') {
      selectDate = "DATE_FORMAT(created_at, '%Y') as date,";
      groupBy = "GROUP BY DATE_FORMAT(created_at, '%Y')";
    }

    const query = `
      SELECT 
        ${selectDate}
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'completed' THEN subtotal ELSE 0 END) as subtotal,
        SUM(CASE WHEN status = 'completed' THEN tax ELSE 0 END) as total_tax,
        SUM(CASE WHEN status = 'completed' THEN discount ELSE 0 END) as total_discount,
        AVG(CASE WHEN status = 'completed' THEN total ELSE NULL END) as average_sale,
        SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded_count,
        SUM(CASE WHEN status = 'refunded' THEN total ELSE 0 END) as refunded_amount
      FROM sales
      ${dateFilter}
      ${groupBy}
      ORDER BY date DESC
    `;

    const report = await db.query(query, params);
    res.json(report);
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
});

// Product performance report
router.get('/products', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, limit } = req.query;
    
    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = 'AND DATE(s.created_at) BETWEEN DATE(?) AND DATE(?)';
      params.push(start_date, end_date);
    }

    const limitClause = limit ? `LIMIT ${parseInt(limit)}` : 'LIMIT 50';

    const query = `
      SELECT 
        si.product_id,
        si.product_name,
        p.category_id,
        c.name as category_name,
        SUM(si.quantity) as total_quantity_sold,
        SUM(si.total) as total_revenue,
        COUNT(DISTINCT si.sale_id) as transaction_count,
        AVG(si.unit_price) as average_price,
        p.stock_quantity as current_stock
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE s.status = 'completed' ${dateFilter}
      GROUP BY si.product_id, si.product_name, p.category_id, c.name
      ORDER BY total_revenue DESC
      ${limitClause}
    `;

    const report = await db.query(query, params);
    res.json(report);
  } catch (error) {
    console.error('Product performance report error:', error);
    res.status(500).json({ error: 'Failed to generate product report' });
  }
});

// Category performance report
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = 'AND DATE(s.created_at) BETWEEN DATE(?) AND DATE(?)';
      params.push(start_date, end_date);
    }

    const query = `
      SELECT 
        c.id,
        c.name as category_name,
        COUNT(DISTINCT si.product_id) as product_count,
        SUM(si.quantity) as total_quantity_sold,
        SUM(si.total) as total_revenue,
        COUNT(DISTINCT si.sale_id) as transaction_count
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE s.status = 'completed' ${dateFilter}
      GROUP BY c.id, c.name
      ORDER BY total_revenue DESC
    `;

    const report = await db.query(query, params);
    res.json(report);
  } catch (error) {
    console.error('Category report error:', error);
    res.status(500).json({ error: 'Failed to generate category report' });
  }
});

// Payment methods report
router.get('/payment-methods', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = 'WHERE DATE(created_at) BETWEEN DATE(?) AND DATE(?)';
      params.push(start_date, end_date);
    }

    const query = `
      SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        SUM(total) as total_amount,
        AVG(total) as average_amount
      FROM sales
      ${dateFilter}
      ${dateFilter ? 'AND' : 'WHERE'} status = 'completed'
      GROUP BY payment_method
      ORDER BY total_amount DESC
    `;

    const report = await db.query(query, params);
    res.json(report);
  } catch (error) {
    console.error('Payment methods report error:', error);
    res.status(500).json({ error: 'Failed to generate payment methods report' });
  }
});

// Profit report
router.get('/profit', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params = [];

    if (start_date && end_date) {
      dateFilter = 'AND DATE(s.created_at) BETWEEN DATE(?) AND DATE(?)';
      params.push(start_date, end_date);
    }

    // Calculate revenue from sales
    const revenueQuery = `
      SELECT 
        SUM(si.total) as total_revenue,
        SUM(si.quantity * p.cost) as total_cost
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.status = 'completed' ${dateFilter}
    `;

    const revenue = await db.get(revenueQuery, params);

    // Calculate expenses (Note: expenses table may not exist in current schema)
    const totalRevenue = revenue.total_revenue || 0;
    const totalCost = revenue.total_cost || 0;
    const totalExpenses = 0; // TODO: Add expenses table if needed
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    res.json({
      total_revenue: totalRevenue,
      total_cost: totalCost,
      total_expenses: totalExpenses,
      gross_profit: grossProfit,
      net_profit: netProfit,
      profit_margin: profitMargin,
    });
  } catch (error) {
    console.error('Profit report error:', error);
    res.status(500).json({ error: 'Failed to generate profit report' });
  }
});

// Dashboard summary
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Today's sales
    const todaySales = await db.get(
      'SELECT COUNT(*) as count, SUM(CASE WHEN status = \'completed\' THEN total ELSE 0 END) as revenue FROM sales WHERE DATE(created_at) = DATE(?)',
      [today]
    );

    // This month's sales
    const thisMonth = await db.get(
      'SELECT COUNT(*) as count, SUM(CASE WHEN status = \'completed\' THEN total ELSE 0 END) as revenue FROM sales WHERE DATE_FORMAT(created_at, \'%Y-%m\') = DATE_FORMAT(NOW(), \'%Y-%m\')'
    );

    // Low stock products
    const lowStock = await db.get(
      'SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_level AND is_active = 1'
    );

    // Top selling products today
    const topProducts = await db.query(
      'SELECT si.product_name, SUM(si.quantity) as quantity_sold, SUM(si.total) as revenue FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE DATE(s.created_at) = DATE(?) AND s.status = \'completed\' GROUP BY si.product_id ORDER BY quantity_sold DESC LIMIT 5',
      [today]
    );

    // Recent sales
    const recentSales = await db.query(
      'SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id ORDER BY s.created_at DESC LIMIT 10'
    );

    res.json({
      today: {
        sales_count: todaySales.count,
        revenue: todaySales.revenue || 0,
      },
      this_month: {
        sales_count: thisMonth.count,
        revenue: thisMonth.revenue || 0,
      },
      low_stock_count: lowStock.count,
      top_products: topProducts,
      recent_sales: recentSales,
    });
  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({ error: 'Failed to generate dashboard data' });
  }
});

export default router;
