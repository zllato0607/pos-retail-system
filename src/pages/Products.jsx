import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, AlertTriangle, Upload, Download } from 'lucide-react';
import api from '../utils/api';
import { formatCurrency } from '../utils/exportUtils';
import ProductModal from '../components/ProductModal';
import ImportExportModal from '../components/ImportExportModal';

export default function Products() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showImportExport, setShowImportExport] = useState(false);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // Handle URL category parameter
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setCategoryFilter(categoryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    filterProducts();
  }, [products, search, categoryFilter]);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts({ active_only: 'true' });
      setProducts(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load products:', error);
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (search) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode?.includes(search) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(p => p.category_id === categoryFilter);
    }

    setFilteredProducts(filtered);
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handleDelete = async (product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    try {
      await api.deleteProduct(product.id);
      loadProducts();
    } catch (error) {
      alert('Failed to delete product: ' + error.message);
    }
  };

  const handleModalClose = (reload) => {
    setShowModal(false);
    setSelectedProduct(null);
    if (reload) loadProducts();
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
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">{products.length} products in catalog</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowImportExport(true)} 
            className="btn btn-outline"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import/Export
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <Plus className="w-5 h-5 mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="input pl-10"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          {categoryFilter && (
            <button
              onClick={() => setCategoryFilter('')}
              className="btn btn-outline btn-sm"
            >
              Clear Filter
            </button>
          )}
        </div>
        
        {/* Active filter indicator */}
        {categoryFilter && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Filtered by category:</strong> {categories.find(c => c.id === categoryFilter)?.name || 'Unknown Category'}
            </p>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Barcode</th>
                <th>Category</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map(product => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td>
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      {product.description && (
                        <p className="text-sm text-gray-500">{product.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="font-mono text-sm">{product.barcode || '-'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: product.category_color || '#3B82F6' }}
                      ></div>
                      <span className="badge badge-info">{product.category_name}</span>
                    </div>
                  </td>
                  <td className="font-semibold">{formatCurrency(product.price)}</td>
                  <td className="text-gray-600">{formatCurrency(product.cost)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        product.stock_quantity <= product.min_stock_level
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {product.stock_quantity}
                      </span>
                      {product.stock_quantity <= product.min_stock_level && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      product.stock_quantity > product.min_stock_level
                        ? 'badge-success'
                        : product.stock_quantity > 0
                        ? 'badge-warning'
                        : 'badge-danger'
                    }`}>
                      {product.stock_quantity > product.min_stock_level
                        ? 'In Stock'
                        : product.stock_quantity > 0
                        ? 'Low Stock'
                        : 'Out of Stock'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <ProductModal
          product={selectedProduct}
          categories={categories}
          onClose={handleModalClose}
        />
      )}

      {/* Import/Export Modal */}
      {showImportExport && (
        <ImportExportModal
          onClose={() => setShowImportExport(false)}
          onImportComplete={() => {
            loadProducts();
            setShowImportExport(false);
          }}
        />
      )}
    </div>
  );
}
