const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const parkingRoutes = require('./routes/parking');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');

// Import middleware
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://your-domain.com' // Replace with your actual domain
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Memory Server setup (for local development)
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;

const connectDB = async () => {
  try {
    let mongoUri;
    
    // Use production MongoDB URI if available, otherwise use memory server for development
    if (process.env.MONGODB_URI) {
      mongoUri = process.env.MONGODB_URI;
      console.log('Connecting to production MongoDB...');
    } else if (process.env.NODE_ENV !== 'test') {
      // Development: Use MongoDB Memory Server
      mongod = await MongoMemoryServer.create({
        instance: {
          port: 27017,
          dbName: 'university-parking'
        }
      });
      
      mongoUri = mongod.getUri();
      console.log('MongoDB Memory Server URI:', mongoUri);
    }
    
    if (mongoUri) {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      console.log(process.env.MONGODB_URI ? 'Connected to production MongoDB' : 'Connected to MongoDB Memory Server');
      
      // Initialize parking slots
      await initializeParkingSlots();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Initialize 50 parking slots
const initializeParkingSlots = async () => {
  const ParkingSlot = require('./models/ParkingSlot');
  
  const existingSlots = await ParkingSlot.countDocuments();
  if (existingSlots === 0) {
    const locations = ['Building A', 'Building B', 'Building C', 'Main Campus', 'Sports Complex'];
    const slots = [];
    
    for (let i = 1; i <= 50; i++) {
      const location = locations[Math.floor(Math.random() * locations.length)];
      slots.push({
        slotNumber: `P${i.toString().padStart(3, '0')}`,
        location: location,
        isAvailable: true,
        vehicleType: Math.random() > 0.5 ? 'car' : 'motorcycle'
      });
    }
    
    await ParkingSlot.insertMany(slots);
    console.log('Initialized 50 parking slots');
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/parking', authMiddleware, parkingRoutes);
app.use('/api/bookings', authMiddleware, bookingRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  if (mongod) {
    await mongod.stop();
  }
  
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;
