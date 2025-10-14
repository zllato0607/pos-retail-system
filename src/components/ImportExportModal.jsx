import { useState, useRef } from 'react';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../utils/api';
import { generateSampleCSV } from '../utils/csvUtils';

export default function ImportExportModal({ onClose, onImportComplete }) {
  const [activeTab, setActiveTab] = useState('export');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await api.exportProducts();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('Products exported successfully!');
    } catch (error) {
      alert('Failed to export products: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      alert('Please select a CSV file first');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const result = await api.importProducts(selectedFile);
      setImportResult(result);
      
      if (result.success && onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: error.message,
        errors: [error.message]
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = generateSampleCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'sample_products.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Import/Export Products</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('export')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'export'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Download className="w-4 h-4 inline mr-2" />
              Export
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Import
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'export' && (
            <div>
              <div className="text-center py-8">
                <Download className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Export Products</h3>
                <p className="text-gray-600 mb-6">
                  Download all your products as a CSV file. This includes product details, 
                  categories, pricing, and stock information.
                </p>
                
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="btn btn-primary"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export Products
                    </>
                  )}
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Export includes:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Product names and descriptions</li>
                  <li>• Barcodes and categories</li>
                  <li>• Pricing and cost information</li>
                  <li>• Stock quantities and minimum levels</li>
                  <li>• Active/inactive status</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Import Products</h3>
                <p className="text-gray-600 mb-4">
                  Upload a CSV file to add or update multiple products at once.
                </p>

                {/* Sample CSV Download */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-900 mb-1">First time importing?</h4>
                      <p className="text-sm text-yellow-800 mb-2">
                        Download our sample CSV template to see the required format.
                      </p>
                      <button
                        onClick={downloadSampleCSV}
                        className="btn btn-outline btn-sm"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Download Sample CSV
                      </button>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {selectedFile ? (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">Choose a CSV file to upload</p>
                    </div>
                  )}

                  <div className="space-x-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-outline"
                    >
                      Choose File
                    </button>
                    
                    {selectedFile && (
                      <button
                        onClick={handleImport}
                        disabled={importing}
                        className="btn btn-primary"
                      >
                        {importing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Importing...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Import Products
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Import Result */}
                {importResult && (
                  <div className={`mt-4 p-4 rounded-lg border ${
                    importResult.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start">
                      {importResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                      )}
                      
                      <div className="flex-1">
                        <h4 className={`font-medium mb-1 ${
                          importResult.success ? 'text-green-900' : 'text-red-900'
                        }`}>
                          {importResult.success ? 'Import Successful' : 'Import Failed'}
                        </h4>
                        
                        <p className={`text-sm mb-2 ${
                          importResult.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {importResult.message}
                        </p>

                        {importResult.errors && importResult.errors.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-red-900 mb-1">Errors:</p>
                            <ul className="text-sm text-red-800 space-y-1 max-h-32 overflow-y-auto">
                              {importResult.errors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* CSV Format Info */}
                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">CSV Format Requirements:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• <strong>Name</strong> (required): Product name</li>
                    <li>• <strong>Price</strong> (required): Selling price</li>
                    <li>• <strong>Description</strong>: Product description</li>
                    <li>• <strong>Barcode</strong>: Product barcode</li>
                    <li>• <strong>Category</strong>: Category name (must exist)</li>
                    <li>• <strong>Cost</strong>: Product cost</li>
                    <li>• <strong>Stock Quantity</strong>: Current stock</li>
                    <li>• <strong>Min Stock Level</strong>: Minimum stock alert level</li>
                    <li>• <strong>Active</strong>: Yes/No or True/False</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="btn btn-outline"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
