const mongoose = require('mongoose');

const parkingSlotSchema = new mongoose.Schema({
  slotNumber: {
    type: String,
    required: [true, 'Slot number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    enum: ['Building A', 'Building B', 'Building C', 'Main Campus', 'Sports Complex'],
    trim: true
  },
  floor: {
    type: String,
    default: 'Ground Floor'
  },
  section: {
    type: String,
    default: 'General'
  },
  vehicleType: {
    type: String,
    enum: ['car', 'motorcycle', 'bicycle', 'any'],
    default: 'any'
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  currentBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  reservedFor: {
    type: String,
    enum: ['general', 'faculty', 'student', 'disabled', 'visitor'],
    default: 'general'
  },
  hourlyRate: {
    type: Number,
    default: 5.00,
    min: 0
  },
  features: [{
    type: String,
    enum: ['covered', 'electric-charging', 'cctv', 'security', 'near-entrance']
  }],
  maintenanceStatus: {
    type: String,
    enum: ['operational', 'maintenance', 'out-of-order'],
    default: 'operational'
  },
  lastMaintenance: Date,
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  description: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for better performance
parkingSlotSchema.index({ location: 1, isAvailable: 1 });
parkingSlotSchema.index({ slotNumber: 1 });
parkingSlotSchema.index({ vehicleType: 1 });
parkingSlotSchema.index({ reservedFor: 1 });
parkingSlotSchema.index({ isActive: 1, maintenanceStatus: 1 });

// Virtual for availability status
parkingSlotSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive';
  if (this.maintenanceStatus !== 'operational') return this.maintenanceStatus;
  if (!this.isAvailable) return 'occupied';
  return 'available';
});

// Static method to find available slots
parkingSlotSchema.statics.findAvailableSlots = function(filters = {}) {
  const query = {
    isAvailable: true,
    isActive: true,
    maintenanceStatus: 'operational',
    ...filters
  };
  
  return this.find(query).sort({ slotNumber: 1 });
};

// Static method to get availability by location
parkingSlotSchema.statics.getAvailabilityByLocation = async function() {
  return this.aggregate([
    {
      $match: {
        isActive: true,
        maintenanceStatus: 'operational'
      }
    },
    {
      $group: {
        _id: '$location',
        totalSlots: { $sum: 1 },
        availableSlots: {
          $sum: { $cond: ['$isAvailable', 1, 0] }
        },
        occupiedSlots: {
          $sum: { $cond: ['$isAvailable', 0, 1] }
        }
      }
    },
    {
      $addFields: {
        occupancyRate: {
          $multiply: [
            { $divide: ['$occupiedSlots', '$totalSlots'] },
            100
          ]
        }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

// Static method to get slots by vehicle type
parkingSlotSchema.statics.findByVehicleType = function(vehicleType, location = null) {
  const query = {
    isAvailable: true,
    isActive: true,
    maintenanceStatus: 'operational',
    $or: [
      { vehicleType: vehicleType },
      { vehicleType: 'any' }
    ]
  };
  
  if (location) {
    query.location = location;
  }
  
  return this.find(query).sort({ slotNumber: 1 });
};

// Instance method to book the slot
parkingSlotSchema.methods.bookSlot = async function(bookingId) {
  this.isAvailable = false;
  this.currentBooking = bookingId;
  return this.save();
};

// Instance method to release the slot
parkingSlotSchema.methods.releaseSlot = async function() {
  this.isAvailable = true;
  this.currentBooking = null;
  return this.save();
};

// Instance method to check if slot is suitable for vehicle
parkingSlotSchema.methods.isSuitableFor = function(vehicleType, userRole = 'general') {
  // Check vehicle type compatibility
  const vehicleCompatible = this.vehicleType === 'any' || this.vehicleType === vehicleType;
  
  // Check reservation compatibility
  const reservationCompatible = this.reservedFor === 'general' || 
                                this.reservedFor === userRole ||
                                (userRole === 'faculty' && this.reservedFor === 'faculty') ||
                                (userRole === 'student' && this.reservedFor === 'student');
  
  return vehicleCompatible && reservationCompatible && 
         this.isActive && this.maintenanceStatus === 'operational';
};

// Pre-save middleware
parkingSlotSchema.pre('save', function(next) {
  // If slot is not active or under maintenance, it should not be available
  if (!this.isActive || this.maintenanceStatus !== 'operational') {
    this.isAvailable = false;
  }
  next();
});

// Ensure virtual fields are serialized
parkingSlotSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('ParkingSlot', parkingSlotSchema);
