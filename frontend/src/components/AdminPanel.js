import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

function AdminPanel({ onBack, onLogout, onViewReports }) {
  const [activeTab, setActiveTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: '',
    account_type: 'individual',
    prepaid_amount: '',
    notes: ''
  });

  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Candy',
    price: '',
    inventory: ''
  });

  const [editingAccount, setEditingAccount] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchAccounts();
    fetchProducts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      setAccounts(data);
    } catch (err) {
      setError('Failed to load accounts');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError('Failed to load products');
    }
  };

  // Account Management
  const handleAccountSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editingAccount 
        ? `/api/accounts/${editingAccount.id}`
        : '/api/accounts';
      
      const method = editingAccount ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...accountForm,
          prepaid_amount: parseFloat(accountForm.prepaid_amount) || 0
        })
      });

      if (!response.ok) throw new Error('Failed to save account');

      setSuccess(editingAccount ? 'Account updated successfully!' : 'Account created successfully!');
      setAccountForm({ name: '', account_type: 'individual', prepaid_amount: '', notes: '' });
      setEditingAccount(null);
      fetchAccounts();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setAccountForm({
      name: account.name,
      account_type: account.account_type,
      prepaid_amount: account.prepaid_amount.toString(),
      notes: account.notes || ''
    });
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete account');

      setSuccess('Account deleted successfully!');
      fetchAccounts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete account');
    }
  };

  // Product Management
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = editingProduct 
        ? `/api/products/${editingProduct.id}`
        : '/api/products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productForm,
          price: parseFloat(productForm.price) || 0,
          inventory: productForm.inventory ? parseInt(productForm.inventory) : null
        })
      });

      if (!response.ok) throw new Error('Failed to save product');

      setSuccess(editingProduct ? 'Product updated successfully!' : 'Product created successfully!');
      setProductForm({ name: '', category: 'Candy', price: '', inventory: '' });
      setEditingProduct(null);
      fetchProducts();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      inventory: product.inventory !== null ? product.inventory.toString() : ''
    });
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete product');

      setSuccess('Product deleted successfully!');
      fetchProducts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete product');
    }
  };

  const handleBackup = async () => {
    try {
      const response = await fetch('/api/backup', { method: 'POST' });
      if (!response.ok) throw new Error('Backup failed');
      
      const data = await response.json();
      setSuccess(`Backup created: ${data.backup_file}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to create backup');
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <button className="btn-back" onClick={onBack}>
          ← Back to POS
        </button>
        <h2>Admin Panel</h2>
        <div className="admin-actions">
          <button className="btn-reports" onClick={onViewReports}>
            📊 Reports
          </button>
          <button className="btn-backup" onClick={handleBackup}>
            💾 Backup
          </button>
          <button className="btn-logout" onClick={onLogout}>
            🚪 Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess(null)} className="alert-close">×</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveTab('accounts')}
        >
          👥 Accounts
        </button>
        <button
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🍬 Products
        </button>
      </div>

      {/* Accounts Tab */}
      {activeTab === 'accounts' && (
        <div className="admin-content">
          <div className="admin-form-section">
            <h3>{editingAccount ? 'Edit Account' : 'Create New Account'}</h3>
            <form onSubmit={handleAccountSubmit} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Account Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({...accountForm, name: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Type</label>
                  <select
                    className="form-select"
                    value={accountForm.account_type}
                    onChange={(e) => setAccountForm({...accountForm, account_type: e.target.value})}
                  >
                    <option value="individual">Individual</option>
                    <option value="family">Family</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Prepaid Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={accountForm.prepaid_amount}
                    onChange={(e) => setAccountForm({...accountForm, prepaid_amount: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={accountForm.notes}
                  onChange={(e) => setAccountForm({...accountForm, notes: e.target.value})}
                />
              </div>

              <div className="form-actions">
                {editingAccount && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEditingAccount(null);
                      setAccountForm({ name: '', account_type: 'individual', prepaid_amount: '', notes: '' });
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>

          <div className="admin-list-section">
            <h3>All Accounts ({accounts.length})</h3>
            <div className="admin-list">
              {accounts.map(account => (
                <div key={account.id} className="admin-list-item">
                  <div className="item-info">
                    <strong>{account.name}</strong>
                    <span className={`badge ${account.account_type}`}>
                      {account.account_type}
                    </span>
                    <span className="item-detail">
                      Balance: ${account.balance.toFixed(2)}
                    </span>
                    <span className="item-detail">
                      Prepaid: ${account.prepaid_amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="item-actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEditAccount(account)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="admin-content">
          <div className="admin-form-section">
            <h3>{editingProduct ? 'Edit Product' : 'Create New Product'}</h3>
            <form onSubmit={handleProductSubmit} className="admin-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={productForm.category}
                    onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                  >
                    <option value="Candy">Candy</option>
                    <option value="Soda">Soda</option>
                    <option value="Drinks">Drinks</option>
                    <option value="Food">Food</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Inventory (optional)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={productForm.inventory}
                    onChange={(e) => setProductForm({...productForm, inventory: e.target.value})}
                    placeholder="Leave empty for no tracking"
                  />
                </div>
              </div>

              <div className="form-actions">
                {editingProduct && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductForm({ name: '', category: 'Candy', price: '', inventory: '' });
                    }}
                  >
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>

          <div className="admin-list-section">
            <h3>All Products ({products.length})</h3>
            <div className="admin-list">
              {products.map(product => (
                <div key={product.id} className="admin-list-item">
                  <div className="item-info">
                    <strong>{product.name}</strong>
                    <span className="badge category">{product.category}</span>
                    <span className="item-detail">
                      Price: ${product.price.toFixed(2)}
                    </span>
                    {product.inventory !== null && (
                      <span className="item-detail">
                        Stock: {product.inventory}
                      </span>
                    )}
                  </div>
                  <div className="item-actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEditProduct(product)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;