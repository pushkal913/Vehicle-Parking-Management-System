const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { selfOrAdmin } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user's profile
// @access  Private
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Server error while fetching profile'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update current user's profile
// @access  Private
router.put('/profile', [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name cannot exceed 100 characters')
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

    const { firstName, lastName, phone, department } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (department !== undefined) user.department = department;

    await user.save();

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      message: 'Profile updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      message: 'Server error while updating profile'
    });
  }
});

// @route   GET /api/users/vehicles
// @desc    Get current user's vehicles
// @access  Private
router.get('/vehicles', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('vehicleInfo');
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      vehicles: user.vehicleInfo
    });

  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({
      message: 'Server error while fetching vehicles'
    });
  }
});

// @route   POST /api/users/vehicles
// @desc    Add new vehicle
// @access  Private
router.post('/vehicles', [
  body('vehicleNumber')
    .notEmpty()
    .trim()
    .isLength({ min: 5, max: 15 })
    .withMessage('Vehicle number must be between 5 and 15 characters'),
  body('vehicleType')
    .isIn(['car', 'motorcycle', 'bicycle'])
    .withMessage('Invalid vehicle type'),
  body('make')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Make cannot exceed 50 characters'),
  body('model')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Model cannot exceed 50 characters'),
  body('color')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Color cannot exceed 30 characters')
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

    const { vehicleNumber, vehicleType, make, model, color } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Check if vehicle number already exists for this user
    const existingVehicle = user.vehicleInfo.find(
      vehicle => vehicle.vehicleNumber.toUpperCase() === vehicleNumber.toUpperCase()
    );

    if (existingVehicle) {
      return res.status(400).json({
        message: 'Vehicle number already exists in your account'
      });
    }

    // Check if user has reached vehicle limit (max 3 vehicles)
    if (user.vehicleInfo.length >= 3) {
      return res.status(400).json({
        message: 'Maximum 3 vehicles allowed per user'
      });
    }

    // Add new vehicle
    const newVehicle = {
      vehicleNumber: vehicleNumber.toUpperCase(),
      vehicleType,
      make,
      model,
      color,
      isActive: true
    };

    user.vehicleInfo.push(newVehicle);
    await user.save();

    res.status(201).json({
      message: 'Vehicle added successfully',
      vehicle: newVehicle
    });

  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({
      message: 'Server error while adding vehicle'
    });
  }
});

// @route   PUT /api/users/vehicles/:vehicleId
// @desc    Update vehicle information
// @access  Private
router.put('/vehicles/:vehicleId', [
  body('make')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Make cannot exceed 50 characters'),
  body('model')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Model cannot exceed 50 characters'),
  body('color')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Color cannot exceed 30 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
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

    const { make, model, color, isActive } = req.body;
    const vehicleId = req.params.vehicleId;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Find the vehicle
    const vehicle = user.vehicleInfo.id(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        message: 'Vehicle not found'
      });
    }

    // Update vehicle information
    if (make !== undefined) vehicle.make = make;
    if (model !== undefined) vehicle.model = model;
    if (color !== undefined) vehicle.color = color;
    if (isActive !== undefined) vehicle.isActive = isActive;

    await user.save();

    res.json({
      message: 'Vehicle updated successfully',
      vehicle
    });

  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({
      message: 'Server error while updating vehicle'
    });
  }
});

// @route   DELETE /api/users/vehicles/:vehicleId
// @desc    Remove vehicle
// @access  Private
router.delete('/vehicles/:vehicleId', async (req, res) => {
  try {
    const vehicleId = req.params.vehicleId;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Find the vehicle
    const vehicle = user.vehicleInfo.id(vehicleId);

    if (!vehicle) {
      return res.status(404).json({
        message: 'Vehicle not found'
      });
    }

    // Check if vehicle has active bookings
    const Booking = require('../models/Booking');
    const activeBookings = await Booking.countDocuments({
      user: req.user._id,
      'vehicle.vehicleNumber': vehicle.vehicleNumber,
      status: 'active',
      endTime: { $gte: new Date() }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        message: 'Cannot remove vehicle with active bookings'
      });
    }

    // Remove vehicle
    vehicle.remove();
    await user.save();

    res.json({
      message: 'Vehicle removed successfully'
    });

  } catch (error) {
    console.error('Remove vehicle error:', error);
    res.status(500).json({
      message: 'Server error while removing vehicle'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (Self or Admin only)
// @access  Private
router.get('/:id', selfOrAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      message: 'Server error while fetching user'
    });
  }
});

// @route   GET /api/users/:id/bookings
// @desc    Get user's bookings (Self or Admin only)
// @access  Private
router.get('/:id/bookings', selfOrAdmin, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    
    const bookings = await Booking.find({ user: req.params.id })
      .populate('parkingSlot', 'slotNumber location vehicleType')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      bookings,
      count: bookings.length
    });

  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      message: 'Server error while fetching user bookings'
    });
  }
});

module.exports = router;
