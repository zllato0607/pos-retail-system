import { useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/exportUtils';

export default function Receipt({ sale, settings, onClose }) {
  const receiptRef = useRef();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between no-print">
          <h2 className="text-xl font-semibold text-gray-900">Receipt</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn btn-primary btn-sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div ref={receiptRef} className="p-6 print-area">
          {/* Business Info */}
          <div className="text-center mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold text-gray-900">{settings.business_name}</h1>
            <p className="text-sm text-gray-600 mt-1">{settings.business_address}</p>
            <p className="text-sm text-gray-600">{settings.business_phone}</p>
            <p className="text-sm text-gray-600">{settings.business_email}</p>
          </div>

          {/* Receipt Info */}
          <div className="mb-4 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Receipt #:</span>
              <span className="font-mono">{sale.id.substring(0, 8)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Date:</span>
              <span>{formatDateTime(sale.created_at)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Cashier:</span>
              <span>{sale.cashier_name}</span>
            </div>
            {sale.customer_name && (
              <div className="flex justify-between mb-1">
                <span className="text-gray-600">Customer:</span>
                <span>{sale.customer_name}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="border-t border-b py-4 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Item</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.product_name}</td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2">{formatCurrency(item.unit_price)}</td>
                    <td className="text-right py-2 font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-2 text-sm mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Tax:</span>
              <span>{formatCurrency(sale.tax)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>TOTAL:</span>
              <span>{formatCurrency(sale.total)}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-gray-600">Payment Method:</span>
              <span className="capitalize font-medium">{sale.payment_method}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-600 border-t pt-4">
            <p>{settings.receipt_footer}</p>
            <p className="mt-2">Thank you for your business!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
