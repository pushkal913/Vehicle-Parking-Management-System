import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck, RefreshCw, Send, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { user, refreshEmailVerification, resendVerification } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  // Auto-check verification status when component mounts
  useEffect(() => {
    const checkInitialVerification = async () => {
      if (user?.emailVerified) {
        navigate('/dashboard');
        return;
      }
      // Auto-check verification status when user returns from email
      setCheckingVerification(true);
      const res = await refreshEmailVerification();
      setCheckingVerification(false);
      if (res?.emailVerified) {
        toast.success('Email verified successfully!');
        navigate('/dashboard');
      }
    };

    checkInitialVerification();
  }, [user, refreshEmailVerification, navigate]);

  const handleRefresh = async () => {
    setLoading(true);
    const res = await refreshEmailVerification();
    setLoading(false);
    if (res?.emailVerified) {
      toast.success('Email verified successfully!');
      navigate('/dashboard');
    } else {
      toast.warning('Email not verified yet. Please check your email and click the verification link.');
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

  if (checkingVerification) {
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
          <p>Checking verification status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 600, margin: '40px auto' }}>
      <div className="card" style={{ padding: 24 }}>
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
