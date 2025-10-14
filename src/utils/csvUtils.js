// CSV Import/Export utilities for products
import { v4 as uuidv4 } from 'uuid';

export const exportProductsToCSV = (products, categories) => {
  // Create category lookup
  const categoryLookup = {};
  categories.forEach(cat => {
    categoryLookup[cat.id] = cat.name;
  });

  // CSV headers
  const headers = [
    'Name',
    'Description', 
    'Barcode',
    'Category',
    'Price',
    'Cost',
    'Stock Quantity',
    'Min Stock Level',
    'Active'
  ];

  // Convert products to CSV rows
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

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
};

export const downloadCSV = (csvContent, filename = 'products.csv') => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const parseCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('CSV file must contain at least a header row and one data row'));
          return;
        }

        // Parse header
        const headers = parseCSVLine(lines[0]);
        
        // Validate required headers
        const requiredHeaders = ['Name', 'Price'];
        const missingHeaders = requiredHeaders.filter(header => 
          !headers.some(h => h.toLowerCase() === header.toLowerCase())
        );
        
        if (missingHeaders.length > 0) {
          reject(new Error(`Missing required headers: ${missingHeaders.join(', ')}`));
          return;
        }

        // Parse data rows
        const products = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
          try {
            const values = parseCSVLine(lines[i]);
            const product = parseProductRow(headers, values, i + 1);
            if (product) {
              products.push(product);
            }
          } catch (error) {
            errors.push(`Row ${i + 1}: ${error.message}`);
          }
        }

        resolve({ products, errors });
      } catch (error) {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
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
};

const parseProductRow = (headers, values, rowNumber) => {
  const product = {
    id: uuidv4(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Map CSV columns to product properties
  const columnMapping = {
    'name': 'name',
    'description': 'description',
    'barcode': 'barcode',
    'category': 'category_name', // Will be resolved to category_id later
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
          if (intValue < 0) {
            throw new Error(`Invalid ${productField}: ${value}`);
          }
          product[productField] = intValue;
          break;

        case 'is_active':
          product[productField] = ['yes', 'true', '1', 'active'].includes(value.toLowerCase());
          break;

        case 'name':
          if (!value.trim()) {
            throw new Error('Product name is required');
          }
          product[productField] = value.trim();
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

  if (product.price === undefined || product.price < 0) {
    throw new Error('Valid price is required');
  }

  // Set defaults
  product.cost = product.cost || 0;
  product.stock_quantity = product.stock_quantity || 0;
  product.min_stock_level = product.min_stock_level || 10;
  product.is_active = product.is_active !== undefined ? product.is_active : true;

  return product;
};

export const generateSampleCSV = () => {
  const sampleData = [
    ['Name', 'Description', 'Barcode', 'Category', 'Price', 'Cost', 'Stock Quantity', 'Min Stock Level', 'Active'],
    ['Sample Product 1', 'Description for product 1', '1111111111111', 'Electronics', '29.99', '15.00', '50', '10', 'Yes'],
    ['Sample Product 2', 'Description for product 2', '2222222222222', 'Stationery', '5.99', '2.50', '100', '20', 'Yes'],
    ['Sample Product 3', 'Description for product 3', '3333333333333', 'General', '12.99', '6.00', '25', '5', 'No']
  ];

  return sampleData
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
};
