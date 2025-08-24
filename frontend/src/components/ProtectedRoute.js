import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated but email not verified, redirect to verify page
  const path = location.pathname || '';
  const isVerificationRoute = path.startsWith('/verify-email') || path.startsWith('/finish-signin');
  if (user && user.emailVerified === false && !isVerificationRoute) {
    return <Navigate to="/verify-email" replace />;
  }

  // Check role-based access (supports simplified roles: 'superadmin' and 'standard')
  if (requiredRole) {
    const hasRequiredRole = () => {
      if (!user) return false;
      // Superadmin has full access; standard has basic access only
      if (requiredRole === 'superadmin') {
        return user.role === 'superadmin';
      }
      // For any other role string, check exact match or superadmin override
      return user.role === requiredRole || user.role === 'superadmin';
    };

    if (!hasRequiredRole()) {
      return (
        <div className="container" style={{ textAlign: 'center', marginTop: '60px' }}>
          <div className="card">
            <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Access Denied</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              You don't have permission to access this page.
            </p>
            <p style={{ fontSize: '14px', color: '#9ca3af' }}>
              Required role: <strong>{requiredRole}</strong><br />
              Your role: <strong>{user?.role || 'Unknown'}</strong>
            </p>
            <div style={{ marginTop: '24px' }}>
              <button 
                onClick={() => window.history.back()} 
                className="btn btn-secondary"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // Render the protected component
  return children;
};

export default ProtectedRoute;
