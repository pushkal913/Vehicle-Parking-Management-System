import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck, RefreshCw, Send, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { toast } from 'react-toastify';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshEmailVerification, resendVerification } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [processingFromEmail, setProcessingFromEmail] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('VerifyEmail component mounted');
    console.log('Current URL:', window.location.href);
    console.log('Search params:', Object.fromEntries(searchParams));
    console.log('User:', user);
  }, []);

  // Check if we have verification parameters from email link
  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');
    
    console.log('Checking for verification params:', { mode, oobCode: oobCode ? 'present' : 'missing' });
    
    if (mode === 'verifyEmail' && oobCode) {
      console.log('Processing email verification from URL parameters');
      setProcessingFromEmail(true);
      handleEmailVerification(oobCode);
    }
  }, [searchParams]);

  // Handle email verification from URL parameters
  const handleEmailVerification = async (actionCode) => {
    try {
      console.log('Applying email verification code...');
      await checkActionCode(auth, actionCode);
      await applyActionCode(auth, actionCode);
      
      // Reload user to get updated verification status
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }
      
      console.log('Email verification successful, redirecting to dashboard');
      
      // Clear URL parameters and redirect immediately (no toast here, let dashboard handle success message)
      navigate('/dashboard', { replace: true });
      
    } catch (error) {
      console.error('Email verification error:', error);
      setProcessingFromEmail(false);
      
      switch (error.code) {
        case 'auth/expired-action-code':
          toast.error('This verification link has expired. Please request a new one.');
          break;
        case 'auth/invalid-action-code':
          toast.error('This verification link is invalid. Please request a new one.');
          break;
        default:
          toast.error('Failed to verify email. Please try again.');
      }
    }
  };

  // Auto-check verification status when component mounts (only once)
  useEffect(() => {
    const checkInitialVerification = async () => {
      // Don't auto-check if we're processing from email
      if (processingFromEmail) {
        return;
      }
      
      // If user is already verified, navigate immediately
      if (user?.emailVerified) {
        console.log('User already verified, navigating to dashboard');
        navigate('/dashboard', { 
          state: { fromVerification: true },
          replace: true 
        });
        return;
      }
      
      // Silent check - no toast message on initial load
      console.log('Checking verification status silently...');
      setCheckingVerification(true);
      
      try {
        const res = await refreshEmailVerification();
        if (res?.emailVerified) {
          console.log('Verification confirmed, navigating to dashboard');
          navigate('/dashboard', { 
            state: { fromVerification: true },
            replace: true 
          });
        } else {
          console.log('Email not verified yet, showing verification page');
        }
      } catch (error) {
        console.error('Error checking verification:', error);
      } finally {
        setCheckingVerification(false);
      }
    };

    // Only run once when component mounts and user is available
    if (user && !processingFromEmail) {
      checkInitialVerification();
    }
  }, [user?.uid, processingFromEmail]); // Include processingFromEmail in dependencies

  const handleRefresh = async () => {
    setLoading(true);
    
    try {
      // Force reload the Firebase user first
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }
      
      // Then check our verification status
      const res = await refreshEmailVerification();
      
      if (res?.emailVerified || auth.currentUser?.emailVerified) {
        // Navigate directly without toast - let Dashboard show welcome message
        navigate('/dashboard', { 
          state: { fromVerification: true },
          replace: true 
        });
      } else {
        toast.warning('Email not verified yet. Please check your email and click the verification link first.');
      }
    } catch (error) {
      console.error('Verification check error:', error);
      toast.error('Error checking verification status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    const res = await resendVerification();
    setLoading(false);
    if (res?.success) {
      setResent(true);
      toast.success('Verification email resent. Please check your inbox (and spam folder).');
    } else {
      toast.error('Failed to resend verification email. Please try again.');
    }
  };

  if (checkingVerification || processingFromEmail) {
    // Add timeout to prevent infinite loading
    setTimeout(() => {
      if (checkingVerification) {
        console.log('Timeout reached, stopping verification check');
        setCheckingVerification(false);
      }
    }, 10000); // 10 second timeout

    return (
      <div className="container" style={{ maxWidth: 600, margin: '40px auto' }}>
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <div className="loading-spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 2s linear infinite',
            margin: '20px auto'
          }}></div>
          <p>
            {processingFromEmail ? 'Verifying your email...' : 'Checking verification status...'}
          </p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            If this takes too long, please refresh the page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 600, margin: '40px auto' }}>
      <div className="card" style={{ padding: 24 }}>
        {/* Debug info - remove this later */}
        <div style={{ 
          background: '#f0f8ff', 
          padding: '10px', 
          marginBottom: '20px', 
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <strong>Debug Info:</strong><br/>
          Current URL: {window.location.href}<br/>
          Mode: {searchParams.get('mode')}<br/>
          Has oobCode: {searchParams.get('oobCode') ? 'Yes' : 'No'}<br/>
          User Email: {user?.email || 'None'}<br/>
          Email Verified: {user?.emailVerified ? 'Yes' : 'No'}<br/>
          Processing from Email: {processingFromEmail ? 'Yes' : 'No'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <MailCheck />
          <h2 style={{ margin: 0 }}>Verify your email</h2>
        </div>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>
          We sent a verification link to <strong>{user?.email || 'your email'}</strong>.
        </p>
        <div style={{ 
          backgroundColor: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '16px' 
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>Instructions:</h4>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#6b7280' }}>
            <li>Check your email inbox (and spam folder)</li>
            <li>Click the verification link in the email</li>
            <li>Return here and click "I Verified" button</li>
          </ol>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleRefresh} disabled={loading}>
            {loading ? <RefreshCw size={16} className="spinning" /> : <CheckCircle size={16} />} 
            I Verified
          </button>
          <button className="btn btn-secondary" onClick={handleResend} disabled={loading}>
            <Send size={16} /> Resend Link
          </button>
        </div>
        {resent && (
          <div style={{ 
            marginTop: 12, 
            fontSize: 14, 
            color: '#059669',
            backgroundColor: '#d1fae5',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #a7f3d0'
          }}>
            ✅ Verification email resent. Please check your inbox and spam folder.
          </div>
        )}
      </div>
    </div>
  );
}
