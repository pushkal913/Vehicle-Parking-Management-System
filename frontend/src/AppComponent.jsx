import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles.css';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ParkingSlots from './pages/ParkingSlots';
import Bookings from './pages/Bookings';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBookings from './pages/admin/AdminBookings';
import AdminReports from './pages/admin/AdminReports';
import AdminPayments from './pages/admin/AdminPayments';
import AdminVehicles from './pages/admin/AdminVehicles';
import AdminChangeEmail from './pages/admin/AdminChangeEmail';
import SetupPage from './pages/SetupPage';
import TestFirebase from './pages/TestFirebase';
import NewBooking from './pages/NewBooking';
import VerifyEmail from './pages/VerifyEmail';
import FinishSignIn from './pages/FinishSignIn';

// Styles
import './App.css';

// Loading component
const LoadingScreen = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
    flexDirection: 'column'
  }}>
    <div 
      className="loading-spinner"
      style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 2s linear infinite'
      }}
    ></div>
    <p style={{ marginTop: '20px', color: '#666' }}>Initializing...</p>
  </div>
);

// Helper to ensure a component is renderable; unwraps ESM default and logs details if not
const ensureComponent = (OriginalComp, name) => {
  // Unwrap default if a module namespace object was passed
  let Comp = OriginalComp && typeof OriginalComp === 'object' && OriginalComp.default
    ? OriginalComp.default
    : OriginalComp;
  const isRenderable =
    typeof Comp === 'function' ||
    (Comp && typeof Comp === 'object' && (Comp.$$typeof || Comp.render));

  if (!isRenderable && process.env.NODE_ENV === 'development') {
    try {
      // eslint-disable-next-line no-console
      console.error(`[Invalid Component] ${name} is not a valid React component.`, {
        receivedType: typeof OriginalComp,
        keys: OriginalComp ? Object.keys(OriginalComp) : null,
      });
    } catch {}
  }
  // Return a fallback component to avoid crashing the whole tree
  return isRenderable
    ? Comp
    : () => (
        <div style={{ padding: 16, color: '#b91c1c', background: '#fee2e2', borderRadius: 6 }}>
          <strong>Component failed to load:</strong> {name}
        </div>
      );
};

// Main App Content Component
const AppContent = () => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // Wrap all imported components so the app doesn't crash if any import is invalid
  const SafeNavbar = ensureComponent(Navbar, 'Navbar');
  const SafeProtectedRoute = ensureComponent(ProtectedRoute, 'ProtectedRoute');

  const SafeHome = ensureComponent(Home, 'Home');
  const SafeLogin = ensureComponent(Login, 'Login');
  const SafeRegister = ensureComponent(Register, 'Register');
  const SafeDashboard = ensureComponent(Dashboard, 'Dashboard');
  const SafeParkingSlots = ensureComponent(ParkingSlots, 'ParkingSlots');
  const SafeBookings = ensureComponent(Bookings, 'Bookings');
  const SafeProfile = ensureComponent(Profile, 'Profile');
  const SafeAdminDashboard = ensureComponent(AdminDashboard, 'AdminDashboard');
  const SafeAdminUsers = ensureComponent(AdminUsers, 'AdminUsers');
  const SafeAdminBookings = ensureComponent(AdminBookings, 'AdminBookings');
  const SafeAdminReports = ensureComponent(AdminReports, 'AdminReports');
  const SafeAdminVehicles = ensureComponent(AdminVehicles, 'AdminVehicles');
  const SafeAdminChangeEmail = ensureComponent(AdminChangeEmail, 'AdminChangeEmail');
  const SafeSetupPage = ensureComponent(SetupPage, 'SetupPage');
  const SafeTestFirebase = ensureComponent(TestFirebase, 'TestFirebase');
  const SafeVerifyEmail = ensureComponent(VerifyEmail, 'VerifyEmail');
  const SafeFinishSignIn = ensureComponent(FinishSignIn, 'FinishSignIn');

  return (
    <div className="App">
      <SafeNavbar />
      <main className="main-content">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<SafeHome />} />
          <Route path="/login" element={<SafeLogin />} />
          <Route path="/register" element={<SafeRegister />} />
          <Route path="/setup" element={<SafeSetupPage />} />
          <Route path="/test-firebase" element={<SafeTestFirebase />} />
          <Route path="/verify-email" element={<SafeVerifyEmail />} />
          <Route path="/finish-signin" element={<SafeFinishSignIn />} />
          <Route path="/bookings/new" element={
            <SafeProtectedRoute>
              <NewBooking />
            </SafeProtectedRoute>
          } />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <SafeProtectedRoute>
              <SafeDashboard />
            </SafeProtectedRoute>
          } />
          
          <Route path="/parking" element={
            <SafeProtectedRoute>
              <SafeParkingSlots />
            </SafeProtectedRoute>
          } />
          
          <Route path="/bookings" element={
            <SafeProtectedRoute>
              <SafeBookings />
            </SafeProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <SafeProtectedRoute>
              <SafeProfile />
            </SafeProtectedRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin" element={
            <SafeProtectedRoute requiredRole="superadmin">
              <SafeAdminDashboard />
            </SafeProtectedRoute>
          } />
          <Route path="/admin/parking-slots" element={
            <SafeProtectedRoute requiredRole="superadmin">
              <SafeParkingSlots />
            </SafeProtectedRoute>
          } />
          
          <Route path="/admin/users" element={
            <SafeProtectedRoute requiredRole="superadmin">
              <SafeAdminUsers />
            </SafeProtectedRoute>
          } />
          
          <Route path="/admin/bookings" element={
            <SafeProtectedRoute requiredRole="superadmin">
              <SafeAdminBookings />
            </SafeProtectedRoute>
          } />
          
          <Route path="/admin/payments" element={
            <SafeProtectedRoute requiredRole="superadmin">
              <AdminPayments />
            </SafeProtectedRoute>
          } />
          
          <Route path="/admin/reports" element={
            <SafeProtectedRoute requiredRole="superadmin">
              <SafeAdminReports />
            </SafeProtectedRoute>
          } />
          <Route path="/admin/vehicles" element={
            <SafeProtectedRoute requiredRole="superadmin">
              <SafeAdminVehicles />
            </SafeProtectedRoute>
          } />
          <Route path="/admin/change-email" element={
            <SafeProtectedRoute requiredRole="superadmin">
              <SafeAdminChangeEmail />
            </SafeProtectedRoute>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default function AppComponent() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
