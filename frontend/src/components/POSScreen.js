import React, { useState, useEffect } from 'react';
import './POSScreen.css';

function POSScreen({ selectedAccount, onSelectAccount, cart, setCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem.quantity > 1) {
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, quantity: item.quantity - 1 }
          : item
      ));
    } else {
      setCart(cart.filter(item => item.id !== productId));
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (!selectedAccount) {
      setError('Please select an account first');
      return;
    }

    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: selectedAccount.id,
          items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
            price: item.price
          }))
        })
      });

      if (!response.ok) throw new Error('Transaction failed');

      setSuccess('Transaction completed successfully!');
      clearCart();

      // Update selected account balance
      const accountResponse = await fetch(`/api/accounts/${selectedAccount.id}`);
      const updatedAccount = await accountResponse.json();
      
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (err) {
      setError('Failed to complete transaction');
    }
  };

  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="pos-screen">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-screen">
      <div className="pos-layout">
        {/* Left Panel - Products */}
        <div className="pos-products">
          <div className="pos-header">
            <h2>Select Items</h2>
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

          <div className="product-categories">
            {Object.entries(groupedProducts).map(([category, items]) => (
              <div key={category} className="category-section">
                <h3 className="category-title">{category}</h3>
                <div className="product-grid">
                  {items.map(product => (
                    <button
                      key={product.id}
                      className="product-card"
                      onClick={() => addToCart(product)}
                      disabled={!selectedAccount}
                    >
                      <div className="product-name">{product.name}</div>
                      <div className="product-price">${product.price.toFixed(2)}</div>
                      {product.inventory !== null && (
                        <div className="product-stock">
                          Stock: {product.inventory}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Cart */}
        <div className="pos-cart">
          <div className="pos-header">
            <h2>Current Order</h2>
          </div>

          {/* Account Selection */}
          <div className="cart-account">
            {selectedAccount ? (
              <div className="account-selected">
                <div className="account-info">
                  <strong>{selectedAccount.name}</strong>
                  <span className="account-balance">
                    Balance: ${selectedAccount.balance.toFixed(2)}
                  </span>
                </div>
                <button 
                  className="btn-change-account"
                  onClick={onSelectAccount}
                >
                  Change Account
                </button>
              </div>
            ) : (
              <button 
                className="btn-select-account"
                onClick={onSelectAccount}
              >
                📋 Select Account
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="cart-empty">
                <p>Cart is empty</p>
                <p className="text-muted">Add items to get started</p>
              </div>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">
                        ${item.price.toFixed(2)} × {item.quantity}
                      </div>
                    </div>
                    <div className="cart-item-controls">
                      <button
                        className="btn-quantity"
                        onClick={() => removeFromCart(item.id)}
                      >
                        −
                      </button>
                      <span className="quantity-display">{item.quantity}</span>
                      <button
                        className="btn-quantity"
                        onClick={() => addToCart(item)}
                      >
                        +
                      </button>
                    </div>
                    <div className="cart-item-total">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Cart Total */}
          <div className="cart-total">
            <div className="total-label">Total:</div>
            <div className="total-amount">${calculateTotal().toFixed(2)}</div>
          </div>

          {/* Cart Actions */}
          <div className="cart-actions">
            <button
              className="btn-clear"
              onClick={clearCart}
              disabled={cart.length === 0}
            >
              Clear Cart
            </button>
            <button
              className="btn-checkout"
              onClick={handleCheckout}
              disabled={!selectedAccount || cart.length === 0}
            >
              Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default POSScreen;