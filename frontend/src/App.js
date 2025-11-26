import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import './App.css';

// Import components
import POSScreen from './components/POSScreen';
import AccountList from './components/AccountList';
import AccountDetail from './components/AccountDetail';
import AdminLogin from './components/AdminLogin';
import AdminPanel from './components/AdminPanel';
import Reports from './components/Reports';

// API configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));

  // Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io(API_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Listen for real-time updates
    newSocket.on('transaction_created', (data) => {
      console.log('New transaction:', data);
      // Trigger UI updates as needed
    });

    newSocket.on('account_updated', (data) => {
      console.log('Account updated:', data);
    });

    newSocket.on('product_updated', (data) => {
      console.log('Product updated:', data);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  // Check if admin token is valid on mount
  useEffect(() => {
    if (adminToken) {
      setIsAdminAuthenticated(true);
    }
  }, [adminToken]);

  const handleAdminLogin = (token) => {
    localStorage.setItem('adminToken', token);
    setAdminToken(token);
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setIsAdminAuthenticated(false);
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* POS Interface - Main Screen */}
          <Route path="/" element={<POSScreen socket={socket} />} />
          
          {/* Account Management */}
          <Route path="/accounts" element={<AccountList />} />
          <Route path="/accounts/:id" element={<AccountDetail socket={socket} />} />
          
          {/* Admin Routes */}
          <Route 
            path="/admin/login" 
            element={
              isAdminAuthenticated ? 
                <Navigate to="/admin" /> : 
                <AdminLogin onLogin={handleAdminLogin} />
            } 
          />
          <Route 
            path="/admin" 
            element={
              isAdminAuthenticated ? 
                <AdminPanel token={adminToken} onLogout={handleAdminLogout} /> : 
                <Navigate to="/admin/login" />
            } 
          />
          <Route 
            path="/reports" 
            element={
              isAdminAuthenticated ? 
                <Reports token={adminToken} /> : 
                <Navigate to="/admin/login" />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
