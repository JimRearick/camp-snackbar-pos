import React, { useState, useEffect } from 'react';
import './AccountList.css';

function AccountList({ onSelectAccount, onViewAccount, onBack }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // name, balance

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      setAccounts(data);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts
    .filter(account =>
      account.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'balance') {
        return b.balance - a.balance;
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="account-list">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="account-list">
      <div className="account-list-header">
        <button className="btn-back" onClick={onBack}>
          ← Back to POS
        </button>
        <h2>Select Account</h2>
      </div>

      <div className="account-list-controls">
        <div className="search-box">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className="sort-controls">
          <label className="sort-label">Sort by:</label>
          <div className="sort-buttons">
            <button
              className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
              onClick={() => setSortBy('name')}
            >
              Name
            </button>
            <button
              className={`sort-btn ${sortBy === 'balance' ? 'active' : ''}`}
              onClick={() => setSortBy('balance')}
            >
              Balance
            </button>
          </div>
        </div>
      </div>

      <div className="account-list-grid">
        {filteredAccounts.length === 0 ? (
          <div className="no-accounts">
            <p>No accounts found</p>
            <p className="text-muted">
              {searchTerm ? 'Try a different search term' : 'Create an account in the Admin Panel'}
            </p>
          </div>
        ) : (
          filteredAccounts.map(account => (
            <div key={account.id} className="account-card">
              <div className="account-card-header">
                <h3 className="account-name">{account.name}</h3>
                <span className={`account-type ${account.account_type}`}>
                  {account.account_type === 'family' ? '👨‍👩‍👧‍👦' : '👤'} {account.account_type}
                </span>
              </div>

              <div className="account-card-body">
                <div className="account-stat">
                  <span className="stat-label">Balance:</span>
                  <span className={`stat-value ${account.balance < 0 ? 'negative' : 'positive'}`}>
                    ${account.balance.toFixed(2)}
                  </span>
                </div>

                <div className="account-stat">
                  <span className="stat-label">Prepaid:</span>
                  <span className="stat-value">${account.prepaid_amount.toFixed(2)}</span>
                </div>

                <div className="account-stat">
                  <span className="stat-label">Total Charged:</span>
                  <span className="stat-value">${account.total_charged.toFixed(2)}</span>
                </div>
              </div>

              <div className="account-card-actions">
                <button
                  className="btn-select"
                  onClick={() => onSelectAccount(account)}
                >
                  Select for POS
                </button>
                <button
                  className="btn-view"
                  onClick={() => onViewAccount(account)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AccountList;