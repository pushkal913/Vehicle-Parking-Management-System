import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

export default function TestVerification() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔧 Verification Test Page</h1>
      
      <div style={{ background: '#f0f8ff', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
        <h3>Current Location:</h3>
        <p><strong>Pathname:</strong> {location.pathname}</p>
        <p><strong>Search:</strong> {location.search}</p>
        <p><strong>Full URL:</strong> {window.location.href}</p>
      </div>

      <div style={{ background: '#f0fff0', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
        <h3>URL Parameters:</h3>
        <pre>{JSON.stringify(Object.fromEntries(searchParams), null, 2)}</pre>
      </div>

      <div style={{ background: '#fff5f5', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
        <h3>Expected Parameters for Verification:</h3>
        <ul>
          <li><strong>mode:</strong> verifyEmail</li>
          <li><strong>oobCode:</strong> (verification code)</li>
          <li><strong>apiKey:</strong> (Firebase API key)</li>
        </ul>
      </div>

      {searchParams.get('mode') === 'verifyEmail' && searchParams.get('oobCode') && (
        <div style={{ background: '#f0f8f0', padding: '15px', margin: '10px 0', borderRadius: '5px' }}>
          <h3>✅ Verification Parameters Detected!</h3>
          <p>This means the routing is working. The verification should process automatically.</p>
          <a href="/verify-email" style={{ color: 'blue', textDecoration: 'underline' }}>
            Go to Real Verification Page
          </a>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{ marginRight: '10px', color: 'blue', textDecoration: 'underline' }}>
          Home
        </a>
        <a href="/verify-email" style={{ marginRight: '10px', color: 'blue', textDecoration: 'underline' }}>
          Verify Email
        </a>
        <a href="/login" style={{ color: 'blue', textDecoration: 'underline' }}>
          Login
        </a>
      </div>
    </div>
  );
}
