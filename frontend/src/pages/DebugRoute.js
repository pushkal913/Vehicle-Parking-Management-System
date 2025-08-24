import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

export default function DebugRoute() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Debug Route Information</h2>
      <div style={{ background: '#f5f5f5', padding: '10px', marginBottom: '10px' }}>
        <strong>Current Path:</strong> {location.pathname}
      </div>
      <div style={{ background: '#f5f5f5', padding: '10px', marginBottom: '10px' }}>
        <strong>Search Params:</strong>
        <pre>{JSON.stringify(Object.fromEntries(searchParams), null, 2)}</pre>
      </div>
      <div style={{ background: '#f5f5f5', padding: '10px', marginBottom: '10px' }}>
        <strong>Full URL:</strong> {window.location.href}
      </div>
      <div style={{ background: '#e8f5e8', padding: '10px' }}>
        <p>If you're seeing this page, it means the routing is working but there might be an issue with the AuthAction component.</p>
        <a href="/verify-email" style={{ color: 'blue', textDecoration: 'underline' }}>
          Go to Verify Email Page
        </a>
      </div>
    </div>
  );
}
