import React, { useState, useEffect } from 'react';
import './AccountDetail.css';

function AccountDetail({ account, onBack }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (account) {
      fetchTransactions();
    }
  }, [account]);

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/accounts/${account.id}/transactions`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!account) {
    return (
      <div className="account-detail">
        <div className="error-message">
          <p>No account selected</p>
          <button className="btn-back" onClick={onBack}>
            ← Back to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-detail">
      <div className="account-detail-header">
        <button className="btn-back" onClick={onBack}>
          ← Back to Accounts
        </button>
        <h2>Account Details</h2>
      </div>

      {/* Account Summary Card */}
      <div className="account-summary-card">
        <div className="summary-header">
          <div className="summary-title">
            <h3>{account.name}</h3>
            <span className={`account-type-badge ${account.account_type}`}>
              {account.account_type === 'family' ? '👨‍👩‍👧‍👦' : '👤'} {account.account_type}
            </span>
          </div>
        </div>

        <div className="summary-stats">
          <div className="stat-box primary">
            <span className="stat-label">Current Balance</span>
            <span className={`stat-value ${account.balance < 0 ? 'negative' : 'positive'}`}>
              ${account.balance.toFixed(2)}
            </span>
          </div>

          <div className="stat-box">
            <span className="stat-label">Prepaid Amount</span>
            <span className="stat-value">${account.prepaid_amount.toFixed(2)}</span>
          </div>

          <div className="stat-box">
            <span className="stat-label">Total Charged</span>
            <span className="stat-value">${account.total_charged.toFixed(2)}</span>
          </div>

          <div className="stat-box">
            <span className="stat-label">Account Status</span>
            <span className={`stat-badge ${account.is_active ? 'active' : 'inactive'}`}>
              {account.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {account.notes && (
          <div className="account-notes">
            <strong>Notes:</strong>
            <p>{account.notes}</p>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="transaction-history">
        <div className="transaction-header">
          <h3>Transaction History</h3>
          <span className="transaction-count">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </span>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="no-transactions">
            <p>No transactions yet</p>
            <p className="text-muted">Transactions will appear here once purchases are made</p>
          </div>
        ) : (
          <div className="transaction-list">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="transaction-item">
                <div className="transaction-main">
                  <div className="transaction-info">
                    <div className="transaction-date">
                      {formatDate(transaction.created_at)}
                    </div>
                    <div className="transaction-id">
                      Transaction #{transaction.id}
                    </div>
                  </div>
                  <div className="transaction-total">
                    ${transaction.total_amount.toFixed(2)}
                  </div>
                </div>

                <div className="transaction-items">
                  {transaction.items && transaction.items.length > 0 ? (
                    transaction.items.map((item, index) => (
                      <div key={index} className="item-row">
                        <span className="item-quantity">{item.quantity}×</span>
                        <span className="item-name">{item.product_name}</span>
                        <span className="item-price">
                          ${item.price.toFixed(2)} each
                        </span>
                        <span className="item-subtotal">
                          ${(item.quantity * item.price).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="item-row text-muted">
                      No item details available
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AccountDetail;