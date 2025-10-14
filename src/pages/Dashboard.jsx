import { useState, useEffect } from 'react';
import { DollarSign, ShoppingCart, Package, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import { formatCurrency, formatDateTime } from '../utils/exportUtils';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await api.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    {
      name: "Today's Sales",
      value: formatCurrency(dashboard?.today?.revenue || 0),
      subtitle: `${dashboard?.today?.sales_count || 0} transactions`,
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      name: "This Month",
      value: formatCurrency(dashboard?.this_month?.revenue || 0),
      subtitle: `${dashboard?.this_month?.sales_count || 0} transactions`,
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      name: "Top Products",
      value: dashboard?.top_products?.length || 0,
      subtitle: 'Selling today',
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      name: "Low Stock",
      value: dashboard?.low_stock_count || 0,
      subtitle: 'Items need attention',
      icon: AlertTriangle,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products Today</h2>
          {dashboard?.top_products?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboard.top_products}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantity_sold" fill="#0ea5e9" name="Quantity Sold" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No sales data available</p>
          )}
        </div>

        {/* Recent Sales */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {dashboard?.recent_sales?.length > 0 ? (
              dashboard.recent_sales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {sale.customer_name || 'Walk-in Customer'}
                    </p>
                    <p className="text-sm text-gray-500">{formatDateTime(sale.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(sale.total)}</p>
                    <span className={`badge ${
                      sale.status === 'completed' ? 'badge-success' :
                      sale.status === 'refunded' ? 'badge-danger' :
                      'badge-info'
                    }`}>
                      {sale.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No recent sales</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
