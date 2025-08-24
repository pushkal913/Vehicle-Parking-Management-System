import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Car,
  User,
  LogOut,
  Menu,
  X,
  Home,
  Calendar,
  MapPin,
  Settings,
  Shield
} from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  const navLinkClass = (path) => {
    return `nav-link ${isActivePath(path) ? 'active' : ''}`;
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Brand */}
        <Link to="/" className="nav-brand" onClick={closeMobileMenu}>
          <Car size={24} />
          <span>University Parking</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="nav-menu">
          {isAuthenticated ? (
            <>
              <Link to={user?.role === 'superadmin' ? '/admin' : '/dashboard'} className={navLinkClass(user?.role === 'superadmin' ? '/admin' : '/dashboard')}>
                <Home size={16} />
                <span>Dashboard</span>
              </Link>
              
              <Link to="/parking" className={navLinkClass('/parking')}>
                <MapPin size={16} />
                <span>Parking</span>
              </Link>
              {(() => {
                const bookingsPath = user?.role === 'superadmin' ? '/admin/bookings' : '/bookings';
                const bookingsLabel = user?.role === 'superadmin' ? 'All Bookings' : 'My Bookings';
                return (
                  <Link to={bookingsPath} className={navLinkClass(bookingsPath)}>
                    <Calendar size={16} />
                    <span>{bookingsLabel}</span>
                  </Link>
                );
              })()}

              {/* Admin link removed for superadmin to avoid duplication with Dashboard */}

              <div className="nav-dropdown">
                <button className="nav-dropdown-toggle">
                  <User size={16} />
                  <span>{user?.firstName || 'User'}</span>
                </button>
                <div className="nav-dropdown-menu">
                  <Link to="/profile" className="nav-dropdown-item" onClick={closeMobileMenu}>
                    <Settings size={16} />
                    Profile
                  </Link>
                  <button className="nav-dropdown-item" onClick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className={navLinkClass('/login')}>
                <span>Login</span>
              </Link>
              <Link to="/register" className="btn btn-primary">
                <span>Register</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="nav-mobile-toggle" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="nav-mobile-menu">
          {isAuthenticated ? (
            <>
              <Link to={user?.role === 'superadmin' ? '/admin' : '/dashboard'} className="nav-mobile-item" onClick={closeMobileMenu}>
                <Home size={16} />
                Dashboard
              </Link>
              
              <Link to="/parking" className="nav-mobile-item" onClick={closeMobileMenu}>
                <MapPin size={16} />
                Parking
              </Link>
              {(() => {
                const bookingsPath = user?.role === 'superadmin' ? '/admin/bookings' : '/bookings';
                const bookingsLabel = user?.role === 'superadmin' ? 'All Bookings' : 'My Bookings';
                return (
                  <Link to={bookingsPath} className="nav-mobile-item" onClick={closeMobileMenu}>
                    <Calendar size={16} />
                    {bookingsLabel}
                  </Link>
                );
              })()}

              {/* Admin link removed for superadmin in mobile nav as Dashboard already points to /admin */}
              
              <Link to="/profile" className="nav-mobile-item" onClick={closeMobileMenu}>
                <Settings size={16} />
                Profile
              </Link>
              
              <button className="nav-mobile-item" onClick={handleLogout}>
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-mobile-item" onClick={closeMobileMenu}>
                Login
              </Link>
              <Link to="/register" className="nav-mobile-item" onClick={closeMobileMenu}>
                Register
              </Link>
            </>
          )}
        </div>
      )}

  {/* Styles moved to Navbar.css */}
    </nav>
  );
};

export default Navbar;
