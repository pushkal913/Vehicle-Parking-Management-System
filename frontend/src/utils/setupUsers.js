import { createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { RoleService, ROLES } from '../services/roleService';

// Generate a strong random password with mixed chars
function generateStrongPassword(length = 20) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O
  const lower = 'abcdefghijkmnpqrstuvwxyz'; // no l/o
  const numbers = '23456789'; // no 0/1
  const symbols = '!@#$%^&*()-_=+[]{},.?';
  const all = upper + lower + numbers + symbols;
  const getRand = (max) => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return arr[0] % max;
    }
    // Fallback
    return Math.floor(Math.random() * max);
  };
  // Ensure at least one from each category
  const req = [
    upper[getRand(upper.length)],
    lower[getRand(lower.length)],
    numbers[getRand(numbers.length)],
    symbols[getRand(symbols.length)]
  ];
  const remaining = Array.from({ length: Math.max(0, length - req.length) }, () => all[getRand(all.length)]);
  const combined = [...req, ...remaining];
  // Shuffle
  for (let i = combined.length - 1; i > 0; i--) {
    const j = getRand(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined.join('');
}

// This should be run ONCE to create the initial superadmin
export const createInitialSuperAdmin = async () => {
  try {
    const generatedPassword = generateStrongPassword(20);
    const superAdminData = {
      email: 'superadmin@university.edu',
      password: generatedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      department: 'Administration',
      employeeId: 'SUPER001'
    };
    
    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      superAdminData.email, 
      superAdminData.password
    );
    
    const user = userCredential.user;
    
    // Update profile
    await updateProfile(user, {
      displayName: `${superAdminData.firstName} ${superAdminData.lastName}`
    });
    
    // Create superadmin with role service
    const result = await RoleService.createSuperAdmin({
      uid: user.uid,
      firstName: superAdminData.firstName,
      lastName: superAdminData.lastName,
      email: superAdminData.email,
      department: superAdminData.department,
      employeeId: superAdminData.employeeId,
      isFaculty: true,
      emailVerified: user.emailVerified,
      vehicleInfo: []
    });
    
    if (result.success) {
      console.log('✅ SuperAdmin created successfully');
      console.log('📧 Email: superadmin@university.edu');
      return { ...result, generatedPassword };
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('❌ Error creating superadmin:', error);
    return { success: false, error: error.message };
  }
};

// Create a second SuperAdmin with a real mailbox
export const createSecondSuperAdmin = async () => {
  try {
    const generatedPassword = generateStrongPassword(20);
    const data = {
      email: 'vrinda914@gmail.com',
      password: generatedPassword,
      firstName: 'Ultra',
      lastName: 'SuperAdmin',
      department: 'Administration',
      employeeId: 'SUPER002'
    };

    // Create Firebase user (this signs in as that user in client SDK)
    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const u = cred.user;

    await updateProfile(u, { displayName: `${data.firstName} ${data.lastName}` });

    // Send verification email to the new superadmin
    try {
      await sendEmailVerification(u, { url: `${window.location.origin}/verify-email`, handleCodeInApp: true });
    } catch (e) {
      console.warn('Could not send verification email to second superadmin:', e);
    }

    // Create Firestore role doc
    const result = await RoleService.createSuperAdmin({
      uid: u.uid,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      department: data.department,
      employeeId: data.employeeId,
      isFaculty: true,
      emailVerified: u.emailVerified,
      vehicleInfo: []
    });

    if (!result.success) throw new Error(result.error || 'Role setup failed');

    return { success: true, generatedPassword, email: data.email, name: `${data.firstName} ${data.lastName}` };
  } catch (error) {
    console.error('❌ Error creating second superadmin:', error);
    return { success: false, error: error.message };
  }
};

// Function to promote existing user to admin (now SuperAdmin is the only admin level)
export const promoteToSuperAdmin = async (userId) => {
  try {
    const result = await RoleService.assignRole(userId, ROLES.SUPERADMIN);
    return result;
  } catch (error) {
    console.error('Error promoting to superadmin:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email to SuperAdmin (requires Firebase Auth email templates configured)
export const sendSuperAdminPasswordReset = async (email = 'superadmin@university.edu') => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Demo function to create standard users (for testing)
export const createDemoUsers = async () => {
  const demoUsers = [
    {
      email: 'faculty1@university.edu', 
      password: 'Faculty123!',
      firstName: 'Dr. John',
      lastName: 'Professor',
      department: 'Computer Science',
      employeeId: 'FAC001',
      role: ROLES.STANDARD,
      isFaculty: true
    },
    {
      email: 'faculty2@university.edu', 
      password: 'Faculty123!',
      firstName: 'Dr. Sarah',
      lastName: 'Johnson',
      department: 'Engineering',
      employeeId: 'FAC002',
      role: ROLES.STANDARD,
      isFaculty: true
    },
    {
      email: 'student1@university.edu',
      password: 'Student123!',
      firstName: 'Jane',
      lastName: 'Smith',
      department: 'Computer Science',
      studentId: 'STU001',
      role: ROLES.STANDARD,
      isFaculty: false
    },
    {
      email: 'student2@university.edu',
      password: 'Student123!',
      firstName: 'Mike',
      lastName: 'Wilson',
      department: 'Business',
      studentId: 'STU002',
      role: ROLES.STANDARD,
      isFaculty: false
    },
    {
      email: 'student3@university.edu',
      password: 'Student123!',
      firstName: 'Emily',
      lastName: 'Davis',
      department: 'Engineering',
      studentId: 'STU003',
      role: ROLES.STANDARD,
      isFaculty: false
    }
  ];
  
  const results = [];
  
  for (const userData of demoUsers) {
    try {
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
      
      const user = userCredential.user;
      
      // Update profile
      await updateProfile(user, {
        displayName: `${userData.firstName} ${userData.lastName}`
      });

      // Create Firestore user doc with base profile + role/permissions
      const permissions = RoleService.getPermissionsForRole(userData.role);
      const userDocData = {
        uid: user.uid,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        permissions,
        isFaculty: !!userData.isFaculty,
        employeeId: userData.isFaculty ? userData.employeeId || null : null,
        studentId: !userData.isFaculty ? userData.studentId || null : null,
        department: userData.department || null,
        isActive: true,
        emailVerified: user.emailVerified,
        vehicleInfo: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await setDoc(doc(db, 'users', user.uid), userDocData);
      
      results.push({
        success: true,
        email: userData.email,
        role: userData.role
      });
      
      console.log(`✅ Created ${userData.role}: ${userData.email}`);
      
    } catch (error) {
      console.error(`❌ Error creating ${userData.email}:`, error);
      results.push({
        success: false,
        email: userData.email,
        error: error.message
      });
    }
  }
  
  return results;
};

export default {
  createInitialSuperAdmin,
  createSecondSuperAdmin,
  promoteToSuperAdmin,
  createDemoUsers,
  sendSuperAdminPasswordReset
};
