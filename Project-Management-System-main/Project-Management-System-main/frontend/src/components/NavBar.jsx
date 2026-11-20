import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <nav style={{ 
      display: 'flex', 
      justify: 'space-between', 
      alignItems: 'center', 
      padding: '16px 32px', 
      backgroundColor: '#1e293b', 
      color: '#ffffff',
      fontFamily: 'sans-serif'
    }}>
      <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
        Project Management System
      </h2>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#cbd5e1' }}>
            {user.email} <strong style={{ color: '#60a5fa' }}>({user.role})</strong>
          </span>
          <button
            onClick={handleLogout}
            style={{ 
              backgroundColor: '#ef4444', 
              color: '#ffffff', 
              border: 'none', 
              padding: '6px 14px', 
              borderRadius: '4px', 
              cursor: 'pointer', 
              fontWeight: '600',
              fontSize: '13px'
            }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;