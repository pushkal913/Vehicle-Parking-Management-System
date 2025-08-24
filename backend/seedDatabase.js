const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Demo users to create
const demoUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@university.edu',
    password: 'Admin123!',
    role: 'admin',
    department: 'Administration',
    isFaculty: true,
    employeeId: 'EMP0001'
  },
  {
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@university.edu',
    password: 'Faculty123!',
    role: 'faculty',
    department: 'Computer Science',
    isFaculty: true,
    employeeId: 'EMP1234'
  },
  {
    firstName: 'Prof. Michael',
    lastName: 'Chen',
    email: 'michael.chen@university.edu',
    password: 'Faculty123!',
    role: 'faculty',
    department: 'Engineering',
    isFaculty: true,
    employeeId: 'EMP5678'
  },
  {
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@university.edu',
    password: 'Student123!',
    role: 'student',
    department: 'Computer Science',
    isFaculty: false,
    studentId: 'STU123456'
  },
  {
    firstName: 'James',
    lastName: 'Wilson',
    email: 'james.wilson@university.edu',
    password: 'Student123!',
    role: 'student',
    department: 'Business',
    isFaculty: false,
    studentId: 'STU789012'
  },
  {
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@university.edu',
    password: 'Student123!',
    role: 'student',
    department: 'Engineering',
    isFaculty: false,
    studentId: 'STU345678'
  }
];

const createDemoUsers = async () => {
  let mongod;
  
  try {
    console.log('🔄 Starting MongoDB Memory Server...');
    
    // Start MongoDB Memory Server
    mongod = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'university-parking'
      }
    });
    
    const uri = mongod.getUri();
    console.log('📊 MongoDB Memory Server URI:', uri);
    
    // Connect to MongoDB
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB Memory Server');
    
    // Clear existing users
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log(`🗑️  Clearing ${existingUsers} existing users...`);
      await User.deleteMany({});
    }
    
    console.log('👥 Creating demo users...');
    
    // Create demo users
    for (const userData of demoUsers) {
      try {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Created ${userData.role}: ${userData.firstName} ${userData.lastName} (${userData.email})`);
      } catch (error) {
        console.error(`❌ Failed to create user ${userData.email}:`, error.message);
      }
    }
    
    console.log('\n🎉 Demo users created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('==========================================');
    
    demoUsers.forEach(user => {
      console.log(`\n${user.role.toUpperCase()}:`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log(`  Department: ${user.department}`);
      if (user.isFaculty) {
        console.log(`  Employee ID: ${user.employeeId}`);
      } else {
        console.log(`  Student ID: ${user.studentId}`);
      }
    });
    
    console.log('\n==========================================');
    console.log('💡 You can now start the server with: npm start');
    console.log('🌐 Frontend will be available at: http://localhost:3000');
    console.log('🔗 Backend API will be available at: http://localhost:5000');
    
  } catch (error) {
    console.error('❌ Error creating demo users:', error);
  } finally {
    // Keep the database running for the main application
    console.log('\n⚠️  MongoDB Memory Server will remain running for the main application');
    console.log('   You can now start your main server with npm start');
    
    // Close mongoose connection but keep mongod running
    await mongoose.connection.close();
    
    // Don't stop mongod here - let the main app use it
    // if (mongod) {
    //   await mongod.stop();
    // }
    
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  createDemoUsers();
}

module.exports = { createDemoUsers, demoUsers };
