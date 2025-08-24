import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function FinishSignIn() {
  const navigate = useNavigate();
  const { completeEmailLinkSignIn, loadUser } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await completeEmailLinkSignIn(window.location.href);
      if (res?.success) {
        await loadUser();
        navigate('/dashboard', { replace: true });
      } else {
        setError(res?.error || 'Failed to complete sign-in.');
      }
    })();
  }, [completeEmailLinkSignIn, loadUser, navigate]);

  return (
    <div className="container" style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center' }}>
      {!error ? (
        <>
          <Loader2 className="spin" />
          <p>Completing sign-in…</p>
        </>
      ) : (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ color: '#b91c1c' }}>Error</h3>
          <p style={{ color: '#6b7280' }}>{error}</p>
        </div>
      )}
    </div>
  );
}
