import { useState, useEffect, useRef } from 'react';
import { Scan, Plus, Minus, Trash2, User, CreditCard } from 'lucide-react';
import api from '../utils/api';
import { formatCurrency } from '../utils/exportUtils';
import Receipt from '../components/Receipt';

export default function POS() {
  const [barcode, setBarcode] = useState('');
  const [cart, setCart] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [settings, setSettings] = useState({});
  const [completedSale, setCompletedSale] = useState(null);
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    loadCustomers();
    loadSettings();
  }, []);

  const loadCustomers = async () => {
    try {
      const data = await api.getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    try {
      const product = await api.getProductByBarcode(barcode.trim());
      addToCart(product);
      setBarcode('');
    } catch (error) {
      alert('Product not found');
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        alert('Insufficient stock');
        return;
      }
      setCart(cart.map(item =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
          : item
      ));
    } else {
      if (product.stock_quantity <= 0) {
        alert('Product out of stock');
        return;
      }
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        discount: 0,
        total: product.price,
      }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity, total: newQuantity * item.unit_price };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = (subtotal * discount) / 100;
    const taxRate = parseFloat(settings.tax_rate || 0);
    const tax = (subtotal - discountAmount) * taxRate;
    const total = subtotal - discountAmount + tax;

    return { subtotal, discountAmount, tax, total };
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }
    
    setProcessing(true);
    try {
      const totals = calculateTotals();
      
      // Validate cart items
      if (cart.length === 0) {
        alert('Please add items to cart before checkout');
        return;
      }

      // Prepare sale data with proper item format
      const saleData = {
        customer_id: selectedCustomer?.id,
        items: cart.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: 0,
          total: item.total
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discountAmount,
        total: totals.total,
        payment_method: paymentMethod,
      };

      console.log('Sending sale data:', saleData);
      const sale = await api.createSale(saleData);
      setCompletedSale(sale);
      
      // Reset cart
      setCart([]);
      setDiscount(0);
      setPaymentMethod('cash');
      
      alert('Sale completed successfully!');
    } catch (error) {
      alert('Failed to process sale: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left side - Product selection */}
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Point of Sale</h1>

        {/* Barcode Scanner */}
        <div className="card mb-6">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-3">
            <div className="flex-1">
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode..."
                className="input"
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary">
              <Scan className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Customer Selection */}
        <div className="card mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-2" />
            Customer (Optional)
          </label>
          <select
            value={selectedCustomer || ''}
            onChange={(e) => setSelectedCustomer(e.target.value || null)}
            className="input"
          >
            <option value="">Walk-in Customer</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.loyalty_points > 0 && `(${customer.loyalty_points} pts)`}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cart Items</h2>
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Cart is empty. Scan products to add.</p>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    <p className="text-sm text-gray-600">{formatCurrency(item.unit_price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, -1)}
                      className="p-1 rounded hover:bg-gray-200"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, 1)}
                      className="p-1 rounded hover:bg-gray-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-24 text-right font-semibold">
                    {formatCurrency(item.total)}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Checkout */}
      <div className="w-96 bg-white border-l border-gray-200 p-6 flex flex-col">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Checkout</h2>

        {/* Totals */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-gray-700">
            <span>Subtotal:</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-gray-700">Discount (%):</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              className="w-20 px-2 py-1 border border-gray-300 rounded"
              min="0"
              max="100"
            />
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount Amount:</span>
              <span>-{formatCurrency(totals.discountAmount)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-gray-700">
            <span>Tax ({(parseFloat(settings.tax_rate || 0) * 100).toFixed(0)}%):</span>
            <span>{formatCurrency(totals.tax)}</span>
          </div>
          
          <div className="flex justify-between text-2xl font-bold text-gray-900 pt-3 border-t">
            <span>Total:</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <CreditCard className="w-4 h-4 inline mr-2" />
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['cash', 'card', 'mobile', 'other'].map(method => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`py-2 px-4 rounded-lg border-2 font-medium capitalize transition-colors ${
                  paymentMethod === method
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {method}
              </button>
            ))}
          </div>
        </div>

        {/* Checkout Button */}
        <button
          onClick={handleCheckout}
          disabled={cart.length === 0 || processing}
          className="w-full btn btn-success py-4 text-lg mt-auto"
        >
          {processing ? 'Processing...' : 'Complete Sale'}
        </button>

        {/* Receipt */}
        {completedSale && (
          <Receipt 
            sale={completedSale} 
            settings={settings}
            onClose={() => setCompletedSale(null)}
          />
        )}
      </div>
    </div>
  );
}
