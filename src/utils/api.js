const API_URL = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('JSON Parse Error:', jsonError);
          const text = await response.text();
          console.error('Raw Response:', text);
          throw new Error('Server returned invalid JSON response');
        }
      } else {
        // Handle non-JSON responses (like plain text errors)
        const text = await response.text();
        data = { error: text };
      }

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      // Handle JSON parsing errors specifically
      if (error.message.includes('Unexpected token')) {
        console.error('JSON Parse Error - Server returned non-JSON response:', error);
        throw new Error('Server returned an invalid response. Please try again.');
      }
      
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth
  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/products${query ? `?${query}` : ''}`);
  }

  async getProduct(id) {
    return this.request(`/products/${id}`);
  }

  async getProductByBarcode(barcode) {
    return this.request(`/products/barcode/${barcode}`);
  }

  async createProduct(productData) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async updateProduct(id, productData) {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(id) {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Product Import/Export
  async exportProducts() {
    console.log('Exporting products using client-side method...');
    
    try {
      // Get products and categories using existing endpoints
      const products = await this.getProducts();
      const categories = await this.getCategories();
      
      console.log(`Found ${products.length} products and ${categories.length} categories`);
      
      // Create category lookup
      const categoryLookup = {};
      categories.forEach(cat => {
        categoryLookup[cat.id] = cat.name;
      });
      
      // Generate CSV content
      const headers = ['Name', 'Description', 'Barcode', 'Category', 'Price', 'Cost', 'Stock Quantity', 'Min Stock Level', 'Active'];
      
      const rows = products.map(product => [
        product.name || '',
        product.description || '',
        product.barcode || '',
        categoryLookup[product.category_id] || '',
        product.price || 0,
        product.cost || 0,
        product.stock_quantity || 0,
        product.min_stock_level || 0,
        product.is_active ? 'Yes' : 'No'
      ]);
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      // Create blob
      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export products: ' + error.message);
    }
  }

  async importProducts(csvFile) {
    console.log('Importing products with file:', csvFile.name);
    
    try {
      // First try file upload method
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      
      const response = await fetch(`${API_URL}/products/import`, {
        method: 'POST',
        headers: {
          'Authorization': this.getHeaders()['Authorization'],
        },
        body: formData,
      });
      
      console.log('Import response status:', response.status);
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.log('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response: ${text}`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to import products');
      }
      
      return data;
      
    } catch (error) {
      console.log('Server import failed, trying client-side method:', error.message);
      
      // Fallback to client-side import
      return this.importProductsClientSide(csvFile);
    }
  }

  async importProductsClientSide(csvFile) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const csvContent = e.target.result;
          const result = await this.processCSVImport(csvContent);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(csvFile);
    });
  }

  async processCSVImport(csvContent) {
    console.log('Processing CSV import client-side...');
    
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    // Parse CSV
    const headers = this.parseCSVLine(lines[0]);
    const errors = [];
    let successCount = 0;

    // Get categories for lookup
    const categories = await this.getCategories();
    const categoryLookup = {};
    categories.forEach(cat => {
      categoryLookup[cat.name.toLowerCase()] = cat.id;
    });

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        const product = this.parseProductFromCSV(headers, values, categoryLookup);
        
        if (product) {
          // Try to create the product using existing API
          try {
            await this.createProduct(product);
            successCount++;
          } catch (createError) {
            // If product exists, try to update it
            if (createError.message.includes('already exists') || createError.message.includes('UNIQUE constraint')) {
              try {
                // Find existing product by name or barcode
                const existingProducts = await this.getProducts();
                const existing = existingProducts.find(p => 
                  p.name === product.name || (product.barcode && p.barcode === product.barcode)
                );
                
                if (existing) {
                  await this.updateProduct(existing.id, product);
                  successCount++;
                } else {
                  errors.push(`Row ${i + 1}: ${createError.message}`);
                }
              } catch (updateError) {
                errors.push(`Row ${i + 1}: ${updateError.message}`);
              }
            } else {
              errors.push(`Row ${i + 1}: ${createError.message}`);
            }
          }
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    return {
      success: true,
      message: `Import completed: ${successCount} products processed`,
      imported: successCount,
      errors: errors
    };
  }

  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  parseProductFromCSV(headers, values, categoryLookup) {
    const product = {};
    
    const columnMapping = {
      'name': 'name',
      'description': 'description', 
      'barcode': 'barcode',
      'category': 'category_name',
      'price': 'price',
      'cost': 'cost',
      'stock quantity': 'stock_quantity',
      'min stock level': 'min_stock_level',
      'active': 'is_active'
    };

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().trim();
      const productField = columnMapping[normalizedHeader];
      const value = values[index] || '';

      if (productField) {
        switch (productField) {
          case 'price':
          case 'cost':
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue < 0) {
              throw new Error(`Invalid ${productField}: ${value}`);
            }
            product[productField] = numValue;
            break;

          case 'stock_quantity':
          case 'min_stock_level':
            const intValue = parseInt(value) || 0;
            product[productField] = Math.max(0, intValue);
            break;

          case 'is_active':
            product[productField] = ['yes', 'true', '1', 'active'].includes(value.toLowerCase());
            break;

          case 'category_name':
            const categoryId = categoryLookup[value.toLowerCase()];
            product.category_id = categoryId || null;
            break;

          default:
            product[productField] = value.trim();
        }
      }
    });

    // Validate required fields
    if (!product.name) {
      throw new Error('Product name is required');
    }

    if (product.price === undefined) {
      throw new Error('Price is required');
    }

    // Set defaults
    product.cost = product.cost || 0;
    product.stock_quantity = product.stock_quantity || 0;
    product.min_stock_level = product.min_stock_level || 10;
    product.is_active = product.is_active !== undefined ? product.is_active : true;

    return product;
  }

  async getCategories() {
    return this.request('/categories');
  }

  async getCategoryNames() {
    return this.request('/products/meta/categories');
  }

  async createCategory(categoryData) {
    console.log('API: Creating category with data:', categoryData);
    console.log('API: Current token:', this.token);
    
    const result = await this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
    
    console.log('API: Category creation result:', result);
    return result;
  }

  async updateCategory(id, categoryData) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategoryProducts(id) {
    return this.request(`/categories/${id}/products`);
  }

  async getCategoryStats(id) {
    return this.request(`/categories/${id}/stats`);
  }

  async reorderCategories(categories) {
    return this.request('/categories/reorder', {
      method: 'PUT',
      body: JSON.stringify({ categories }),
    });
  }

  async getLowStockProducts() {
    return this.request('/products/alerts/low-stock');
  }

  // Sales
  async getSales(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/sales${query ? `?${query}` : ''}`);
  }

  async getSale(id) {
    return this.request(`/sales/${id}`);
  }

  async createSale(saleData) {
    return this.request('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
  }

  async refundSale(id) {
    return this.request(`/sales/${id}/refund`, {
      method: 'POST',
    });
  }

  async getSalesStats(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/sales/stats/summary${query ? `?${query}` : ''}`);
  }

  // Inventory
  async getInventoryMovements(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/inventory/movements${query ? `?${query}` : ''}`);
  }

  async stockIn(data) {
    return this.request('/inventory/stock-in', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adjustInventory(data) {
    return this.request('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getInventorySummary() {
    return this.request('/inventory/summary');
  }

  // Customers
  async getCustomers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/customers${query ? `?${query}` : ''}`);
  }

  async getCustomer(id) {
    return this.request(`/customers/${id}`);
  }

  async createCustomer(customerData) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
  }

  async updateCustomer(id, customerData) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
  }

  async deleteCustomer(id) {
    return this.request(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // Reports
  async getSalesReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/sales${query ? `?${query}` : ''}`);
  }

  async getProductsReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/products${query ? `?${query}` : ''}`);
  }

  async getCategoriesReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/categories${query ? `?${query}` : ''}`);
  }

  async getPaymentMethodsReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/payment-methods${query ? `?${query}` : ''}`);
  }

  async getProfitReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/reports/profit${query ? `?${query}` : ''}`);
  }

  async getDashboard() {
    return this.request('/reports/dashboard');
  }

  // Settings
  async getSettings() {
    return this.request('/settings');
  }

  async updateSetting(key, value) {
    return this.request(`/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  async getUsers() {
    return this.request('/settings/users/all');
  }

  async deleteUser(id) {
    return this.request(`/settings/users/${id}`, {
      method: 'DELETE',
    });
  }
}

export default new ApiClient();
