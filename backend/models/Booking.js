const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  parkingSlot: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ParkingSlot',
    required: [true, 'Parking slot is required']
  },
  vehicle: {
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      uppercase: true,
      trim: true
    },
    vehicleType: {
      type: String,
      enum: ['car', 'motorcycle', 'bicycle'],
      required: [true, 'Vehicle type is required']
    }
  },
  bookingDate: {
    type: Date,
    required: [true, 'Booking date is required']
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  endTime: {
    type: Date,
    required: [true, 'End time is required']
  },
  duration: {
    type: Number, // in hours
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'expired', 'no-show'],
    default: 'active'
  },
  location: {
    type: String,
    required: [true, 'Location is required']
  },
  checkInTime: Date,
  checkOutTime: Date,
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cash', 'digital-wallet', 'university-account'],
    default: 'university-account'
  },
  bookingType: {
    type: String,
    enum: ['hourly', 'daily', 'monthly'],
    default: 'hourly'
  },
  isExtended: {
    type: Boolean,
    default: false
  },
  extensionHistory: [{
    originalEndTime: Date,
    newEndTime: Date,
    additionalDuration: Number,
    additionalAmount: Number,
    extendedAt: {
      type: Date,
      default: Date.now
    }
  }],
  cancellationReason: String,
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  qrCode: String, // For easy check-in/check-out
  notes: {
    type: String,
    maxlength: 500
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
bookingSchema.index({ user: 1, bookingDate: -1 });
bookingSchema.index({ parkingSlot: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ startTime: 1, endTime: 1 });
bookingSchema.index({ 'vehicle.vehicleNumber': 1 });

// Virtual for total booking time in minutes
bookingSchema.virtual('totalMinutes').get(function() {
  if (this.checkInTime && this.checkOutTime) {
    return Math.ceil((this.checkOutTime - this.checkInTime) / (1000 * 60));
  }
  return Math.ceil((this.endTime - this.startTime) / (1000 * 60));
});

// Virtual for actual duration used
bookingSchema.virtual('actualDuration').get(function() {
  if (this.checkInTime && this.checkOutTime) {
    return (this.checkOutTime - this.checkInTime) / (1000 * 60 * 60); // in hours
  }
  return null;
});

// Virtual for booking status description
bookingSchema.virtual('statusDescription').get(function() {
  const now = new Date();
  
  if (this.status === 'cancelled') return 'Booking Cancelled';
  if (this.status === 'completed') return 'Completed';
  if (this.status === 'no-show') return 'No Show';
  if (this.status === 'expired') return 'Expired';
  
  if (now < this.startTime) return 'Upcoming';
  if (now >= this.startTime && now <= this.endTime) return 'Active';
  if (now > this.endTime) return 'Overdue';
  
  return 'Unknown';
});

// Pre-save middleware to calculate duration and total amount
bookingSchema.pre('save', function(next) {
  // Calculate duration in hours
  if (this.startTime && this.endTime) {
    this.duration = Math.ceil((this.endTime - this.startTime) / (1000 * 60 * 60));
  }
  
  // Set booking date if not provided
  if (!this.bookingDate && this.startTime) {
    this.bookingDate = new Date(this.startTime.getFullYear(), 
                               this.startTime.getMonth(), 
                               this.startTime.getDate());
  }
  
  next();
});

// Static method to find user's active bookings
bookingSchema.statics.findActiveBookings = function(userId) {
  return this.find({
    user: userId,
    status: 'active',
    endTime: { $gte: new Date() }
  }).populate('parkingSlot', 'slotNumber location');
};

// Static method to find overlapping bookings
bookingSchema.statics.findOverlappingBookings = function(slotId, startTime, endTime, excludeBookingId = null) {
  const query = {
    parkingSlot: slotId,
    status: { $in: ['active'] },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  };
  
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  return this.find(query);
};

// Static method to get booking statistics
bookingSchema.statics.getBookingStats = async function(startDate, endDate) {
  return this.aggregate([
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
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);
};

// Instance method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const timeDiff = this.startTime - now;
  const hoursUntilStart = timeDiff / (1000 * 60 * 60);
  
  // Can cancel if booking hasn't started and it's more than 1 hour before start time
  return this.status === 'active' && hoursUntilStart > 1;
};

// Instance method to check if booking can be extended
bookingSchema.methods.canBeExtended = function() {
  const now = new Date();
  return this.status === 'active' && 
         now >= this.startTime && 
         now <= this.endTime;
};

// Instance method to cancel booking
bookingSchema.methods.cancelBooking = async function(cancelledBy, reason = '') {
  if (!this.canBeCancelled()) {
    throw new Error('Booking cannot be cancelled at this time');
  }
  
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancelledAt = new Date();
  this.cancelledBy = cancelledBy;
  
  // Release the parking slot
  const ParkingSlot = mongoose.model('ParkingSlot');
  await ParkingSlot.findByIdAndUpdate(this.parkingSlot, {
    isAvailable: true,
    currentBooking: null
  });
  
  return this.save();
};

// Instance method to complete booking
bookingSchema.methods.completeBooking = async function() {
  this.status = 'completed';
  this.checkOutTime = new Date();
  
  // Release the parking slot
  const ParkingSlot = mongoose.model('ParkingSlot');
  await ParkingSlot.findByIdAndUpdate(this.parkingSlot, {
    isAvailable: true,
    currentBooking: null
  });
  
  return this.save();
};

// Instance method to extend booking
bookingSchema.methods.extendBooking = async function(additionalHours, hourlyRate = 5) {
  if (!this.canBeExtended()) {
    throw new Error('Booking cannot be extended at this time');
  }
  
  const originalEndTime = new Date(this.endTime);
  const newEndTime = new Date(this.endTime.getTime() + (additionalHours * 60 * 60 * 1000));
  const additionalAmount = additionalHours * hourlyRate;
  
  // Check for conflicts with the extension
  const conflicts = await this.constructor.findOverlappingBookings(
    this.parkingSlot, 
    this.endTime, 
    newEndTime, 
    this._id
  );
  
  if (conflicts.length > 0) {
    throw new Error('Cannot extend booking due to conflicting reservations');
  }
  
  this.extensionHistory.push({
    originalEndTime,
    newEndTime,
    additionalDuration: additionalHours,
    additionalAmount
  });
  
  this.endTime = newEndTime;
  this.duration += additionalHours;
  this.totalAmount += additionalAmount;
  this.isExtended = true;
  
  return this.save();
};

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Booking', bookingSchema);
