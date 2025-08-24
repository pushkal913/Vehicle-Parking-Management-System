import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mail, Lock } from 'lucide-react';

export default function AdminChangeEmail() {
  const { user, changeEmailWithReauth } = useAuth();
  const navigate = useNavigate();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await changeEmailWithReauth(password, newEmail);
    setLoading(false);
    if (res?.success) {
      setSuccess(true);
      // Redirect to verify page to complete the flow
      navigate('/verify-email');
    } else {
      setError(res?.error || 'Failed to change email');
    }
  };

  return (
    <div className="container" style={{ maxWidth: 560, margin: '40px auto' }}>
      <div className="card" style={{ padding: 24 }}>
        <h2>Change SuperAdmin Email</h2>
        <p style={{ color: '#6b7280' }}>Current: <strong>{user?.email}</strong></p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label"><Mail size={16} style={{ marginRight: 6 }} /> New Email</label>
            <input className="form-input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label"><Lock size={16} style={{ marginRight: 6 }} /> Current Password</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Updating…' : 'Update Email'}
          </button>
          {success && <div style={{ color: '#059669', marginTop: 8 }}>Email updated. Check your inbox to verify.</div>}
        </form>
      </div>
    </div>
  );
}
