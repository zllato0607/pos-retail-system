import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../utils/api';

export default function StockModal({ type, onClose }) {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    product_id: '',
    quantity: '',
    reference: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts({ active_only: 'true' });
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        product_id: formData.product_id,
        quantity: parseInt(formData.quantity),
        reference: formData.reference || null,
        notes: formData.notes || null,
      };

      if (type === 'in') {
        await api.stockIn(data);
      } else {
        const product = products.find(p => p.id === formData.product_id);
        if (product) {
          await api.adjustInventory({
            product_id: formData.product_id,
            new_quantity: parseInt(formData.quantity),
            notes: formData.notes || null,
          });
        }
      }

      onClose(true);
    } catch (error) {
      alert('Failed to update stock: ' + error.message);
      setSaving(false);
    }
  };

  const selectedProduct = products.find(p => p.id === formData.product_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {type === 'in' ? 'Add Stock' : 'Adjust Inventory'}
          </h2>
          <button onClick={() => onClose(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product *
            </label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              required
              className="input"
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (Current: {product.stock_quantity})
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Current Stock: <span className="font-semibold text-gray-900">{selectedProduct.stock_quantity}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {type === 'in' ? 'Quantity to Add *' : 'New Stock Quantity *'}
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
              min="0"
              className="input"
            />
          </div>

          {type === 'in' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference (e.g., PO Number)
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="input"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
              className="input"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saving} className="btn btn-primary flex-1">
              {saving ? 'Saving...' : type === 'in' ? 'Add Stock' : 'Adjust Inventory'}
            </button>
            <button
              type="button"
              onClick={() => onClose(false)}
              className="btn btn-outline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
