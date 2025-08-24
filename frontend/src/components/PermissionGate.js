import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RoleService, PERMISSIONS } from '../services/roleService';

// Component to protect routes based on permissions
export const ProtectedRoute = ({ children, permission, fallback = '/dashboard' }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (permission && !RoleService.hasPermission(user, permission)) {
    return <Navigate to={fallback} replace />;
  }
  
  return children;
};

// Component to protect routes based on multiple permissions (user needs ANY of them)
export const ProtectedRouteAny = ({ children, permissions = [], fallback = '/dashboard' }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (permissions.length > 0 && !RoleService.hasAnyPermission(user, permissions)) {
    return <Navigate to={fallback} replace />;
  }
  
  return children;
};

// Component to protect routes based on role
export const RoleProtectedRoute = ({ children, allowedRoles = [], fallback = '/dashboard' }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallback} replace />;
  }
  
  return children;
};

// Component to conditionally render content based on permissions
export const PermissionGate = ({ permission, permissions, children, fallback = null }) => {
  const { user } = useAuth();
  
  if (!user) return fallback;
  
  let hasAccess = false;
  
  if (permission) {
    hasAccess = RoleService.hasPermission(user, permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = RoleService.hasAnyPermission(user, permissions);
  }
  
  return hasAccess ? children : fallback;
};

// Hook for permission checking
export const usePermissions = () => {
  const { user } = useAuth();
  
  return {
    hasPermission: (permission) => RoleService.hasPermission(user, permission),
    hasAnyPermission: (permissions) => RoleService.hasAnyPermission(user, permissions),
    hasAllPermissions: (permissions) => RoleService.hasAllPermissions(user, permissions),
    canManageUser: (targetUser) => RoleService.canManageUser(user, targetUser),
    user
  };
};

export default {
  ProtectedRoute,
  ProtectedRouteAny,
  RoleProtectedRoute,
  PermissionGate,
  usePermissions
};
