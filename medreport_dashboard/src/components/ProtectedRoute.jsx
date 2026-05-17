import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute — wraps any route that requires authentication.
 * Redirects to /login if no user session is found.
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // While AuthContext is still hydrating from localStorage, show nothing
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
