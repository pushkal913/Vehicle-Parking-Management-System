import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MailCheck, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function VerifySent() {
  const navigate = useNavigate();
  const { user, resendVerification } = useAuth();
  const [resent, setResent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

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
          After you click the link in your email, return and log in to access your dashboard.
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
          <a className="btn" href="/#/login">Use Hash Login</a>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
          Tip: mark the message as "Not spam" so future emails land in your inbox.
        </div>
      </div>
    </div>
  );
}
