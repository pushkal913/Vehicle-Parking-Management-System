import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Car, 
  Shield, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle,
  ArrowRight,
  Smartphone,
  CreditCard
} from 'lucide-react';
import './Home.css';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Welcome to University Parking System
          </h1>
          <p className="hero-subtitle">
            Secure, encrypted, and intelligent parking management for the modern campus
          </p>
          <div style={{display:'flex',justifyContent:'center',marginBottom:16}}>
            <img src="/assets/hero-logo-new.png" alt="University Parking Logo" style={{maxWidth: 360, width: '100%', height: 'auto'}} />
          </div>
          
          {isAuthenticated ? (
            <div className="hero-actions">
              <Link to="/dashboard" className="btn btn-primary btn-lg">
                Go to Dashboard
              </Link>
              <Link to="/parking" className="btn btn-outline btn-lg">
                View Parking Slots
              </Link>
            </div>
          ) : (
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started
                <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn btn-white btn-lg">
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why Choose Our Parking System?</h2>
            <p className="section-subtitle">
              Modern, secure, and user-friendly parking management
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={32} />
              </div>
              <h3 className="feature-title">Secure & Encrypted</h3>
              <p className="feature-description">
                AES-256 encryption protects your data with enterprise-grade security
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Clock size={32} />
              </div>
              <h3 className="feature-title">Real-Time Availability</h3>
              <p className="feature-description">
                See live parking slot availability and book instantly
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <MapPin size={32} />
              </div>
              <h3 className="feature-title">Multiple Locations</h3>
              <p className="feature-description">
                50 parking slots across 5 campus locations for your convenience
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Smartphone size={32} />
              </div>
              <h3 className="feature-title">Mobile Responsive</h3>
              <p className="feature-description">
                Access from any device - desktop, tablet, or smartphone
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Users size={32} />
              </div>
              <h3 className="feature-title">Role-Based Access</h3>
              <p className="feature-description">
                Different access levels for students, faculty, and administrators
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <CreditCard size={32} />
              </div>
              <h3 className="feature-title">Easy Management</h3>
              <p className="feature-description">
                Simple booking process with vehicle registration and history tracking
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              Get started in just a few simple steps
            </p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Register Account</h3>
              <p className="step-description">
                Create your account with university credentials as a student or faculty member
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">Add Vehicle Info</h3>
              <p className="step-description">
                Register your vehicle details for parking slot booking
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Find & Book</h3>
              <p className="step-description">
                Browse available slots and book your preferred parking spot
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">4</div>
              <h3 className="step-title">Park & Enjoy</h3>
              <p className="step-description">
                Use your booking confirmation to park securely on campus
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="container">
          <div className="benefits-content">
            <div className="benefits-text">
              <h2 className="section-title">Built for University Life</h2>
              <p className="section-subtitle">
                Designed specifically for academic institutions with security and convenience in mind
              </p>

              <div className="benefits-list">
                <div className="benefit-item">
                  <CheckCircle size={20} />
                  <span>JWT-based secure authentication</span>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={20} />
                  <span>Faculty and student role distinction</span>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={20} />
                  <span>Real-time slot availability updates</span>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={20} />
                  <span>Comprehensive booking management</span>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={20} />
                  <span>Admin control panel for management</span>
                </div>
                <div className="benefit-item">
                  <CheckCircle size={20} />
                  <span>Data encryption and privacy protection</span>
                </div>
              </div>

              {!isAuthenticated && (
                <div className="benefit-actions">
                  <Link to="/register" className="btn btn-primary">
                    Start Using Now
                  </Link>
                </div>
              )}
            </div>

            <div className="benefits-visual">
              <div className="visual-card">
                <Car size={48} />
                <h3>Smart Parking</h3>
                <p>Intelligent slot allocation and management</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
