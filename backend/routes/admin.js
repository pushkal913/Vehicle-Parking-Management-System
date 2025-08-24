const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Booking = require('../models/Booking');
const ParkingSlot = require('../models/ParkingSlot');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// Apply admin authorization to all routes
router.use(authorize('admin'));

// @route   GET /api/admin/dashboard
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    // Get parking slot statistics
    const slotStats = await ParkingSlot.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          available: { $sum: { $cond: ['$isAvailable', 1, 0] } },
          occupied: { $sum: { $cond: ['$isAvailable', 0, 1] } },
          maintenance: { $sum: { $cond: [{ $ne: ['$maintenanceStatus', 'operational'] }, 1, 0] } }
        }
      }
    ]);

    // Get booking statistics for today
    const todayBookings = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get booking statistics for this month
    const monthlyBookings = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get occupancy by location
    const locationOccupancy = await ParkingSlot.getAvailabilityByLocation();

    // Get recent activities (last 10 bookings)
    const recentBookings = await Booking.find()
      .populate('user', 'firstName lastName role')
      .populate('parkingSlot', 'slotNumber location')
      .sort({ createdAt: -1 })
      .limit(10);

    // Calculate totals
    const totalUsers = userStats.reduce((sum, stat) => sum + stat.count, 0);
    const totalSlots = slotStats[0] || { total: 0, available: 0, occupied: 0, maintenance: 0 };
    const todayTotal = todayBookings.reduce((sum, stat) => sum + stat.count, 0);
    const todayRevenue = todayBookings.reduce((sum, stat) => sum + stat.revenue, 0);
    const monthlyTotal = monthlyBookings.reduce((sum, stat) => sum + stat.count, 0);
    const monthlyRevenue = monthlyBookings.reduce((sum, stat) => sum + stat.revenue, 0);

    res.json({
      users: {
        total: totalUsers,
        byRole: userStats,
        activeCount: userStats.reduce((sum, stat) => sum + stat.active, 0)
      },
      parkingSlots: totalSlots,
      bookings: {
        today: {
          total: todayTotal,
          revenue: todayRevenue,
          byStatus: todayBookings
        },
        monthly: {
          total: monthlyTotal,
          revenue: monthlyRevenue,
          byStatus: monthlyBookings
        }
      },
      occupancy: {
        overall: totalSlots.total > 0 ? Math.round((totalSlots.occupied / totalSlots.total) * 100) : 0,
        byLocation: locationOccupancy
      },
      recentActivity: recentBookings
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      message: 'Server error while fetching dashboard data'
    });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users with filtering and pagination
// @access  Private (Admin only)
router.get('/users', [
  query('role').optional().isIn(['student', 'faculty', 'admin']),
  query('isActive').optional().isBoolean(),
  query('search').optional().isLength({ min: 1, max: 100 }),
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
      role,
      isActive,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter
    const filter = {};

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: users.length,
        totalUsers: total
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: 'Server error while fetching users'
    });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get specific user details
// @access  Private (Admin only)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Get user's booking statistics
    const bookingStats = await Booking.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get recent bookings
    const recentBookings = await Booking.find({ user: user._id })
      .populate('parkingSlot', 'slotNumber location')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      user,
      bookingStats,
      recentBookings,
      totalBookings: bookingStats.reduce((sum, stat) => sum + stat.count, 0),
      totalSpent: bookingStats.reduce((sum, stat) => sum + stat.totalAmount, 0)
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      message: 'Server error while fetching user details'
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user information
// @access  Private (Admin only)
router.put('/users/:id', [
  body('role').optional().isIn(['student', 'faculty', 'admin']),
  body('isActive').optional().isBoolean(),
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('department').optional().trim().isLength({ max: 100 })
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

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (req.params.id === req.user._id.toString() && req.body.isActive === false) {
      return res.status(400).json({
        message: 'You cannot deactivate your own account'
      });
    }

    // Update allowed fields
    const allowedUpdates = ['role', 'isActive', 'firstName', 'lastName', 'department'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      message: 'User updated successfully',
      user: userResponse
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      message: 'Server error while updating user'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user account
// @access  Private (Admin only)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        message: 'You cannot delete your own account'
      });
    }

    // Check for active bookings
    const activeBookings = await Booking.countDocuments({
      user: req.params.id,
      status: 'active',
      endTime: { $gte: new Date() }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        message: 'Cannot delete user with active bookings. Cancel bookings first.'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      message: 'Server error while deleting user'
    });
  }
});

// @route   GET /api/admin/bookings
// @desc    Get all bookings with filtering
// @access  Private (Admin only)
router.get('/bookings', [
  query('status').optional().isIn(['active', 'completed', 'cancelled', 'expired', 'no-show']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('location').optional().isIn(['Building A', 'Building B', 'Building C', 'Main Campus', 'Sports Complex']),
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
      location,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter
    const filter = {};

    if (status) filter.status = status;
    if (location) filter.location = location;

    if (startDate || endDate) {
      filter.bookingDate = {};
      if (startDate) filter.bookingDate.$gte = new Date(startDate);
      if (endDate) filter.bookingDate.$lte = new Date(endDate);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings
    const bookings = await Booking.find(filter)
      .populate('user', 'firstName lastName email role employeeId studentId')
      .populate('parkingSlot', 'slotNumber location vehicleType')
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

// @route   PUT /api/admin/bookings/:id/cancel
// @desc    Cancel any booking (Admin override)
// @access  Private (Admin only)
router.put('/bookings/:id/cancel', [
  body('reason').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({
        message: 'Only active bookings can be cancelled'
      });
    }

    // Admin can cancel any booking regardless of time constraints
    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'Cancelled by admin';
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user._id;

    // Release the parking slot
    await ParkingSlot.findByIdAndUpdate(booking.parkingSlot, {
      isAvailable: true,
      currentBooking: null
    });

    await booking.save();

    res.json({
      message: 'Booking cancelled successfully',
      booking
    });

  } catch (error) {
    console.error('Admin cancel booking error:', error);
    res.status(500).json({
      message: 'Server error while cancelling booking'
    });
  }
});

// @route   GET /api/admin/reports/bookings
// @desc    Get booking reports and analytics
// @access  Private (Admin only)
router.get('/reports/bookings', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('groupBy').optional().isIn(['day', 'week', 'month'])
], async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      groupBy = 'day'
    } = req.query;

    // Date grouping format
    const dateFormats = {
      day: '%Y-%m-%d',
      week: '%Y-%U',
      month: '%Y-%m'
    };

    // Booking trends
    const bookingTrends = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormats[groupBy], date: '$createdAt' } },
            status: '$status'
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Location popularity
    const locationStats = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: '$location',
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
          avgDuration: { $avg: '$duration' }
        }
      },
      { $sort: { bookings: -1 } }
    ]);

    // Peak hours analysis
    const peakHours = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: { $hour: '$startTime' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // User role statistics
    const userRoleStats = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $group: {
          _id: '$userInfo.role',
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      period: {
        startDate,
        endDate,
        groupBy
      },
      bookingTrends,
      locationStats,
      peakHours,
      userRoleStats
    });

  } catch (error) {
    console.error('Booking reports error:', error);
    res.status(500).json({
      message: 'Server error while generating booking reports'
    });
  }
});

// @route   GET /api/admin/reports/revenue
// @desc    Get revenue reports
// @access  Private (Admin only)
router.get('/reports/revenue', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date()
    } = req.query;

    // Total revenue by status
    const revenueByStatus = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: '$status',
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Daily revenue trend
    const dailyRevenue = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalRevenue: { $sum: '$totalAmount' },
          bookingCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Revenue by location
    const revenueByLocation = await Booking.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: '$location',
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Calculate total revenue
    const totalRevenue = revenueByStatus.reduce((sum, item) => sum + item.totalRevenue, 0);
    const totalBookings = revenueByStatus.reduce((sum, item) => sum + item.count, 0);

    res.json({
      period: {
        startDate,
        endDate
      },
      summary: {
        totalRevenue,
        totalBookings,
        averagePerBooking: totalBookings > 0 ? totalRevenue / totalBookings : 0
      },
      revenueByStatus,
      dailyRevenue,
      revenueByLocation
    });

  } catch (error) {
    console.error('Revenue reports error:', error);
    res.status(500).json({
      message: 'Server error while generating revenue reports'
    });
  }
});

module.exports = router;
