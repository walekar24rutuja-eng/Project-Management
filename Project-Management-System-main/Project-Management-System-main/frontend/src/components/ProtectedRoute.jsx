import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles) {
    const userRole = user.role?.toUpperCase();
    const formattedAllowedRoles = allowedRoles.map(r => r.toUpperCase());

    if (!formattedAllowedRoles.includes(userRole)) {
      const dashboardPath = {
        MENTOR: '/mentor-dashboard',
        ADMIN: '/admin-dashboard',
        STUDENT: '/student-dashboard'
      }[userRole];
      return <Navigate to={dashboardPath || '/auth'} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;