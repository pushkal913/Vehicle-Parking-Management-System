const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Access denied. No token provided or invalid format.' 
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Access denied. No token provided.' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Token is not valid. User not found.' 
      });
    }
    
    // Check if user account is active
    if (!user.isActive) {
      return res.status(401).json({ 
        message: 'Account is deactivated. Please contact administrator.' 
      });
    }
    
    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(401).json({ 
        message: 'Account is temporarily locked due to multiple failed login attempts.' 
      });
    }
    
    // Add user to request object
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Token is not valid.' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token has expired.' 
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during authentication.' 
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Access denied. Authentication required.' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role}` 
      });
    }
    
    next();
  };
};

// Admin only middleware
const adminOnly = authorize('admin');

// Faculty and Admin middleware
const facultyOrAdmin = authorize('faculty', 'admin');

// All authenticated users (default)
const authenticatedUsers = authorize('student', 'faculty', 'admin');

// Self or Admin middleware (for accessing own data or admin accessing any data)
const selfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Access denied. Authentication required.' 
    });
  }
  
  const userId = req.params.userId || req.params.id;
  
  // Allow if user is admin or accessing their own data
  if (req.user.role === 'admin' || req.user._id.toString() === userId) {
    return next();
  }
  
  return res.status(403).json({ 
    message: 'Access denied. You can only access your own data.' 
  });
};

// Rate limiting for sensitive operations
const sensitiveOperationLimiter = (req, res, next) => {
  // This could be enhanced with Redis for production
  // For now, we'll just add a simple delay for sensitive operations
  const sensitiveOps = ['POST', 'PUT', 'DELETE'];
  
  if (sensitiveOps.includes(req.method)) {
    // Add a small delay to prevent rapid-fire requests
    setTimeout(() => next(), 100);
  } else {
    next();
  }
};

// Validate user ownership of resource
const validateResourceOwnership = (resourceModel, userField = 'user') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const resource = await resourceModel.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({ 
          message: 'Resource not found.' 
        });
      }
      
      // Allow admin to access any resource
      if (req.user.role === 'admin') {
        req.resource = resource;
        return next();
      }
      
      // Check if user owns the resource
      const resourceUserId = resource[userField]?.toString() || resource[userField];
      
      if (resourceUserId !== req.user._id.toString()) {
        return res.status(403).json({ 
          message: 'Access denied. You can only access your own resources.' 
        });
      }
      
      req.resource = resource;
      next();
      
    } catch (error) {
      console.error('Resource ownership validation error:', error);
      res.status(500).json({ 
        message: 'Server error during resource validation.' 
      });
    }
  };
};

// Extract user info for logging
const extractUserInfo = (req, res, next) => {
  if (req.user) {
    req.userInfo = {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      fullName: req.user.fullName
    };
  }
  next();
};

module.exports = {
  authMiddleware,
  authorize,
  adminOnly,
  facultyOrAdmin,
  authenticatedUsers,
  selfOrAdmin,
  sensitiveOperationLimiter,
  validateResourceOwnership,
  extractUserInfo
};
