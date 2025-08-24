const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const ParkingSlot = require('../models/ParkingSlot');
const User = require('../models/User');
const { authorize, validateResourceOwnership } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const createBookingValidation = [
  body('parkingSlotId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid parking slot ID is required'),
  body('vehicleNumber')
    .notEmpty()
    .trim()
    .isLength({ min: 5, max: 15 })
    .withMessage('Vehicle number must be between 5 and 15 characters'),
  body('vehicleType')
    .isIn(['car', 'motorcycle', 'bicycle'])
    .withMessage('Invalid vehicle type'),
  body('startTime')
    .isISO8601()
    .withMessage('Valid start time is required'),
  body('endTime')
    .isISO8601()
    .withMessage('Valid end time is required'),
  body('location')
    .notEmpty()
    .isIn(['Building A', 'Building B', 'Building C', 'Main Campus', 'Sports Complex'])
    .withMessage('Valid location is required')
];

// @route   POST /api/bookings
// @desc    Create new booking
// @access  Private
router.post('/', createBookingValidation, async (req, res) => {
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
      parkingSlotId,
      vehicleNumber,
      vehicleType,
      startTime,
      endTime,
      location
    } = req.body;

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    // Validate time logic
    if (start >= end) {
      return res.status(400).json({
        message: 'End time must be after start time'
      });
    }

    if (start <= now) {
      return res.status(400).json({
        message: 'Start time must be in the future'
      });
    }

    // Check if booking is too far in advance (max 30 days)
    const maxAdvanceDays = 30;
    const maxAdvanceTime = new Date(now.getTime() + (maxAdvanceDays * 24 * 60 * 60 * 1000));
    if (start > maxAdvanceTime) {
      return res.status(400).json({
        message: `Bookings can only be made up to ${maxAdvanceDays} days in advance`
      });
    }

    // Check maximum booking duration (8 hours)
    const maxDurationHours = 8;
    const durationMs = end - start;
    const durationHours = durationMs / (1000 * 60 * 60);
    
    if (durationHours > maxDurationHours) {
      return res.status(400).json({
        message: `Maximum booking duration is ${maxDurationHours} hours`
      });
    }

    // Get parking slot
    const parkingSlot = await ParkingSlot.findById(parkingSlotId);
    
    if (!parkingSlot) {
      return res.status(404).json({
        message: 'Parking slot not found'
      });
    }

    // Check if slot is available and suitable
    if (!parkingSlot.isSuitableFor(vehicleType, req.user.role)) {
      return res.status(400).json({
        message: 'Parking slot is not suitable for your vehicle type or user role'
      });
    }

    if (!parkingSlot.isActive || parkingSlot.maintenanceStatus !== 'operational') {
      return res.status(400).json({
        message: 'Parking slot is currently not available'
      });
    }

    // Verify location matches
    if (parkingSlot.location !== location) {
      return res.status(400).json({
        message: 'Location mismatch with selected parking slot'
      });
    }

    // Check for overlapping bookings
    const overlappingBookings = await Booking.findOverlappingBookings(
      parkingSlotId, 
      start, 
      end
    );

    if (overlappingBookings.length > 0) {
      return res.status(409).json({
        message: 'Parking slot is already booked for the selected time period'
      });
    }

    // Check user's active bookings limit (max 3 active bookings)
    const userActiveBookings = await Booking.countDocuments({
      user: req.user._id,
      status: 'active',
      endTime: { $gte: now }
    });

    if (userActiveBookings >= 3) {
      return res.status(400).json({
        message: 'You can have maximum 3 active bookings at a time'
      });
    }

    // Verify user's vehicle
    const user = await User.findById(req.user._id);
    const userVehicle = user.vehicleInfo.find(
      vehicle => vehicle.vehicleNumber.toUpperCase() === vehicleNumber.toUpperCase() && 
                 vehicle.vehicleType === vehicleType &&
                 vehicle.isActive
    );

    if (!userVehicle) {
      return res.status(400).json({
        message: 'Vehicle not found in your registered vehicles. Please add the vehicle first.'
      });
    }

    // Calculate total amount
    const hourlyRate = parkingSlot.hourlyRate || 5.00;
    const totalAmount = Math.ceil(durationHours) * hourlyRate;

    // Create booking
    const booking = new Booking({
      user: req.user._id,
      parkingSlot: parkingSlotId,
      vehicle: {
        vehicleNumber: vehicleNumber.toUpperCase(),
        vehicleType
      },
      startTime: start,
      endTime: end,
      location,
      totalAmount,
      qrCode: `BOOKING_${Date.now()}_${req.user._id.toString().slice(-6)}`
    });

    await booking.save();

    // Update parking slot
    await parkingSlot.bookSlot(booking._id);

    // Populate booking data for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate('parkingSlot', 'slotNumber location vehicleType')
      .populate('user', 'firstName lastName email role');

    res.status(201).json({
      message: 'Booking created successfully',
      booking: populatedBooking
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      message: 'Server error while creating booking'
    });
  }
});

// @route   GET /api/bookings
// @desc    Get user's bookings
// @access  Private
router.get('/', [
  query('status').optional().isIn(['active', 'completed', 'cancelled', 'expired', 'no-show']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Invalid query parameters',
        errors: errors.array()
      });
    }

    const {
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter
    const filter = { user: req.user._id };

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.bookingDate = {};
      if (startDate) filter.bookingDate.$gte = new Date(startDate);
      if (endDate) filter.bookingDate.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings
    const bookings = await Booking.find(filter)
      .populate('parkingSlot', 'slotNumber location vehicleType features')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Booking.countDocuments(filter);

    res.json({
      bookings,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: bookings.length,
        totalBookings: total
      }
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      message: 'Server error while fetching bookings'
    });
  }
});

// @route   GET /api/bookings/active
// @desc    Get user's active bookings
// @access  Private
router.get('/active', async (req, res) => {
  try {
    const activeBookings = await Booking.findActiveBookings(req.user._id);

    res.json({
      activeBookings,
      count: activeBookings.length
    });

  } catch (error) {
    console.error('Get active bookings error:', error);
    res.status(500).json({
      message: 'Server error while fetching active bookings'
    });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get specific booking
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('parkingSlot', 'slotNumber location vehicleType features hourlyRate')
      .populate('user', 'firstName lastName email role employeeId studentId');

    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    // Check if user owns the booking or is admin
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. You can only view your own bookings.'
      });
    }

    res.json({ booking });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      message: 'Server error while fetching booking'
    });
  }
});

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.put('/:id/cancel', [
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters')
], async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    // Check if user owns the booking or is admin
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Access denied. You can only cancel your own bookings.'
      });
    }

    // Check if booking can be cancelled
    if (!booking.canBeCancelled()) {
      return res.status(400).json({
        message: 'Booking cannot be cancelled. Cancellation is only allowed more than 1 hour before start time.'
      });
    }

    // Cancel the booking
    await booking.cancelBooking(req.user._id, reason);

    res.json({
      message: 'Booking cancelled successfully',
      booking
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      message: error.message || 'Server error while cancelling booking'
    });
  }
});

// @route   PUT /api/bookings/:id/extend
// @desc    Extend booking
// @access  Private
router.put('/:id/extend', [
  body('additionalHours')
    .isInt({ min: 1, max: 4 })
    .withMessage('Additional hours must be between 1 and 4')
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

    const { additionalHours } = req.body;

    const booking = await Booking.findById(req.params.id)
      .populate('parkingSlot', 'hourlyRate');

    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    // Check if user owns the booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied. You can only extend your own bookings.'
      });
    }

    // Check if booking can be extended
    if (!booking.canBeExtended()) {
      return res.status(400).json({
        message: 'Booking cannot be extended. Extensions are only allowed during active booking time.'
      });
    }

    // Extend the booking
    const hourlyRate = booking.parkingSlot.hourlyRate || 5.00;
    await booking.extendBooking(additionalHours, hourlyRate);

    res.json({
      message: 'Booking extended successfully',
      booking,
      additionalAmount: additionalHours * hourlyRate
    });

  } catch (error) {
    console.error('Extend booking error:', error);
    res.status(500).json({
      message: error.message || 'Server error while extending booking'
    });
  }
});

// @route   PUT /api/bookings/:id/checkin
// @desc    Check in to parking slot
// @access  Private
router.put('/:id/checkin', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    // Check if user owns the booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied. You can only check in to your own bookings.'
      });
    }

    // Check if booking is active and within time window
    const now = new Date();
    const timeUntilStart = booking.startTime - now;
    const minutesUntilStart = timeUntilStart / (1000 * 60);

    if (booking.status !== 'active') {
      return res.status(400).json({
        message: 'Booking is not active'
      });
    }

    // Allow check-in 15 minutes before start time
    if (minutesUntilStart > 15) {
      return res.status(400).json({
        message: 'Check-in is only allowed 15 minutes before booking start time'
      });
    }

    if (now > booking.endTime) {
      return res.status(400).json({
        message: 'Booking time has expired'
      });
    }

    if (booking.checkInTime) {
      return res.status(400).json({
        message: 'Already checked in'
      });
    }

    // Check in
    booking.checkInTime = now;
    await booking.save();

    res.json({
      message: 'Checked in successfully',
      checkInTime: booking.checkInTime
    });

  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({
      message: 'Server error during check-in'
    });
  }
});

// @route   PUT /api/bookings/:id/checkout
// @desc    Check out from parking slot
// @access  Private
router.put('/:id/checkout', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    // Check if user owns the booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Access denied. You can only check out from your own bookings.'
      });
    }

    if (!booking.checkInTime) {
      return res.status(400).json({
        message: 'Must check in before checking out'
      });
    }

    if (booking.checkOutTime) {
      return res.status(400).json({
        message: 'Already checked out'
      });
    }

    // Complete the booking
    await booking.completeBooking();

    res.json({
      message: 'Checked out successfully',
      checkOutTime: booking.checkOutTime,
      actualDuration: booking.actualDuration
    });

  } catch (error) {
    console.error('Check out error:', error);
    res.status(500).json({
      message: 'Server error during check-out'
    });
  }
});

// @route   GET /api/bookings/history/stats
// @desc    Get user's booking history statistics
// @access  Private
router.get('/history/stats', async (req, res) => {
  try {
    const userId = req.user._id;

    // Get booking statistics
    const stats = await Booking.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalDuration: { $sum: '$duration' }
        }
      }
    ]);

    // Get recent bookings
    const recentBookings = await Booking.find({ user: userId })
      .populate('parkingSlot', 'slotNumber location')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get most used locations
    const locationStats = await Booking.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      bookingStats: stats,
      recentBookings,
      favoriteLocations: locationStats,
      totalBookings: stats.reduce((sum, stat) => sum + stat.count, 0),
      totalSpent: stats.reduce((sum, stat) => sum + stat.totalAmount, 0)
    });

  } catch (error) {
    console.error('Get booking stats error:', error);
    res.status(500).json({
      message: 'Server error while fetching booking statistics'
    });
  }
});

module.exports = router;
