import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck, RefreshCw, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { user, refreshEmailVerification, resendVerification } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    const res = await refreshEmailVerification();
    setLoading(false);
    if (res?.emailVerified) {
      navigate('/dashboard');
    }
  };

  const handleResend = async () => {
    setLoading(true);
    const res = await resendVerification();
    setLoading(false);
    if (res?.success) setResent(true);
  };

  return (
    <div className="container" style={{ maxWidth: 600, margin: '40px auto' }}>
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <MailCheck />
          <h2 style={{ margin: 0 }}>Verify your email</h2>
        </div>
        <p style={{ color: '#6b7280' }}>
          We sent a verification link to <strong>{user?.email || 'your email'}</strong>.
          Please click the link, then return here and press "I Verified".
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={16} /> I Verified
          </button>
          <button className="btn btn-secondary" onClick={handleResend} disabled={loading}>
            <Send size={16} /> Resend Link
          </button>
        </div>
        {resent && <div style={{ marginTop: 12, fontSize: 12, color: '#059669' }}>Verification email resent.</div>}
      </div>
    </div>
  );
}
