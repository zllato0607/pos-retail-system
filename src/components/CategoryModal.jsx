import { useState, useEffect } from 'react';
import { X, Save, Palette } from 'lucide-react';
import api from '../utils/api';

const PREDEFINED_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

const ICON_OPTIONS = [
  'Package', 'Smartphone', 'Laptop', 'Monitor', 'Headphones',
  'PenTool', 'BookOpen', 'FileText', 'Scissors', 'Ruler',
  'Home', 'Coffee', 'Utensils', 'Refrigerator', 'Sofa',
  'Shirt', 'ShoppingBag', 'Watch', 'Glasses', 'Crown',
  'Car', 'Bike', 'Gamepad2', 'Music', 'Camera',
  'Heart', 'Star', 'Gift', 'Zap', 'Flame'
];

export default function CategoryModal({ category, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'Package',
    sort_order: 0,
  });
  const [loading, setLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [existingCategories, setExistingCategories] = useState([]);

  useEffect(() => {
    loadExistingCategories();
    if (category) {
      setFormData({
        name: category.name || '',
        description: category.description || '',
        color: category.color || '#3B82F6',
        icon: category.icon || 'Package',
        sort_order: category.sort_order || 0,
      });
    }
  }, [category]);

  const loadExistingCategories = async () => {
    try {
      const categories = await api.getCategories();
      setExistingCategories(categories);
    } catch (error) {
      console.error('Failed to load existing categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate form data
      if (!formData.name || formData.name.trim() === '') {
        alert('Category name is required');
        setLoading(false);
        return;
      }

      // Check for duplicate names (only for new categories)
      if (!category) {
        const duplicateName = existingCategories.find(
          cat => cat.name.toLowerCase() === formData.name.trim().toLowerCase()
        );
        if (duplicateName) {
          alert(`A category named "${duplicateName.name}" already exists. Please choose a different name.`);
          setLoading(false);
          return;
        }
      }

      // Clean the form data
      const cleanData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
      };

      console.log('Submitting category data:', cleanData);
      
      if (category) {
        console.log('Updating category:', category.id);
        await api.updateCategory(category.id, cleanData);
      } else {
        console.log('Creating new category');
        const result = await api.createCategory(cleanData);
        console.log('Category created:', result);
      }
      onClose(true);
    } catch (error) {
      console.error('Category save error:', error);
      let errorMessage = 'Failed to save category';
      
      if (error.message.includes('UNIQUE constraint failed')) {
        errorMessage = 'A category with this name already exists. Please choose a different name.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {category ? 'Edit Category' : 'Add Category'}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="input"
              placeholder="Enter category name"
              required
            />
            {existingCategories.length > 0 && !category && (
              <p className="text-xs text-gray-500 mt-1">
                Existing categories: {existingCategories.map(cat => cat.name).join(', ')}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="input"
              rows="3"
              placeholder="Enter category description"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-12 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center"
                style={{ backgroundColor: formData.color }}
              >
                <Palette className="w-4 h-4 text-white" />
              </button>
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="input flex-1"
                placeholder="#3B82F6"
              />
            </div>
            
            {showColorPicker && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {PREDEFINED_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      handleChange('color', color);
                      setShowColorPicker(false);
                    }}
                    className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <select
              value={formData.icon}
              onChange={(e) => handleChange('icon', e.target.value)}
              className="input"
            >
              {ICON_OPTIONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort Order
            </label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => handleChange('sort_order', parseInt(e.target.value) || 0)}
              className="input"
              min="0"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower numbers appear first
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="btn btn-outline flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
