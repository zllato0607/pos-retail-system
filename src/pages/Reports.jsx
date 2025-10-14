import { useState, useEffect } from 'react';
import { Download, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import { formatCurrency, exportToCSV, exportToPDF } from '../utils/exportUtils';

const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });
  const [salesReport, setSalesReport] = useState([]);
  const [productsReport, setProductsReport] = useState([]);
  const [categoriesReport, setCategoriesReport] = useState([]);
  const [profitReport, setProfitReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [sales, products, categories, profit] = await Promise.all([
        api.getSalesReport({ ...dateRange, group_by: 'day' }),
        api.getProductsReport({ ...dateRange, limit: 10 }),
        api.getCategoriesReport(dateRange),
        api.getProfitReport(dateRange),
      ]);
      setSalesReport(sales);
      setProductsReport(products);
      setCategoriesReport(categories);
      setProfitReport(profit);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportSales = (format) => {
    if (format === 'csv') {
      exportToCSV(salesReport, 'sales-report');
    } else {
      exportToPDF(salesReport, 'sales-report', 'Sales Report');
    }
  };

  const handleExportProducts = (format) => {
    if (format === 'csv') {
      exportToCSV(productsReport, 'products-report');
    } else {
      exportToPDF(productsReport, 'products-report', 'Products Performance Report');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Comprehensive business insights and performance metrics</p>
      </div>

      {/* Date Range Filter */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="input"
            />
          </div>
          <button onClick={loadReports} className="btn btn-primary">
            Generate Reports
          </button>
        </div>
      </div>

      {/* Profit Summary */}
      {profitReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatCurrency(profitReport.total_revenue)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Gross Profit</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {formatCurrency(profitReport.gross_profit)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Net Profit</p>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              {formatCurrency(profitReport.net_profit)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm font-medium text-gray-600">Profit Margin</p>
            <p className="text-2xl font-bold text-orange-600 mt-2">
              {profitReport.profit_margin.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {/* Sales Trend */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Sales Trend</h2>
          <div className="flex gap-2">
            <button onClick={() => handleExportSales('csv')} className="btn btn-outline btn-sm">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </button>
            <button onClick={() => handleExportSales('pdf')} className="btn btn-outline btn-sm">
              <Download className="w-4 h-4 mr-2" />
              PDF
            </button>
          </div>
        </div>
        {salesReport.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesReport}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="total_revenue" fill="#0ea5e9" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-center py-8">No sales data for selected period</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Top Products</h2>
            <button onClick={() => handleExportProducts('csv')} className="btn btn-outline btn-sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
          {productsReport.length > 0 ? (
            <div className="space-y-3">
              {productsReport.map((product, index) => (
                <div key={product.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-semibold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{product.product_name}</p>
                      <p className="text-sm text-gray-500">{product.total_quantity_sold} units sold</p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">{formatCurrency(product.total_revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No product data available</p>
          )}
        </div>

        {/* Category Distribution */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sales by Category</h2>
          {categoriesReport.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoriesReport}
                  dataKey="total_revenue"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => entry.category}
                >
                  {categoriesReport.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No category data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
