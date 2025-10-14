import { X, Printer } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/exportUtils';

export default function SaleDetailsModal({ sale, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between no-print">
          <h2 className="text-xl font-semibold text-gray-900">Sale Details</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn btn-outline btn-sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 print-area">
          {/* Sale Info */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Sale ID</p>
                <p className="font-mono font-medium">{sale.id}</p>
              </div>
              <div>
                <p className="text-gray-600">Date & Time</p>
                <p className="font-medium">{formatDateTime(sale.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-600">Customer</p>
                <p className="font-medium">{sale.customer_name || 'Walk-in Customer'}</p>
              </div>
              <div>
                <p className="text-gray-600">Cashier</p>
                <p className="font-medium">{sale.cashier_name}</p>
              </div>
              <div>
                <p className="text-gray-600">Payment Method</p>
                <p className="font-medium capitalize">{sale.payment_method}</p>
              </div>
              <div>
                <p className="text-gray-600">Status</p>
                <span className={`badge ${
                  sale.status === 'completed' ? 'badge-success' :
                  sale.status === 'refunded' ? 'badge-danger' :
                  'badge-warning'
                }`}>
                  {sale.status}
                </span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Items</h3>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Discount</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.product_name}</td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unit_price)}</td>
                      <td>{formatCurrency(item.discount)}</td>
                      <td className="font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="border-t pt-4">
            <div className="space-y-2 max-w-xs ml-auto">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>Tax:</span>
                <span>{formatCurrency(sale.tax)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                <span>Total:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>

          {sale.notes && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">Notes:</p>
              <p className="text-sm text-gray-600">{sale.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
