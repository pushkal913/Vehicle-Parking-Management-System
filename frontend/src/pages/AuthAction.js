import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { auth } from '../config/firebase';
import { toast } from 'react-toastify';

export default function AuthAction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('Processing verification...');

  useEffect(() => {
    console.log('AuthAction component loaded');
    console.log('Current URL params:', Object.fromEntries(searchParams));
    
    const handleAuthAction = async () => {
      const mode = searchParams.get('mode');
      const actionCode = searchParams.get('oobCode');
      const continueUrl = searchParams.get('continueUrl');

      console.log('Auth action details:', { mode, actionCode: actionCode ? 'present' : 'missing', continueUrl });

      if (!mode || !actionCode) {
        setStatus('error');
        setMessage('Invalid verification link. Please request a new verification email.');
        return;
      }

      try {
        switch (mode) {
          case 'verifyEmail':
            console.log('Attempting email verification...');
            // Check if the action code is valid first
            await checkActionCode(auth, actionCode);
            console.log('Action code is valid, applying verification...');
            
            // Apply the email verification
            await applyActionCode(auth, actionCode);
            console.log('Email verification applied successfully');
            
            setStatus('success');
            setMessage('Email verified successfully! Redirecting to your dashboard...');
            
            // Show success message
            toast.success('Email verified successfully!');
            
            // Wait a moment then redirect
            setTimeout(() => {
              if (continueUrl) {
                console.log('Redirecting to continue URL:', continueUrl);
                window.location.href = continueUrl;
              } else {
                console.log('Redirecting to verify-email page');
                navigate('/verify-email');
              }
            }, 2000);
            break;

          case 'resetPassword':
            // Redirect to password reset page with the action code
            navigate(`/reset-password?oobCode=${actionCode}`);
            break;

          default:
            setStatus('error');
            setMessage('Unknown action type. Please contact support.');
        }
      } catch (error) {
        console.error('Auth action error:', error);
        setStatus('error');
        
        switch (error.code) {
          case 'auth/expired-action-code':
            setMessage('This verification link has expired. Please request a new verification email.');
            break;
          case 'auth/invalid-action-code':
            setMessage('This verification link is invalid. Please request a new verification email.');
            break;
          case 'auth/user-disabled':
            setMessage('This account has been disabled. Please contact support.');
            break;
          default:
            setMessage(`Failed to verify email: ${error.message}. Please try again or contact support.`);
        }
      }
    };

    handleAuthAction();
  }, [searchParams, navigate]);

  const handleContinue = () => {
    if (status === 'success') {
      navigate('/verify-email');
    } else {
      navigate('/login');
    }
  };

  const handleResendVerification = () => {
    navigate('/verify-email');
  };

  return (
    <div className="container" style={{ maxWidth: 600, margin: '40px auto' }}>
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <Loader size={48} className="spinning" style={{ margin: '20px auto', color: '#3498db' }} />
            <h2>Verifying your email...</h2>
            <p style={{ color: '#6b7280' }}>Please wait while we process your verification.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} style={{ margin: '20px auto', color: '#10b981' }} />
            <h2 style={{ color: '#10b981' }}>Email Verified!</h2>
            <p style={{ color: '#6b7280', marginBottom: 20 }}>{message}</p>
            <button className="btn btn-primary" onClick={handleContinue}>
              Continue to Dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} style={{ margin: '20px auto', color: '#ef4444' }} />
            <h2 style={{ color: '#ef4444' }}>Verification Failed</h2>
            <p style={{ color: '#6b7280', marginBottom: 20 }}>{message}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={handleResendVerification}>
                Request New Link
              </button>
              <button className="btn btn-secondary" onClick={handleContinue}>
                Go to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
