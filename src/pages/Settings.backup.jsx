import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Printer, FileText, Shield, Settings as SettingsIcon, Building, DollarSign, Users } from 'lucide-react';
import api from '../utils/api';
import useAuthStore from '../store/authStore';

export default function Settings() {
  const { user } = useAuthStore();
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [activeTab, setActiveTab] = useState('business');
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'cashier',
  });

  useEffect(() => {
    loadSettings();
    if (user?.role === 'admin') {
      loadUsers();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load settings:', error);
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await api.updateSetting(key, value);
      }
      alert('Settings saved successfully');
    } catch (error) {
      alert('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.register(newUser);
      setNewUser({ username: '', password: '', full_name: '', role: 'cashier' });
      setShowUserForm(false);
      loadUsers();
      alert('User created successfully');
    } catch (error) {
      alert('Failed to create user: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.deleteUser(userId);
      loadUsers();
      alert('User deleted successfully');
    } catch (error) {
      alert('Failed to delete user: ' + error.message);
    }
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

  const tabs = [
    { id: 'business', name: 'Business', icon: Building },
    { id: 'financial', name: 'Financial', icon: DollarSign },
    { id: 'printing', name: 'Printing', icon: FileText },
    { id: 'fiscal', name: 'Fiscal', icon: Shield },
    { id: 'printer', name: 'Receipt Printer', icon: Printer },
    ...(user?.role === 'admin' ? [{ id: 'users', name: 'Users', icon: Users }] : []),
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your POS system</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl">
        {/* Business Information Tab */}
        {activeTab === 'business' && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Building className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Business Information</h2>
            </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
              <input
                type="text"
                value={settings.business_name || ''}
                onChange={(e) => handleSettingChange('business_name', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <input
                type="text"
                value={settings.business_address || ''}
                onChange={(e) => handleSettingChange('business_address', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="text"
                value={settings.business_phone || ''}
                onChange={(e) => handleSettingChange('business_phone', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={settings.business_email || ''}
                onChange={(e) => handleSettingChange('business_email', e.target.value)}
                className="input"
              />
            </div>
          </div>
          </div>
        )}

        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            {/* Tax & Currency */}
            <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tax & Currency</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={(parseFloat(settings.tax_rate || 0) * 100).toFixed(2)}
                onChange={(e) => handleSettingChange('tax_rate', (parseFloat(e.target.value) / 100).toString())}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <input
                type="text"
                value={settings.currency || ''}
                onChange={(e) => handleSettingChange('currency', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency_symbol || ''}
                onChange={(e) => handleSettingChange('currency_symbol', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Receipt Settings */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Receipt Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Footer</label>
              <textarea
                value={settings.receipt_footer || ''}
                onChange={(e) => handleSettingChange('receipt_footer', e.target.value)}
                className="input"
                rows="3"
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.low_stock_alert === '1'}
                  onChange={(e) => handleSettingChange('low_stock_alert', e.target.checked ? '1' : '0')}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Low Stock Alerts</span>
              </label>
            </div>
          </div>
        </div>

        {/* Invoice Printing Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Invoice Printing</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Template</label>
              <select
                value={settings.invoice_template || 'standard'}
                onChange={(e) => handleSettingChange('invoice_template', e.target.value)}
                className="input"
              >
                <option value="standard">Standard</option>
                <option value="compact">Compact</option>
                <option value="detailed">Detailed</option>
                <option value="thermal">Thermal Receipt</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paper Size</label>
              <select
                value={settings.invoice_paper_size || 'A4'}
                onChange={(e) => handleSettingChange('invoice_paper_size', e.target.value)}
                className="input"
              >
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="80mm">80mm Thermal</option>
                <option value="58mm">58mm Thermal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Logo URL</label>
              <input
                type="url"
                value={settings.invoice_logo_url || ''}
                onChange={(e) => handleSettingChange('invoice_logo_url', e.target.value)}
                className="input"
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Copies</label>
              <input
                type="number"
                min="1"
                max="5"
                value={settings.invoice_copies || '2'}
                onChange={(e) => handleSettingChange('invoice_copies', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Numbering Prefix</label>
              <input
                type="text"
                value={settings.invoice_numbering_prefix || 'INV-'}
                onChange={(e) => handleSettingChange('invoice_numbering_prefix', e.target.value)}
                className="input"
                placeholder="INV-"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Starting Number</label>
              <input
                type="number"
                min="1"
                value={settings.invoice_numbering_start || '1000'}
                onChange={(e) => handleSettingChange('invoice_numbering_start', e.target.value)}
                className="input"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.invoice_auto_print === '1'}
                  onChange={(e) => handleSettingChange('invoice_auto_print', e.target.checked ? '1' : '0')}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Auto-print invoices</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.invoice_show_barcode === '1'}
                  onChange={(e) => handleSettingChange('invoice_show_barcode', e.target.checked ? '1' : '0')}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Show barcode on invoice</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.invoice_show_qr_code === '1'}
                  onChange={(e) => handleSettingChange('invoice_show_qr_code', e.target.checked ? '1' : '0')}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Show QR code on invoice</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Footer Text</label>
              <textarea
                value={settings.invoice_footer_text || ''}
                onChange={(e) => handleSettingChange('invoice_footer_text', e.target.value)}
                className="input"
                rows="2"
                placeholder="Terms: Payment due within 30 days"
              />
            </div>
          </div>
        </div>

        {/* Fiscal Integration Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Fiscal Integration</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={settings.fiscal_enabled === '1'}
                  onChange={(e) => handleSettingChange('fiscal_enabled', e.target.checked ? '1' : '0')}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Fiscal Integration</span>
              </label>
            </div>
            
            {settings.fiscal_enabled === '1' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax Authority Name</label>
                  <input
                    type="text"
                    value={settings.tax_authority_name || ''}
                    onChange={(e) => handleSettingChange('tax_authority_name', e.target.value)}
                    className="input"
                    placeholder="Tax Authority"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax Registration Number</label>
                  <input
                    type="text"
                    value={settings.tax_registration_number || ''}
                    onChange={(e) => handleSettingChange('tax_registration_number', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">VAT Number</label>
                  <input
                    type="text"
                    value={settings.vat_number || ''}
                    onChange={(e) => handleSettingChange('vat_number', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Certificate Path</label>
                  <input
                    type="text"
                    value={settings.fiscal_certificate_path || ''}
                    onChange={(e) => handleSettingChange('fiscal_certificate_path', e.target.value)}
                    className="input"
                    placeholder="C:/certificates/fiscal.p12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Certificate Password</label>
                  <input
                    type="password"
                    value={settings.fiscal_certificate_password || ''}
                    onChange={(e) => handleSettingChange('fiscal_certificate_password', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Endpoint</label>
                  <input
                    type="url"
                    value={settings.fiscal_api_endpoint || ''}
                    onChange={(e) => handleSettingChange('fiscal_api_endpoint', e.target.value)}
                    className="input"
                    placeholder="https://api.tax-authority.gov/fiscal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company ID</label>
                  <input
                    type="text"
                    value={settings.fiscal_company_id || ''}
                    onChange={(e) => handleSettingChange('fiscal_company_id', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Device ID</label>
                  <input
                    type="text"
                    value={settings.fiscal_device_id || ''}
                    onChange={(e) => handleSettingChange('fiscal_device_id', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Environment</label>
                  <select
                    value={settings.fiscal_environment || 'test'}
                    onChange={(e) => handleSettingChange('fiscal_environment', e.target.value)}
                    className="input"
                  >
                    <option value="test">Test</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Retry Attempts</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.fiscal_retry_attempts || '3'}
                    onChange={(e) => handleSettingChange('fiscal_retry_attempts', e.target.value)}
                    className="input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.fiscal_auto_submit === '1'}
                      onChange={(e) => handleSettingChange('fiscal_auto_submit', e.target.checked ? '1' : '0')}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Auto-submit to tax authority</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.fiscal_backup_enabled === '1'}
                      onChange={(e) => handleSettingChange('fiscal_backup_enabled', e.target.checked ? '1' : '0')}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Enable backup storage</span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Printer Settings */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Printer className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Receipt Printer</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  checked={settings.printer_enabled === '1'}
                  onChange={(e) => handleSettingChange('printer_enabled', e.target.checked ? '1' : '0')}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Enable Receipt Printer</span>
              </label>
            </div>
            
            {settings.printer_enabled === '1' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Printer Name</label>
                  <input
                    type="text"
                    value={settings.printer_name || ''}
                    onChange={(e) => handleSettingChange('printer_name', e.target.value)}
                    className="input"
                    placeholder="Receipt Printer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Paper Width (mm)</label>
                  <select
                    value={settings.printer_paper_width || '80'}
                    onChange={(e) => handleSettingChange('printer_paper_width', e.target.value)}
                    className="input"
                  >
                    <option value="58">58mm</option>
                    <option value="80">80mm</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Text Encoding</label>
                  <select
                    value={settings.printer_encoding || 'UTF-8'}
                    onChange={(e) => handleSettingChange('printer_encoding', e.target.value)}
                    className="input"
                  >
                    <option value="UTF-8">UTF-8</option>
                    <option value="ISO-8859-1">ISO-8859-1</option>
                    <option value="Windows-1252">Windows-1252</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.printer_cut_paper === '1'}
                      onChange={(e) => handleSettingChange('printer_cut_paper', e.target.checked ? '1' : '0')}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Auto-cut paper</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.printer_open_drawer === '1'}
                      onChange={(e) => handleSettingChange('printer_open_drawer', e.target.checked ? '1' : '0')}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Open cash drawer</span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* User Management (Admin Only) */}
        {user?.role === 'admin' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
              <button
                onClick={() => setShowUserForm(!showUserForm)}
                className="btn btn-primary btn-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </button>
            </div>

            {showUserForm && (
              <form onSubmit={handleCreateUser} className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
                <input
                  type="text"
                  placeholder="Username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  required
                  className="input"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  required
                  className="input"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="input"
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-success btn-sm">Create User</button>
                  <button
                    type="button"
                    onClick={() => setShowUserForm(false)}
                    className="btn btn-outline btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{u.full_name}</p>
                    <p className="text-sm text-gray-500">@{u.username} • {u.role}</p>
                  </div>
                  {u.id !== user.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="mt-6">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="btn btn-primary"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
