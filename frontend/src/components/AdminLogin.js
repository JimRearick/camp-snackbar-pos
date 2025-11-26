import React, { useState } from 'react';
import './AdminLogin.css';

function AdminLogin({ onLoginSuccess, onBack }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid password');
      }

      onLoginSuccess();
    } catch (err) {
      setError(err.message);
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleNumPadClick = (value) => {
    if (value === 'clear') {
      setPassword('');
    } else if (value === 'backspace') {
      setPassword(password.slice(0, -1));
    } else {
      setPassword(password + value);
    }
  };

  return (
    <div className="admin-login">
      <div className="login-container">
        <div className="login-header">
          <button className="btn-back" onClick={onBack}>
            ← Back to POS
          </button>
          <h2>Admin Login</h2>
        </div>

        <div className="login-card">
          <div className="login-icon">
            🔐
          </div>

          <h3>Enter Admin Password</h3>
          <p className="login-subtitle">
            Access account management and reports
          </p>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="password-display">
              <input
                type="password"
                className="password-input"
                value={password}
                readOnly
                placeholder="Enter password..."
              />
            </div>

            {/* Virtual Numpad */}
            <div className="numpad">
              <button
                type="button"
                className="numpad-btn"
                onClick={() => handleNumPadClick('1')}
              >
                1
              </button>
              <button
                type="button"
                className="numpad-btn"
                onClick={() => handleNumPadClick('2')}
              >
                2
              </button>
              <button
                type="button"
                className="numpad-btn"
                onClick={() => handleNumPadClick('3')}
              >
                3
              </button>
              <button
                type="button"
                className="numpad-btn"
                onClick={() => handleNumPadClick('4')}
              >
                4
              </button>
              <button
                type="button"
                className="numpad-btn"
                onClick={() => handleNumPadClick('5')}
              >
                5
              </button>
              <button
                type="button"
                className="numpad-btn"
                onClick={() => handleNumPadClick('6')}
              >
                6
              </button>
              <button
                type="button"
                className="numpad-btn"
                onClick={() => handleNumPadClick('7')}
              >
                7
              </button>
              <button
                type="button"
                className="numpad-btn"
                onClick={() => handleNumPadClick('8')}
              >
                8
              </button>
              <button
                type="button"
                className="numpad-btn"
                onClick={() => handleNumPadClick('9')}
              >
                9
              </button>
              <button
                type="button"
                className="numpad-btn numpad-clear"
                onClick={() => handleNumPadClick('clear')}
              >
                Clear
              </button>
              <button
                type="button"
                className="numpad-btn"
                onClick={() => handleNumPadClick('0')}
              >
                0
              </button>
              <button
                type="button"
                className="numpad-btn numpad-backspace"
                onClick={() => handleNumPadClick('backspace')}
              >
                ⌫
              </button>
            </div>

            <button
              type="submit"
              className="btn-login"
              disabled={!password || loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="login-footer">
            <p className="text-muted">
              Default password: <code>camp2024</code>
            </p>
            <p className="text-muted small">
              Change this in Admin Panel → Settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;