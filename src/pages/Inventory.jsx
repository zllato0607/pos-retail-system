import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackagePlus, TrendingUp, TrendingDown, RefreshCw, Grid, List, Plus, Edit2, Trash2, BarChart3 } from 'lucide-react';
import api from '../utils/api';
import { formatDateTime } from '../utils/exportUtils';
import StockModal from '../components/StockModal';
import CategoryModal from '../components/CategoryModal';

export default function Inventory() {
  const navigate = useNavigate();
  const [movements, setMovements] = useState([]);
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('in');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [viewMode, setViewMode] = useState('movements'); // 'movements' or 'categories'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [movementsData, summaryData, categoriesData] = await Promise.all([
        api.getInventoryMovements(),
        api.getInventorySummary(),
        api.getCategories(),
      ]);
      setMovements(movementsData);
      setSummary(summaryData);
      setCategories(categoriesData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      setLoading(false);
    }
  };

  const handleModalClose = (reload) => {
    setShowModal(false);
    if (reload) loadData();
  };

  const handleCategoryModalClose = (reload) => {
    setShowCategoryModal(false);
    setSelectedCategory(null);
    if (reload) loadData();
  };

  const handleEditCategory = (category) => {
    setSelectedCategory(category);
    setShowCategoryModal(true);
  };

  const handleDeleteCategory = async (category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;

    try {
      await api.deleteCategory(category.id);
      loadData();
    } catch (error) {
      alert('Failed to delete category: ' + error.message);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'out':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'adjustment':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default:
        return null;
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track and manage your stock levels and categories</p>
        </div>
        <div className="flex gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('movements')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'movements'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4 mr-2 inline" />
              Movements
            </button>
            <button
              onClick={() => setViewMode('categories')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'categories'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="w-4 h-4 mr-2 inline" />
              Categories
            </button>
          </div>
          
          {viewMode === 'categories' ? (
            <button
              onClick={() => setShowCategoryModal(true)}
              className="btn btn-primary"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Category
            </button>
          ) : (
            <button
              onClick={() => {
                setModalType('in');
                setShowModal(true);
              }}
              className="btn btn-primary"
            >
              <PackagePlus className="w-5 h-5 mr-2" />
              Add Stock
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Total Products</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.total_products || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Total Items</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.total_items || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
          <p className="text-3xl font-bold text-orange-600 mt-2">{summary?.low_stock_count || 0}</p>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-gray-600">Out of Stock</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{summary?.out_of_stock_count || 0}</p>
        </div>
      </div>

      {/* Categories View */}
      {viewMode === 'categories' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {category.description && (
                <p className="text-sm text-gray-600 mb-4">{category.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Products</p>
                  <p className="text-2xl font-bold text-gray-900">{category.product_count || 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{category.total_stock || 0}</p>
                </div>
              </div>
              
              <button
                onClick={() => navigate(`/products?category=${category.id}`)}
                className="w-full btn btn-outline btn-sm"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Products
              </button>
            </div>
          ))}
          
          {categories.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No categories yet. Create your first category!</p>
            </div>
          )}
        </div>
      ) : (
        /* Inventory Movements */
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Movements</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Reference</th>
                <th>User</th>
                <th>Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(movement.type)}
                      <span className={`badge ${
                        movement.type === 'in' ? 'badge-success' :
                        movement.type === 'out' ? 'badge-danger' :
                        'badge-info'
                      }`}>
                        {movement.type}
                      </span>
                    </div>
                  </td>
                  <td className="font-medium">{movement.product_name}</td>
                  <td className={`font-semibold ${
                    movement.type === 'in' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movement.type === 'in' ? '+' : '-'}{movement.quantity}
                  </td>
                  <td className="text-sm text-gray-600">{movement.reference || '-'}</td>
                  <td className="text-sm">{movement.user_name}</td>
                  <td className="text-sm text-gray-600">{formatDateTime(movement.created_at)}</td>
                  <td className="text-sm text-gray-600">{movement.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

          {movements.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No inventory movements yet</p>
            </div>
          )}
        </div>
      )}

      {/* Stock Modal */}
      {showModal && (
        <StockModal type={modalType} onClose={handleModalClose} />
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <CategoryModal 
          category={selectedCategory} 
          onClose={handleCategoryModalClose} 
        />
      )}
    </div>
  );
}
