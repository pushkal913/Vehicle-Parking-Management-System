import React, { useState } from 'react';
import { createInitialSuperAdmin, createDemoUsers, sendSuperAdminPasswordReset, createSecondSuperAdmin } from '../utils/setupUsers';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../services/roleService';

const SetupPage = () => {
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [results, setResults] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [secondAdminPassword, setSecondAdminPassword] = useState('');
  const { user } = useAuth();
  
  // Only show setup page if no user is logged in or if user is superadmin
  const canAccess = !user || user.role === ROLES.SUPERADMIN;
  
  const handleCreateSuperAdmin = async () => {
    setLoading(true);
    try {
      const result = await createInitialSuperAdmin();
      setResults(result);
      if (result.success) {
        setSetupComplete(true);
        if (result.generatedPassword) setGeneratedPassword(result.generatedPassword);
      }
    } catch (error) {
      setResults({ success: false, error: error.message });
    }
    setLoading(false);
  };
  
  const handleCreateDemoUsers = async () => {
    setLoading(true);
    try {
      const demoResults = await createDemoUsers();
      setResults({ success: true, demoResults });
    } catch (error) {
      setResults({ success: false, error: error.message });
    }
    setLoading(false);
  };

  const handleCreateSecondSuperAdmin = async () => {
    setLoading(true);
    try {
      const res = await createSecondSuperAdmin();
      setResults({ secondAdmin: res, success: res.success });
      if (res.success && res.generatedPassword) setSecondAdminPassword(res.generatedPassword);
    } catch (error) {
      setResults({ success: false, error: error.message });
    }
    setLoading(false);
  };
  
  if (!canAccess) {
    return (
      <div className="setup-page">
        <h2>Access Denied</h2>
        <p>You don't have permission to access the setup page.</p>
      </div>
    );
  }
  
  return (
    <div className="setup-page" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>🔧 University Parking System Setup</h1>
      
      <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
        <h3>Initial Setup Instructions</h3>
        <ol>
          <li>Create SuperAdmin account (do this first)</li>
          <li>Enable Authentication in Firebase Console</li>
          <li>Create Firestore Database in Firebase Console</li>
          <li>Optionally create demo users for testing</li>
        </ol>
      </div>
      
  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button
          onClick={handleCreateSuperAdmin}
          disabled={loading || setupComplete}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: setupComplete ? '#10b981' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating...' : setupComplete ? '✅ SuperAdmin Created' : 'Create SuperAdmin'}
        </button>
        
        <button
          onClick={handleCreateDemoUsers}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating...' : 'Create Demo Users'}
        </button>

        <button
          onClick={handleCreateSecondSuperAdmin}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating...' : 'Create Ultra SuperAdmin'}
        </button>
      </div>
      
      {results && (
        <div style={{
          padding: '1rem',
          backgroundColor: results.success ? '#dcfce7' : '#fee2e2',
          borderRadius: '6px',
          marginTop: '1rem'
        }}>
          <h4>{results.success ? '✅ Success!' : '❌ Error'}</h4>
          
          {results.success && !results.demoResults && (
            <div>
              <p><strong>SuperAdmin Account Created:</strong></p>
              <ul>
                <li><strong>Email:</strong> superadmin@university.edu</li>
                {generatedPassword && (
                  <li><strong>Temporary Password:</strong> <code>{generatedPassword}</code></li>
                )}
                <li><strong>Role:</strong> SuperAdmin (Full System Access)</li>
              </ul>
              <p style={{ color: '#dc2626', fontWeight: 'bold' }}>
                ⚠️ Please save these credentials and change the password after first login!
              </p>
              <button
                onClick={async () => {
                  const r = await sendSuperAdminPasswordReset();
                  alert(r.success ? 'Password reset email sent to superadmin@university.edu' : `Failed to send reset email: ${r.error}`);
                }}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginTop: '0.5rem'
                }}
              >
                Send Password Reset Email
              </button>
            </div>
          )}
          
          {results.demoResults && (
            <div>
              <p><strong>Demo Users Created:</strong></p>
              <ul>
                {results.demoResults.map((result, index) => (
                  <li key={index} style={{ color: result.success ? '#059669' : '#dc2626' }}>
                    {result.email} - {result.success ? `✅ ${result.role}` : `❌ ${result.error}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.secondAdmin && (
            <div>
              <p><strong>Ultra SuperAdmin Created:</strong></p>
              {results.secondAdmin.success ? (
                <ul>
                  <li><strong>Name:</strong> Ultra SuperAdmin</li>
                  <li><strong>Email:</strong> vrinda914@gmail.com</li>
                  {secondAdminPassword && (
                    <li><strong>Temporary Password:</strong> <code>{secondAdminPassword}</code></li>
                  )}
                  <li><strong>Role:</strong> SuperAdmin</li>
                </ul>
              ) : (
                <p style={{ color: '#dc2626' }}><strong>Error:</strong> {results.secondAdmin.error}</p>
              )}
            </div>
          )}
          
          {!results.success && (
            <p style={{ color: '#dc2626' }}><strong>Error:</strong> {results.error}</p>
          )}
        </div>
      )}
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
        <h4>🔐 Role System</h4>
        <ul>
          <li><strong>SuperAdmin:</strong> Full system access - can manage all users, parking slots, bookings, and system settings</li>
          <li><strong>Standard Users:</strong> Faculty and Students - can book parking, view own bookings, manage profile</li>
        </ul>
        <p><strong>Note:</strong> All registered users (both faculty and students) get standard access. Only SuperAdmin can manage the system.</p>
      </div>
      
      {setupComplete && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a 
            href="/login" 
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#059669',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              display: 'inline-block'
            }}
          >
            Go to Login →
          </a>
        </div>
      )}
    </div>
  );
};

export default SetupPage;
