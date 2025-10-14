import { useState, useEffect } from 'react';
import { Receipt, Eye, RotateCcw, Download } from 'lucide-react';
import api from '../utils/api';
import { formatCurrency, formatDateTime, exportToCSV, exportToPDF } from '../utils/exportUtils';
import SaleDetailsModal from '../components/SaleDetailsModal';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    filterSales();
  }, [sales, filters]);

  const loadSales = async () => {
    try {
      const data = await api.getSales();
      setSales(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load sales:', error);
      setLoading(false);
    }
  };

  const filterSales = () => {
    let filtered = sales;

    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }

    if (filters.start_date) {
      filtered = filtered.filter(s => 
        new Date(s.created_at) >= new Date(filters.start_date)
      );
    }

    if (filters.end_date) {
      filtered = filtered.filter(s => 
        new Date(s.created_at) <= new Date(filters.end_date)
      );
    }

    setFilteredSales(filtered);
  };

  const handleViewDetails = async (sale) => {
    try {
      const details = await api.getSale(sale.id);
      setSelectedSale(details);
      setShowModal(true);
    } catch (error) {
      alert('Failed to load sale details');
    }
  };

  const handleRefund = async (sale) => {
    if (!confirm('Are you sure you want to refund this sale?')) return;

    try {
      await api.refundSale(sale.id);
      loadSales();
      alert('Sale refunded successfully');
    } catch (error) {
      alert('Failed to refund sale: ' + error.message);
    }
  };

  const handleExport = (format) => {
    const exportData = filteredSales.map(sale => ({
      Date: formatDateTime(sale.created_at),
      Customer: sale.customer_name || 'Walk-in',
      Cashier: sale.cashier_name,
      Subtotal: sale.subtotal,
      Tax: sale.tax,
      Discount: sale.discount,
      Total: sale.total,
      Payment: sale.payment_method,
      Status: sale.status,
    }));

    if (format === 'csv') {
      exportToCSV(exportData, 'sales-report');
    } else if (format === 'pdf') {
      exportToPDF(exportData, 'sales-report', 'Sales Report');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales History</h1>
          <p className="text-gray-600 mt-1">{sales.length} total transactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleExport('csv')} className="btn btn-outline">
            <Download className="w-5 h-5 mr-2" />
            Export CSV
          </button>
          <button onClick={() => handleExport('pdf')} className="btn btn-outline">
            <Download className="w-5 h-5 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input"
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Customer</th>
                <th>Cashier</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="text-sm">{formatDateTime(sale.created_at)}</td>
                  <td className="font-medium">{sale.customer_name || 'Walk-in Customer'}</td>
                  <td className="text-sm">{sale.cashier_name}</td>
                  <td className="text-sm text-gray-600">View details</td>
                  <td className="font-semibold">{formatCurrency(sale.total)}</td>
                  <td>
                    <span className="badge badge-info capitalize">{sale.payment_method}</span>
                  </td>
                  <td>
                    <span className={`badge ${
                      sale.status === 'completed' ? 'badge-success' :
                      sale.status === 'refunded' ? 'badge-danger' :
                      'badge-warning'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetails(sale)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {sale.status === 'completed' && (
                        <button
                          onClick={() => handleRefund(sale)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Refund"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSales.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No sales found</p>
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      {showModal && selectedSale && (
        <SaleDetailsModal sale={selectedSale} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
