import React, { createContext, useContext, useState } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (email, password, role) => {
    const response = await API.post('/auth/login', { email, password, role });
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
  };

  const signup = async (name, email, password, rollNumber) => {
    const response = await API.post('/auth/register', { name, email, password, rollNumber });
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
  };

  const updateProfile = async (profile) => {
    const response = await API.put('/auth/profile', profile);
    const updatedUser = {
      ...response.data,
      id: response.data._id || user?.id
    };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    return updatedUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const deleteAccount = async () => {
    await API.delete('/auth/account');
    logout();
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, updateProfile, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);