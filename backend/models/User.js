const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'admin'],
    default: 'student'
  },
  isFaculty: {
    type: Boolean,
    default: false
  },
  employeeId: {
    type: String,
    required: function() {
      return this.isFaculty || this.role === 'faculty';
    },
    unique: true,
    sparse: true,
    validate: {
      validator: function(v) {
        if (this.isFaculty || this.role === 'faculty') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'Employee ID is required for faculty members'
    }
  },
  studentId: {
    type: String,
    required: function() {
      return !this.isFaculty && this.role === 'student';
    },
    unique: true,
    sparse: true,
    validate: {
      validator: function(v) {
        if (!this.isFaculty && this.role === 'student') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'Student ID is required for students'
    }
  },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || validator.isMobilePhone(v);
      },
      message: 'Please provide a valid phone number'
    }
  },
  department: {
    type: String,
    trim: true
  },
  vehicleInfo: [{
    vehicleNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    vehicleType: {
      type: String,
      enum: ['car', 'motorcycle', 'bicycle'],
      required: true
    },
    make: String,
    model: String,
    color: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  lockUntil: Date
}, {
  timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ studentId: 1 });
userSchema.index({ role: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified or new
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with salt rounds of 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set role based on isFaculty
userSchema.pre('save', function(next) {
  if (this.isFaculty) {
    this.role = 'faculty';
    // Clear studentId if switching to faculty
    this.studentId = undefined;
  } else if (this.role === 'student') {
    this.isFaculty = false;
    // Clear employeeId if switching to student
    this.employeeId = undefined;
  }
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if account is locked
userSchema.methods.isAccountLocked = function() {
  return this.accountLocked && this.lockUntil && this.lockUntil > Date.now();
};

// Instance method to increment failed login attempts
userSchema.methods.incrementLoginAttempts = async function() {
  // Clear lock if it has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        failedLoginAttempts: 1,
        lockUntil: 1,
        accountLocked: 1
      }
    });
  }

  const updates = { $inc: { failedLoginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.failedLoginAttempts + 1 >= 5 && !this.accountLocked) {
    updates.$set = {
      accountLocked: true,
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 hours
    };
  }

  return this.updateOne(updates);
};

// Instance method to reset failed login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $unset: {
      failedLoginAttempts: 1,
      lockUntil: 1,
      accountLocked: 1
    },
    $set: {
      lastLogin: new Date()
    }
  });
};

// Static method to find by email or ID
userSchema.statics.findByEmailOrId = function(identifier) {
  return this.findOne({
    $or: [
      { email: identifier },
      { employeeId: identifier },
      { studentId: identifier }
    ]
  });
};

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
