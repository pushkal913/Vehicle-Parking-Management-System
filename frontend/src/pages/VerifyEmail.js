import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { user, resendVerification } = useAuth();
  const [resent, setResent] = useState(false);

  // Passive auto-detect of verification; no manual "I Verified" button
  useEffect(() => {
    let active = true;

    const check = async () => {
      try {
        if (auth.currentUser) {
          await auth.currentUser.reload();
        }
      } catch {}

      const verified = Boolean(
        auth.currentUser?.emailVerified || user?.emailVerified || sessionStorage.getItem('just_verified')
      );

      if (active && verified) {
        sessionStorage.removeItem('just_verified');
        navigate('/dashboard', { replace: true, state: { fromVerification: true } });
      }
    };

    // Initial check + short polling for a few seconds (handles email click in another tab)
    check();
    const interval = setInterval(check, 1500);
    const stop = setTimeout(() => clearInterval(interval), 8000);

    return () => {
      active = false;
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [user?.uid, user?.emailVerified, navigate]);

  const handleResend = async () => {
    const res = await resendVerification();
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
          After you click the link in your email, this page will automatically take you to your dashboard.
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleResend}>
            <Send size={16} /> Resend Link
          </button>
          <a className="btn" href="https://mail.google.com" target="_blank" rel="noreferrer">Open Gmail</a>
          <a className="btn" href="https://outlook.live.com/mail/0/inbox" target="_blank" rel="noreferrer">Open Outlook</a>
        </div>
        {resent && <div style={{ marginTop: 12, fontSize: 12, color: '#059669' }}>Verification email resent. Check spam too.</div>}
      </div>
    </div>
  );
}
