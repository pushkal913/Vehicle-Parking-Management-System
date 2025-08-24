import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, Link2 } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, isAuthenticated, user, startEmailLinkSignIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'superadmin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (data) => {
    try {
      const result = await login(data);
      if (result?.needsVerification) {
        navigate('/verify-email');
        return;
      }
      if (result.success) {
        if (result.user?.role === 'superadmin') navigate('/admin');
        else navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '400px', margin: '80px auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Welcome Back</h1>
        <p className="page-subtitle">Sign in to your parking account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="form">
        {/* Email */}
        <div className="form-group">
          <label className="form-label">
            <Mail size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Email Address
          </label>
          <input
            type="email"
            className={`form-input ${errors.email ? 'error' : ''}`}
            placeholder="Enter your email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Please enter a valid email address'
              }
            })}
          />
          {errors.email && (
            <div className="form-error">{errors.email.message}</div>
          )}
        </div>

        {/* Password */}
        <div className="form-group">
          <label className="form-label">
            <Lock size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Enter your password"
              {...register('password', {
                required: 'Password is required'
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <div className="form-error">{errors.password.message}</div>
          )}
        </div>

  {/* Submit Button */}
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '20px' }}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </button>

        {/* Passwordless */}
        <button
          type="button"
          onClick={async () => {
            const email = document.querySelector('input[name="email"]').value;
            if (!email) return alert('Enter your email first');
            const res = await startEmailLinkSignIn(email);
            if (res?.success) navigate('/finish-signin');
          }}
          className="btn btn-secondary"
          style={{ width: '100%', marginTop: '10px' }}
        >
          <Link2 size={16} style={{ marginRight: 6 }} />
          Email me a sign-in link
        </button>

        {/* Register Link */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: '#666' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#2563eb', textDecoration: 'none' }}>
              Create one here
            </Link>
          </p>
        </div>

  {/* Demo accounts removed */}
      </form>
    </div>
  );
};

export default Login;
