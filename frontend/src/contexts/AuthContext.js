import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService } from '../services/authService';
import { toast } from 'react-toastify';

// Create context
const AuthContext = createContext();

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAIL: 'LOGIN_FAIL',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAIL: 'REGISTER_FAIL',
  LOGOUT: 'LOGOUT',
  USER_LOADED: 'USER_LOADED',
  AUTH_ERROR: 'AUTH_ERROR',
  CLEAR_ERRORS: 'CLEAR_ERRORS',
  UPDATE_USER: 'UPDATE_USER'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.USER_LOADED:
      return {
        ...state,
        isAuthenticated: true,
        loading: false,
        user: action.payload,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      localStorage.setItem('token', action.payload.token);
      
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAIL:
    case AUTH_ACTIONS.REGISTER_FAIL:
    case AUTH_ACTIONS.AUTH_ERROR:
      localStorage.removeItem('token');
      
      return {
        ...state,
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload
      };

    case AUTH_ACTIONS.LOGOUT:
      localStorage.removeItem('token');
      
      return {
        ...state,
        token: null,
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };

    case AUTH_ACTIONS.CLEAR_ERRORS:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Firebase auth state listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in, get user data from Firestore
          const user = await authService.getCurrentUser();
          if (user) {
            dispatch({
              type: AUTH_ACTIONS.USER_LOADED,
              payload: user
            });
          } else {
            // Firebase user exists but no Firestore data
            dispatch({ type: AUTH_ACTIONS.AUTH_ERROR });
          }
        } else {
          // User is signed out
          dispatch({ type: AUTH_ACTIONS.AUTH_ERROR });
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        dispatch({ type: AUTH_ACTIONS.AUTH_ERROR });
      }
    });

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (state.loading) {
        console.warn('Auth initialization timeout, setting to not authenticated');
        dispatch({ type: AUTH_ACTIONS.AUTH_ERROR });
      }
    }, 5000); // 5 second timeout

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  // Load user data
  const loadUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (user) {
        dispatch({
          type: AUTH_ACTIONS.USER_LOADED,
          payload: user
        });
      } else {
        dispatch({
          type: AUTH_ACTIONS.AUTH_ERROR,
          payload: 'No user found'
        });
      }
    } catch (error) {
      console.error('Load user error:', error);
      dispatch({
        type: AUTH_ACTIONS.AUTH_ERROR,
        payload: 'Authentication failed'
      });
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERRORS });
      
      const result = await authService.register(userData);
      
      if (result.success) {
        dispatch({
          type: AUTH_ACTIONS.REGISTER_SUCCESS,
          payload: {
            user: result.user,
            token: 'firebase-auth' // Firebase handles tokens internally
          }
        });
        
        if (result.needsVerification) {
          toast.info('We sent a verification link to your email. Please verify to continue.');
          return { success: true, needsVerification: true };
        }
        toast.success('Registration successful!');
        return { success: true };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const message = error.message || 'Registration failed';
      
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAIL,
        payload: message
      });
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Login user
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERRORS });
      
      const result = await authService.login(credentials.email, credentials.password);
      
      if (result.success) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: result.user,
            token: 'firebase-auth' // Firebase handles tokens internally
          }
        });
        if (!result.user.emailVerified) {
          toast.info('Please verify your email to continue.');
          return { success: true, needsVerification: true };
        }
        toast.success(`Welcome back, ${result.user.firstName}!`);
        return { success: true };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      const message = error.message || 'Login failed';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAIL,
        payload: message
      });
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      await authService.logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.info('You have been logged out successfully.');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  // Update user profile
  const updateUser = (userData) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData
    });
  };

  // Clear errors
  const clearErrors = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERRORS });
  };

  // Check if user has required role
  const hasRole = (requiredRole) => {
    if (!state.user) return false;
    
    if (requiredRole === 'admin') {
      return state.user.role === 'admin';
    }
    
    if (requiredRole === 'faculty') {
      return state.user.role === 'faculty' || state.user.role === 'admin';
    }
    
    return true; // All authenticated users can access basic routes
  };

  // Check if user can access resource
  const canAccess = (resource, action = 'read') => {
    if (!state.user) return false;
    
    // Admin can access everything
    if (state.user.role === 'admin') return true;
    
    // Define role-based permissions
    const permissions = {
      admin: ['users', 'bookings', 'parking-slots', 'reports'],
      faculty: ['own-bookings', 'parking-slots'],
      student: ['own-bookings', 'parking-slots']
    };
    
    return permissions[state.user.role]?.includes(resource) || false;
  };

  const value = {
    ...state,
    register,
    login,
    logout,
    loadUser,
  refreshEmailVerification: authService.refreshEmailVerification,
  resendVerification: authService.sendVerificationEmail,
  startEmailLinkSignIn: authService.startEmailLinkSignIn,
  completeEmailLinkSignIn: authService.completeEmailLinkSignIn,
  changeEmailWithReauth: authService.changeEmailWithReauth,
    updateUser,
    clearErrors,
    hasRole,
    canAccess
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
