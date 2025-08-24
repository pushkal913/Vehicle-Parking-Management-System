import { doc, setDoc, getDoc, collection, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Define role hierarchy and permissions
export const ROLES = {
  SUPERADMIN: 'superadmin',
  STANDARD: 'standard'
};

export const PERMISSIONS = {
  // User management
  CREATE_USERS: 'create_users',
  READ_ALL_USERS: 'read_all_users',
  UPDATE_ALL_USERS: 'update_all_users',
  DELETE_USERS: 'delete_users',
  
  // Parking management
  CREATE_PARKING_SLOTS: 'create_parking_slots',
  UPDATE_PARKING_SLOTS: 'update_parking_slots',
  DELETE_PARKING_SLOTS: 'delete_parking_slots',
  VIEW_ALL_BOOKINGS: 'view_all_bookings',
  CANCEL_ANY_BOOKING: 'cancel_any_booking',
  
  // Booking management
  CREATE_BOOKING: 'create_booking',
  VIEW_OWN_BOOKINGS: 'view_own_bookings',
  CANCEL_OWN_BOOKING: 'cancel_own_booking',
  
  // Reports and analytics
  VIEW_ANALYTICS: 'view_analytics',
  GENERATE_REPORTS: 'generate_reports',
  
  // System settings
  MANAGE_SYSTEM_SETTINGS: 'manage_system_settings'
};

// Role-based permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.SUPERADMIN]: [
    // Full system access
    PERMISSIONS.CREATE_USERS,
    PERMISSIONS.READ_ALL_USERS,
    PERMISSIONS.UPDATE_ALL_USERS,
    PERMISSIONS.DELETE_USERS,
    PERMISSIONS.CREATE_PARKING_SLOTS,
    PERMISSIONS.UPDATE_PARKING_SLOTS,
    PERMISSIONS.DELETE_PARKING_SLOTS,
    PERMISSIONS.VIEW_ALL_BOOKINGS,
    PERMISSIONS.CANCEL_ANY_BOOKING,
    PERMISSIONS.CREATE_BOOKING,
    PERMISSIONS.VIEW_OWN_BOOKINGS,
    PERMISSIONS.CANCEL_OWN_BOOKING,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.MANAGE_SYSTEM_SETTINGS
  ],
  
  [ROLES.STANDARD]: [
    // Standard user access (students and faculty)
    PERMISSIONS.CREATE_BOOKING,
    PERMISSIONS.VIEW_OWN_BOOKINGS,
    PERMISSIONS.CANCEL_OWN_BOOKING
  ]
};

export class RoleService {
  
  // Create superadmin (should be done once during setup)
  static async createSuperAdmin(userData) {
    try {
      const superAdminData = {
        ...userData,
        role: ROLES.SUPERADMIN,
        permissions: ROLE_PERMISSIONS[ROLES.SUPERADMIN],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', userData.uid), superAdminData);
      return { success: true, user: superAdminData };
    } catch (error) {
      console.error('Error creating superadmin:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Assign role to user
  static async assignRole(userId, role) {
    try {
      if (!Object.values(ROLES).includes(role)) {
        throw new Error('Invalid role');
      }
      
      const userRef = doc(db, 'users', userId);
      const permissions = ROLE_PERMISSIONS[role] || [];
      
      await updateDoc(userRef, {
        role,
        permissions,
        updatedAt: new Date()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error assigning role:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Check if user has specific permission
  static hasPermission(user, permission) {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  }
  
  // Check if user has any of the specified permissions
  static hasAnyPermission(user, permissions) {
    if (!user || !user.permissions) return false;
    return permissions.some(permission => user.permissions.includes(permission));
  }
  
  // Check if user has all specified permissions
  static hasAllPermissions(user, permissions) {
    if (!user || !user.permissions) return false;
    return permissions.every(permission => user.permissions.includes(permission));
  }
  
  // Get role hierarchy level (higher number = more privileges)
  static getRoleLevel(role) {
    const levels = {
      [ROLES.STANDARD]: 1,
      [ROLES.SUPERADMIN]: 2
    };
    return levels[role] || 0;
  }
  
  // Check if user can manage another user (based on role hierarchy)
  static canManageUser(currentUser, targetUser) {
    if (!currentUser || !targetUser) return false;
    
    // Only SuperAdmin can manage users
    return currentUser.role === ROLES.SUPERADMIN;
  }
  
  // Get all users with specific role
  static async getUsersByRole(role) {
    try {
      const q = query(collection(db, 'users'), where('role', '==', role));
      const querySnapshot = await getDocs(q);
      
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, users };
    } catch (error) {
      console.error('Error getting users by role:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Initialize default roles for registration (all users get standard role)
  static getDefaultRoleForRegistration(isFaculty) {
    return ROLES.STANDARD; // All users (faculty and students) get standard role
  }
  
  // Get permissions for role
  static getPermissionsForRole(role) {
    return ROLE_PERMISSIONS[role] || [];
  }
}

// Higher-order component for permission checking
export const withPermission = (permission) => (WrappedComponent) => {
  return function PermissionWrapper(props) {
    const { user } = props;
    
    if (!RoleService.hasPermission(user, permission)) {
      return (
        <div className="permission-denied">
          <h3>Access Denied</h3>
          <p>You don't have permission to access this resource.</p>
        </div>
      );
    }
    
    return <WrappedComponent {...props} />;
  };
};

export default RoleService;
