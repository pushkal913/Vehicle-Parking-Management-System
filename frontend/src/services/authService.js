import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  reload,
  updateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';
import { 
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { RoleService, ROLES } from './roleService';

// Auth service for Firebase operations
export const authService = {
  // Register new user
  async register(userData) {
    try {
      const { email, password, firstName, lastName, isFaculty, employeeId, studentId, department } = userData;
      
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update user profile
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });
      
      // Send email verification link
      try {
        const actionCodeSettings = {
          url: `${window.location.origin}/verify-email`,
          handleCodeInApp: true,
        };
        await sendEmailVerification(user, actionCodeSettings);
      } catch (e) {
        console.warn('sendEmailVerification failed (will allow manual resend):', e);
      }

      // Save additional user data to Firestore
      const role = RoleService.getDefaultRoleForRegistration(isFaculty);
      const permissions = RoleService.getPermissionsForRole(role);
      
      const userDocData = {
        uid: user.uid,
        firstName,
        lastName,
        email,
        role,
        permissions,
        isFaculty,
        employeeId: isFaculty ? employeeId : null,
        studentId: !isFaculty ? studentId : null,
        department,
        isActive: true,
  emailVerified: !!user.emailVerified,
        vehicleInfo: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), userDocData);
      
      return {
  success: true,
        user: {
          ...userDocData,
          id: user.uid
  },

  // Change current user's email with reauthentication
  async changeEmailWithReauth(currentPassword, newEmail) {
    try {
      const u = auth.currentUser;
      if (!u || !u.email) return { success: false, error: 'No authenticated user' };
      const cred = EmailAuthProvider.credential(u.email, currentPassword);
      await reauthenticateWithCredential(u, cred);
      await updateEmail(u, newEmail);
      // Firestore sync
      try {
        await updateDoc(doc(db, 'users', u.uid), {
          email: newEmail,
          emailVerified: false,
          updatedAt: new Date(),
        });
      } catch {}
      // Send verification to new address
      try {
        await sendEmailVerification(u, { url: `${window.location.origin}/verify-email`, handleCodeInApp: true });
      } catch {}
      return { success: true };
    } catch (error) {
      console.error('changeEmailWithReauth error:', error);
      return { success: false, error: error.message };
    }
  },
  needsVerification: !user.emailVerified
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Send verification email to current user
  async sendVerificationEmail() {
    const user = auth.currentUser;
    if (!user) return { success: false, error: 'No authenticated user' };
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(user, actionCodeSettings);
      return { success: true };
    } catch (error) {
      console.error('Send verification error:', error);
      return { success: false, error: error.message };
    }
  },

  // Refresh Firebase user and sync Firestore's emailVerified if changed
  async refreshEmailVerification() {
    try {
      const user = auth.currentUser;
      if (!user) return { success: false, error: 'No authenticated user' };
      await reload(user);
      const verified = !!user.emailVerified;
      try {
        const ref = doc(db, 'users', user.uid);
        const current = await getDoc(ref);
        if (current.exists() && current.data().emailVerified !== verified) {
          await updateDoc(ref, { emailVerified: verified, updatedAt: new Date() });
        }
      } catch {}
      return { success: true, emailVerified: verified };
    } catch (error) {
      console.error('Refresh email verification error:', error);
      return { success: false, error: error.message };
    }
  },

  // Login user
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }
      
      const userData = userDoc.data();
      // Merge live emailVerified and sync Firestore if changed
      const emailVerified = !!user.emailVerified;
      if (userData.emailVerified !== emailVerified) {
        try { await updateDoc(doc(db, 'users', user.uid), { emailVerified, updatedAt: new Date() }); } catch {}
      }
      
      return {
        success: true,
        user: {
          ...userData,
          emailVerified,
          id: user.uid,
          fullName: `${userData.firstName} ${userData.lastName}`
        }
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Logout user
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Get current user data
  async getCurrentUser() {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const userData = userDoc.data();
      // Merge live emailVerified from Firebase auth
      const emailVerified = !!user.emailVerified;
      if (userData.emailVerified !== emailVerified) {
        try { await updateDoc(doc(db, 'users', user.uid), { emailVerified, updatedAt: new Date() }); } catch {}
      }
      return {
        ...userData,
        emailVerified,
        id: user.uid,
        fullName: `${userData.firstName} ${userData.lastName}`
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  // Update user profile
  async updateUserProfile(userId, updateData) {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        ...updateData,
        updatedAt: new Date()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Start passwordless email link sign-in
  async startEmailLinkSignIn(email) {
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/finish-signin`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      return { success: true };
    } catch (error) {
      console.error('startEmailLinkSignIn error:', error);
      return { success: false, error: error.message };
    }
  },

  // Complete passwordless email link sign-in
  async completeEmailLinkSignIn(linkUrl) {
    try {
      if (!isSignInWithEmailLink(auth, linkUrl)) {
        return { success: false, error: 'Invalid sign-in link' };
      }
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        // If opened on another device, ask the user
        email = window.prompt('Confirm your email to complete sign-in');
      }
      const result = await signInWithEmailLink(auth, email, linkUrl);
      window.localStorage.removeItem('emailForSignIn');

      // Ensure Firestore user doc exists
      const u = result.user;
      const ref = doc(db, 'users', u.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const role = RoleService.getDefaultRoleForRegistration(false);
        const permissions = RoleService.getPermissionsForRole(role);
        const userDocData = {
          uid: u.uid,
          firstName: u.displayName?.split(' ')?.[0] || 'New',
          lastName: u.displayName?.split(' ')?.slice(1).join(' ') || 'User',
          email: u.email,
          role,
          permissions,
          isFaculty: false,
          employeeId: null,
          studentId: null,
          department: null,
          isActive: true,
          emailVerified: !!u.emailVerified,
          vehicleInfo: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          profileIncomplete: true,
        };
        await setDoc(ref, userDocData);
      } else {
        // Sync emailVerified
        const verified = !!u.emailVerified;
        if (snap.data().emailVerified !== verified) {
          await updateDoc(ref, { emailVerified: verified, updatedAt: new Date() });
        }
      }
      return { success: true };
    } catch (error) {
      console.error('completeEmailLinkSignIn error:', error);
      return { success: false, error: error.message };
    }
  },

  // Reset password
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Listen to auth state changes
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }
};

export default authService;
