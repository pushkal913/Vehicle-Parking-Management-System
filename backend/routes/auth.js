const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('isFaculty')
    .isBoolean()
    .withMessage('isFaculty must be a boolean value'),
  body('employeeId')
    .if(body('isFaculty').equals('true'))
    .notEmpty()
    .withMessage('Employee ID is required for faculty members'),
  body('studentId')
    .if(body('isFaculty').equals('false'))
    .notEmpty()
    .withMessage('Student ID is required for students'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name cannot exceed 100 characters')
];

const loginValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email or ID is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      isFaculty,
      employeeId,
      studentId,
      phone,
      department
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email },
        { employeeId: employeeId || null },
        { studentId: studentId || null }
      ]
    });

    if (existingUser) {
      let message = 'User already exists';
      if (existingUser.email === email) {
        message = 'Email already registered';
      } else if (existingUser.employeeId === employeeId) {
        message = 'Employee ID already registered';
      } else if (existingUser.studentId === studentId) {
        message = 'Student ID already registered';
      }
      
      return res.status(400).json({ message });
    }

    // Create new user
    const userData = {
      firstName,
      lastName,
      email,
      password,
      isFaculty: Boolean(isFaculty),
      phone,
      department
    };

    // Add appropriate ID based on user type
    if (Boolean(isFaculty)) {
      userData.employeeId = employeeId;
      userData.role = 'faculty';
    } else {
      userData.studentId = studentId;
      userData.role = 'student';
    }

    const user = new User(userData);
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    res.status(500).json({
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email, employeeId, or studentId
    const user = await User.findByEmailOrId(email).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(423).json({
        message: 'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      await user.incrementLoginAttempts();
      
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // Reset failed login attempts on successful login
    await user.resetLoginAttempts();

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('vehicleInfo')
      .select('-password');
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      user
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      message: 'Server error while fetching user data'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authMiddleware, (req, res) => {
  // In a stateless JWT setup, logout is handled client-side by removing the token
  // We can log the logout event for audit purposes
  res.json({
    message: 'Logout successful'
  });
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
  authMiddleware,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is different from current password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        message: 'New password must be different from current password'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: 'Server error while changing password'
    });
  }
});

// @route   POST /api/auth/verify-token
// @desc    Verify if token is valid
// @access  Private
router.post('/verify-token', authMiddleware, (req, res) => {
  // If middleware passes, token is valid
  res.json({
    valid: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      fullName: req.user.fullName
    }
  });
});

module.exports = router;
