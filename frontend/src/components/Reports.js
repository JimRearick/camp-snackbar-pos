import React, { useState, useEffect } from 'react';
import './Reports.css';

function Reports({ onBack }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    fetchReports();
  }, [dateRange, customStartDate, customEndDate]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = '/api/reports/summary';
      const params = new URLSearchParams();

      if (dateRange === 'custom' && customStartDate && customEndDate) {
        params.append('start_date', customStartDate);
        params.append('end_date', customEndDate);
      } else if (dateRange !== 'all') {
        const now = new Date();
        let startDate;

        switch (dateRange) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = null;
        }

        if (startDate) {
          params.append('start_date', startDate.toISOString().split('T')[0]);
        }
      }

      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch reports');

      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/reports/export');
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `camp-snackbar-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="reports">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="reports">
      <div className="reports-header">
        <button className="btn-back" onClick={onBack}>
          ← Back to Admin
        </button>
        <h2>Reports & Analytics</h2>
        <button className="btn-export" onClick={handleExportCSV}>
          📥 Export CSV
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="date-filter-card">
        <h3>Date Range</h3>
        <div className="date-filter-buttons">
          <button
            className={`filter-btn ${dateRange === 'all' ? 'active' : ''}`}
            onClick={() => setDateRange('all')}
          >
            All Time
          </button>
          <button
            className={`filter-btn ${dateRange === 'today' ? 'active' : ''}`}
            onClick={() => setDateRange('today')}
          >
            Today
          </button>
          <button
            className={`filter-btn ${dateRange === 'week' ? 'active' : ''}`}
            onClick={() => setDateRange('week')}
          >
            Last 7 Days
          </button>
          <button
            className={`filter-btn ${dateRange === 'month' ? 'active' : ''}`}
            onClick={() => setDateRange('month')}
          >
            Last 30 Days
          </button>
          <button
            className={`filter-btn ${dateRange === 'custom' ? 'active' : ''}`}
            onClick={() => setDateRange('custom')}
          >
            Custom
          </button>
        </div>

        {dateRange === 'custom' && (
          <div className="custom-date-inputs">
            <div className="date-input-group">
              <label>Start Date:</label>
              <input
                type="date"
                className="form-input"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div className="date-input-group">
              <label>End Date:</label>
              <input
                type="date"
                className="form-input"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card primary">
              <div className="card-icon">💰</div>
              <div className="card-content">
                <h4>Total Revenue</h4>
                <div className="card-value">${reportData.total_revenue?.toFixed(2) || '0.00'}</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">🛒</div>
              <div className="card-content">
                <h4>Total Transactions</h4>
                <div className="card-value">{reportData.total_transactions || 0}</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">📦</div>
              <div className="card-content">
                <h4>Items Sold</h4>
                <div className="card-value">{reportData.total_items_sold || 0}</div>
              </div>
            </div>

            <div className="summary-card">
              <div className="card-icon">📊</div>
              <div className="card-content">
                <h4>Avg Transaction</h4>
                <div className="card-value">
                  ${reportData.average_transaction?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* Top Products */}
          <div className="report-section">
            <h3>Top Selling Products</h3>
            <div className="products-table">
              {reportData.top_products && reportData.top_products.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Quantity Sold</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.top_products.map((product, index) => (
                      <tr key={product.product_id}>
                        <td className="rank-cell">#{index + 1}</td>
                        <td className="product-name-cell">{product.product_name}</td>
                        <td>
                          <span className="category-badge">{product.category}</span>
                        </td>
                        <td className="quantity-cell">{product.quantity_sold}</td>
                        <td className="revenue-cell">${product.revenue?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data">No product data available</div>
              )}
            </div>
          </div>

          {/* Account Balances */}
          <div className="report-section">
            <h3>Account Balances Summary</h3>
            <div className="balance-grid">
              <div className="balance-card positive">
                <h4>Positive Balances</h4>
                <div className="balance-value">
                  ${reportData.positive_balances?.toFixed(2) || '0.00'}
                </div>
                <div className="balance-count">
                  {reportData.accounts_with_positive_balance || 0} accounts
                </div>
              </div>

              <div className="balance-card negative">
                <h4>Negative Balances</h4>
                <div className="balance-value">
                  ${reportData.negative_balances?.toFixed(2) || '0.00'}
                </div>
                <div className="balance-count">
                  {reportData.accounts_with_negative_balance || 0} accounts
                </div>
              </div>

              <div className="balance-card total">
                <h4>Net Balance</h4>
                <div className="balance-value">
                  ${((reportData.positive_balances || 0) + (reportData.negative_balances || 0)).toFixed(2)}
                </div>
                <div className="balance-count">
                  {reportData.total_accounts || 0} total accounts
                </div>
              </div>
            </div>
          </div>

          {/* Revenue by Category */}
          <div className="report-section">
            <h3>Revenue by Category</h3>
            <div className="category-chart">
              {reportData.revenue_by_category && reportData.revenue_by_category.length > 0 ? (
                reportData.revenue_by_category.map(cat => {
                  const maxRevenue = Math.max(...reportData.revenue_by_category.map(c => c.revenue));
                  const percentage = (cat.revenue / maxRevenue) * 100;

                  return (
                    <div key={cat.category} className="category-bar">
                      <div className="category-info">
                        <span className="category-name">{cat.category}</span>
                        <span className="category-revenue">${cat.revenue?.toFixed(2)}</span>
                      </div>
                      <div className="bar-container">
                        <div
                          className="bar-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="category-count">{cat.items_sold} items</span>
                    </div>
                  );
                })
              ) : (
                <div className="no-data">No category data available</div>
              )}
            </div>
          </div>

          {/* Top Accounts by Spending */}
          <div className="report-section">
            <h3>Top Accounts by Spending</h3>
            <div className="accounts-table">
              {reportData.top_accounts && reportData.top_accounts.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Account Name</th>
                      <th>Type</th>
                      <th>Total Charged</th>
                      <th>Current Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.top_accounts.map((account, index) => (
                      <tr key={account.account_id}>
                        <td className="rank-cell">#{index + 1}</td>
                        <td className="account-name-cell">{account.account_name}</td>
                        <td>
                          <span className={`type-badge ${account.account_type}`}>
                            {account.account_type}
                          </span>
                        </td>
                        <td className="charged-cell">${account.total_charged?.toFixed(2)}</td>
                        <td className={`balance-cell ${account.balance < 0 ? 'negative' : 'positive'}`}>
                          ${account.balance?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="no-data">No account data available</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Reports;