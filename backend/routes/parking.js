const express = require('express');
const { body, query, validationResult } = require('express-validator');
const ParkingSlot = require('../models/ParkingSlot');
const Booking = require('../models/Booking');
const { authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/parking/slots
// @desc    Get all parking slots with filtering
// @access  Private
router.get('/slots', [
  query('location').optional().isIn(['Building A', 'Building B', 'Building C', 'Main Campus', 'Sports Complex']),
  query('vehicleType').optional().isIn(['car', 'motorcycle', 'bicycle', 'any']),
  query('available').optional().isBoolean(),
  query('reservedFor').optional().isIn(['general', 'faculty', 'student', 'disabled', 'visitor'])
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
      location,
      vehicleType,
      available,
      reservedFor,
      page = 1,
      limit = 50
    } = req.query;

    // Build filter object
    const filter = {
      isActive: true
    };

    if (location) filter.location = location;
    if (vehicleType) {
      if (vehicleType !== 'any') {
        filter.$or = [
          { vehicleType: vehicleType },
          { vehicleType: 'any' }
        ];
      }
    }
    if (available !== undefined) {
      filter.isAvailable = available === 'true';
      filter.maintenanceStatus = 'operational';
    }
    if (reservedFor) filter.reservedFor = reservedFor;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get slots with pagination
    const slots = await ParkingSlot.find(filter)
      .populate('currentBooking', 'user startTime endTime')
      .sort({ slotNumber: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await ParkingSlot.countDocuments(filter);

    res.json({
      slots,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        count: slots.length,
        totalSlots: total
      }
    });

  } catch (error) {
    console.error('Get parking slots error:', error);
    res.status(500).json({
      message: 'Server error while fetching parking slots'
    });
  }
});

// @route   GET /api/parking/slots/available
// @desc    Get available parking slots
// @access  Private
router.get('/slots/available', [
  query('location').optional().isIn(['Building A', 'Building B', 'Building C', 'Main Campus', 'Sports Complex']),
  query('vehicleType').optional().isIn(['car', 'motorcycle', 'bicycle']),
  query('startTime').optional().isISO8601(),
  query('endTime').optional().isISO8601()
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

    const { location, vehicleType, startTime, endTime } = req.query;

    // Build filter for available slots
    const filter = {
      isActive: true,
      isAvailable: true,
      maintenanceStatus: 'operational'
    };

    if (location) filter.location = location;

    // Handle vehicle type filtering
    if (vehicleType) {
      filter.$or = [
        { vehicleType: vehicleType },
        { vehicleType: 'any' }
      ];
    }

    // Get available slots
    let availableSlots = await ParkingSlot.find(filter).sort({ slotNumber: 1 });

    // If time range is provided, filter out slots that have bookings during that time
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);

      // Get slot IDs that have conflicting bookings
      const conflictingBookings = await Booking.find({
        status: 'active',
        $or: [
          {
            startTime: { $lt: end },
            endTime: { $gt: start }
          }
        ]
      }).distinct('parkingSlot');

      // Filter out slots with conflicts
      availableSlots = availableSlots.filter(
        slot => !conflictingBookings.some(booking => booking.toString() === slot._id.toString())
      );
    }

    // Filter based on user role and slot reservation
    const userRole = req.user.role;
    const suitableSlots = availableSlots.filter(slot => 
      slot.isSuitableFor(vehicleType || 'any', userRole)
    );

    res.json({
      availableSlots: suitableSlots,
      total: suitableSlots.length
    });

  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({
      message: 'Server error while fetching available slots'
    });
  }
});

// @route   GET /api/parking/slots/:id
// @desc    Get specific parking slot
// @access  Private
router.get('/slots/:id', async (req, res) => {
  try {
    const slot = await ParkingSlot.findById(req.params.id)
      .populate('currentBooking', 'user startTime endTime vehicle status');

    if (!slot) {
      return res.status(404).json({
        message: 'Parking slot not found'
      });
    }

    res.json({ slot });

  } catch (error) {
    console.error('Get parking slot error:', error);
    res.status(500).json({
      message: 'Server error while fetching parking slot'
    });
  }
});

// @route   GET /api/parking/availability
// @desc    Get parking availability summary by location
// @access  Private
router.get('/availability', async (req, res) => {
  try {
    const availabilityByLocation = await ParkingSlot.getAvailabilityByLocation();
    
    // Get overall statistics
    const totalStats = await ParkingSlot.aggregate([
      {
        $match: {
          isActive: true,
          maintenanceStatus: 'operational'
        }
      },
      {
        $group: {
          _id: null,
          totalSlots: { $sum: 1 },
          availableSlots: {
            $sum: { $cond: ['$isAvailable', 1, 0] }
          },
          occupiedSlots: {
            $sum: { $cond: ['$isAvailable', 0, 1] }
          }
        }
      }
    ]);

    const overall = totalStats[0] || {
      totalSlots: 0,
      availableSlots: 0,
      occupiedSlots: 0
    };

    overall.occupancyRate = overall.totalSlots > 0 
      ? Math.round((overall.occupiedSlots / overall.totalSlots) * 100) 
      : 0;

    res.json({
      overall,
      byLocation: availabilityByLocation
    });

  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      message: 'Server error while fetching availability data'
    });
  }
});

// @route   GET /api/parking/real-time-status
// @desc    Get real-time parking status for live updates
// @access  Private
router.get('/real-time-status', async (req, res) => {
  try {
    // Get current time
    const now = new Date();

    // Get all active slots with their current status
    const slots = await ParkingSlot.find({
      isActive: true,
      maintenanceStatus: 'operational'
    })
    .populate({
      path: 'currentBooking',
      select: 'user startTime endTime status vehicle',
      populate: {
        path: 'user',
        select: 'firstName lastName role'
      }
    })
    .sort({ location: 1, slotNumber: 1 });

    // Process each slot to determine real-time status
    const realTimeStatus = slots.map(slot => {
      let status = 'available';
      let bookingInfo = null;

      if (slot.currentBooking) {
        const booking = slot.currentBooking;
        
        if (booking.status === 'active') {
          if (now >= booking.startTime && now <= booking.endTime) {
            status = 'occupied';
          } else if (now < booking.startTime) {
            status = 'reserved';
          } else {
            status = 'overdue';
          }

          bookingInfo = {
            id: booking._id,
            startTime: booking.startTime,
            endTime: booking.endTime,
            vehicle: booking.vehicle,
            user: booking.user ? {
              name: `${booking.user.firstName} ${booking.user.lastName}`,
              role: booking.user.role
            } : null
          };
        }
      }

      return {
        id: slot._id,
        slotNumber: slot.slotNumber,
        location: slot.location,
        vehicleType: slot.vehicleType,
        reservedFor: slot.reservedFor,
        status,
        bookingInfo
      };
    });

    // Group by location for easier frontend consumption
    const statusByLocation = realTimeStatus.reduce((acc, slot) => {
      if (!acc[slot.location]) {
        acc[slot.location] = [];
      }
      acc[slot.location].push(slot);
      return acc;
    }, {});

    res.json({
      timestamp: now,
      slots: realTimeStatus,
      byLocation: statusByLocation,
      summary: {
        total: realTimeStatus.length,
        available: realTimeStatus.filter(s => s.status === 'available').length,
        occupied: realTimeStatus.filter(s => s.status === 'occupied').length,
        reserved: realTimeStatus.filter(s => s.status === 'reserved').length,
        overdue: realTimeStatus.filter(s => s.status === 'overdue').length
      }
    });

  } catch (error) {
    console.error('Get real-time status error:', error);
    res.status(500).json({
      message: 'Server error while fetching real-time status'
    });
  }
});

// @route   POST /api/parking/slots
// @desc    Create new parking slot (Admin only)
// @access  Private (Admin)
router.post('/slots', [
  authorize('admin'),
  body('slotNumber')
    .notEmpty()
    .withMessage('Slot number is required')
    .isLength({ min: 1, max: 10 })
    .withMessage('Slot number must be between 1 and 10 characters'),
  body('location')
    .isIn(['Building A', 'Building B', 'Building C', 'Main Campus', 'Sports Complex'])
    .withMessage('Invalid location'),
  body('vehicleType')
    .optional()
    .isIn(['car', 'motorcycle', 'bicycle', 'any'])
    .withMessage('Invalid vehicle type'),
  body('reservedFor')
    .optional()
    .isIn(['general', 'faculty', 'student', 'disabled', 'visitor'])
    .withMessage('Invalid reservation type'),
  body('hourlyRate')
    .optional()
    .isNumeric()
    .withMessage('Hourly rate must be a number')
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

    const slotData = {
      ...req.body,
      slotNumber: req.body.slotNumber.toUpperCase()
    };

    const slot = new ParkingSlot(slotData);
    await slot.save();

    res.status(201).json({
      message: 'Parking slot created successfully',
      slot
    });

  } catch (error) {
    console.error('Create parking slot error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Slot number already exists'
      });
    }
    
    res.status(500).json({
      message: 'Server error while creating parking slot'
    });
  }
});

// @route   PUT /api/parking/slots/:id
// @desc    Update parking slot (Admin only)
// @access  Private (Admin)
router.put('/slots/:id', [
  authorize('admin'),
  body('location')
    .optional()
    .isIn(['Building A', 'Building B', 'Building C', 'Main Campus', 'Sports Complex'])
    .withMessage('Invalid location'),
  body('vehicleType')
    .optional()
    .isIn(['car', 'motorcycle', 'bicycle', 'any'])
    .withMessage('Invalid vehicle type'),
  body('maintenanceStatus')
    .optional()
    .isIn(['operational', 'maintenance', 'out-of-order'])
    .withMessage('Invalid maintenance status')
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

    const slot = await ParkingSlot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        message: 'Parking slot not found'
      });
    }

    // Update slot
    Object.assign(slot, req.body);
    
    // If maintenance status changed to non-operational, release any active booking
    if (req.body.maintenanceStatus && req.body.maintenanceStatus !== 'operational') {
      if (slot.currentBooking) {
        const booking = await Booking.findById(slot.currentBooking);
        if (booking && booking.status === 'active') {
          booking.status = 'cancelled';
          booking.cancellationReason = 'Slot maintenance';
          await booking.save();
        }
      }
      slot.isAvailable = false;
      slot.currentBooking = null;
    }

    await slot.save();

    res.json({
      message: 'Parking slot updated successfully',
      slot
    });

  } catch (error) {
    console.error('Update parking slot error:', error);
    res.status(500).json({
      message: 'Server error while updating parking slot'
    });
  }
});

// @route   DELETE /api/parking/slots/:id
// @desc    Delete parking slot (Admin only)
// @access  Private (Admin)
router.delete('/slots/:id', authorize('admin'), async (req, res) => {
  try {
    const slot = await ParkingSlot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        message: 'Parking slot not found'
      });
    }

    // Check if slot has active booking
    if (slot.currentBooking) {
      const booking = await Booking.findById(slot.currentBooking);
      if (booking && booking.status === 'active') {
        return res.status(400).json({
          message: 'Cannot delete slot with active booking. Please cancel the booking first.'
        });
      }
    }

    await ParkingSlot.findByIdAndDelete(req.params.id);

    res.json({
      message: 'Parking slot deleted successfully'
    });

  } catch (error) {
    console.error('Delete parking slot error:', error);
    res.status(500).json({
      message: 'Server error while deleting parking slot'
    });
  }
});

module.exports = router;
