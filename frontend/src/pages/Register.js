import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Lock, Building, CreditCard, Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser, loading, isAuthenticated } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFaculty, setIsFaculty] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm();

  const password = watch('password');

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (data) => {
    try {
      // Prepare registration data
      const registrationData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        department: data.department,
        isFaculty: isFaculty
      };

      // Add appropriate ID field based on faculty checkbox
      if (isFaculty) {
        registrationData.employeeId = data.employeeId;
      } else {
        registrationData.studentId = data.studentId;
      }

      const result = await registerUser(registrationData);

      if (result.success) {
        if (result.needsVerification) {
          navigate('/verify-sent', { replace: true });
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
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
    <div className="container" style={{ maxWidth: '500px', margin: '40px auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Create Account</h1>
        <p className="page-subtitle">Join the University Parking System</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="form">
        {/* Faculty Checkbox */}
        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={isFaculty}
              onChange={(e) => setIsFaculty(e.target.checked)}
            />
            <span>I am a Faculty Member</span>
          </label>
        </div>

        {/* Name Fields */}
        <div className="grid grid-2">
          <div className="form-group">
            <label className="form-label">
              <User size={16} style={{ display: 'inline', marginRight: '6px' }} />
              First Name
            </label>
            <input
              type="text"
              className={`form-input ${errors.firstName ? 'error' : ''}`}
              placeholder="Enter your first name"
              {...register('firstName', {
                required: 'First name is required',
                minLength: {
                  value: 2,
                  message: 'First name must be at least 2 characters'
                },
                maxLength: {
                  value: 50,
                  message: 'First name must not exceed 50 characters'
                }
              })}
            />
            {errors.firstName && (
              <div className="form-error">{errors.firstName.message}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              <User size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Last Name
            </label>
            <input
              type="text"
              className={`form-input ${errors.lastName ? 'error' : ''}`}
              placeholder="Enter your last name"
              {...register('lastName', {
                required: 'Last name is required',
                minLength: {
                  value: 2,
                  message: 'Last name must be at least 2 characters'
                },
                maxLength: {
                  value: 50,
                  message: 'Last name must not exceed 50 characters'
                }
              })}
            />
            {errors.lastName && (
              <div className="form-error">{errors.lastName.message}</div>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label">
            <Mail size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Email Address
          </label>
          <input
            type="email"
            className={`form-input ${errors.email ? 'error' : ''}`}
            placeholder="Enter your university email"
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

        {/* ID Field - Changes based on faculty checkbox */}
        <div className="form-group">
          <label className="form-label">
            <CreditCard size={16} style={{ display: 'inline', marginRight: '6px' }} />
            {isFaculty ? 'Employee ID' : 'Student ID'}
          </label>
          <input
            type="text"
            className={`form-input ${errors.employeeId || errors.studentId ? 'error' : ''}`}
            placeholder={`Enter your ${isFaculty ? 'employee' : 'student'} ID`}
            {...register(isFaculty ? 'employeeId' : 'studentId', {
              required: `${isFaculty ? 'Employee' : 'Student'} ID is required`,
              pattern: {
                value: isFaculty ? /^EMP\d{4,6}$/ : /^STU\d{6,8}$/,
                message: isFaculty 
                  ? 'Employee ID must be in format EMP followed by 4-6 digits (e.g., EMP1234)'
                  : 'Student ID must be in format STU followed by 6-8 digits (e.g., STU123456)'
              }
            })}
          />
          {(errors.employeeId || errors.studentId) && (
            <div className="form-error">
              {errors.employeeId?.message || errors.studentId?.message}
            </div>
          )}
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {isFaculty 
              ? 'Format: EMP followed by 4-6 digits (e.g., EMP1234)'
              : 'Format: STU followed by 6-8 digits (e.g., STU123456)'
            }
          </div>
        </div>

        {/* Department */}
        <div className="form-group">
          <label className="form-label">
            <Building size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Department
          </label>
          <input
            type="text"
            className={`form-input ${errors.department ? 'error' : ''}`}
            placeholder="Enter your department"
            {...register('department', {
              required: 'Department is required',
              maxLength: {
                value: 100,
                message: 'Department name must not exceed 100 characters'
              }
            })}
          />
          {errors.department && (
            <div className="form-error">{errors.department.message}</div>
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
              placeholder="Create a strong password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                  message: 'Password must contain uppercase, lowercase, number, and special character'
                }
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
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Must contain uppercase, lowercase, number, and special character
          </div>
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <label className="form-label">
            <Lock size={16} style={{ display: 'inline', marginRight: '6px' }} />
            Confirm Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              placeholder="Confirm your password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: value =>
                  value === password || 'Passwords do not match'
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirmPassword && (
            <div className="form-error">{errors.confirmPassword.message}</div>
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
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </button>

        {/* Login Link */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: '#666' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none' }}>
              Sign in here
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
};

export default Register;
