import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
import { onIdTokenChanged } from 'firebase/auth';

export default function VerifySent() {
  const navigate = useNavigate();
  const { user, resendVerification } = useAuth();
  const [resent, setResent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [waiting, setWaiting] = React.useState(true);

  // Auto-detect verification and redirect to dashboard
  React.useEffect(() => {
    let active = true;

    const check = async () => {
      try { if (auth.currentUser) await auth.currentUser.reload(); } catch {}
      const verified = Boolean(
        auth.currentUser?.emailVerified || user?.emailVerified || sessionStorage.getItem('just_verified')
      );
      if (active && verified) {
        sessionStorage.removeItem('just_verified');
        navigate('/dashboard', { replace: true, state: { fromVerification: true } });
      }
    };

    check();
    const interval = setInterval(check, 2000);
    const stop = setTimeout(() => { clearInterval(interval); if (active) setWaiting(false); }, 60000);

    const unsub = onIdTokenChanged(auth, async (fbUser) => {
      if (!fbUser) return;
      try { await fbUser.reload(); } catch {}
      if (fbUser.emailVerified) {
        sessionStorage.removeItem('just_verified');
        navigate('/dashboard', { replace: true, state: { fromVerification: true } });
      }
    });

    return () => { active = false; clearInterval(interval); clearTimeout(stop); try { unsub(); } catch {} };
  }, [navigate, user?.uid, user?.emailVerified]);

  const handleResend = async () => {
    setLoading(true);
    const res = await resendVerification();
    setLoading(false);
    if (res?.success) setResent(true);
  };

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 720, maxWidth: '92%', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <MailCheck />
          <h2 style={{ margin: 0 }}>Verify your email</h2>
        </div>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>
          We sent a verification link to <strong>{user?.email || 'your email'}</strong>.
          After you click the link in your email, this page will automatically take you to your dashboard once verification is detected.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={handleResend} disabled={loading}>
            <Send size={16} /> Resend Link
          </button>
          <a className="btn" href="https://mail.google.com" target="_blank" rel="noreferrer">Open Gmail</a>
          <a className="btn" href="https://outlook.live.com/mail/0/inbox" target="_blank" rel="noreferrer">Open Outlook</a>
          <a className="btn" href="https://mail.yahoo.com" target="_blank" rel="noreferrer">Open Yahoo</a>
          <a className="btn" href="https://www.icloud.com/mail" target="_blank" rel="noreferrer">iCloud Mail</a>
          <a className="btn" href="https://mail.proton.me/u/0/inbox" target="_blank" rel="noreferrer">Proton</a>
        </div>

        {resent && (
          <div style={{ marginTop: 12, fontSize: 12, color: '#059669' }}>
            Verification email resent. Check your spam folder if you don't see it.
          </div>
        )}

        <hr style={{ margin: '20px 0', borderColor: '#eee' }} />

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>Go to Login</button>
          {waiting && <span style={{ fontSize: 12, color: '#6b7280' }}>Waiting for verification...</span>}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
          Tip: mark the message as "Not spam" so future emails land in your inbox.
        </div>
      </div>
    </div>
  );
}
