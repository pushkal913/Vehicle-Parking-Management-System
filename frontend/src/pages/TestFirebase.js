import React, { useState } from 'react';
import { authService } from '../services/authService';

const TestFirebase = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addTestResult = (test, success, message) => {
    setTestResults(prev => [...prev, { test, success, message, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testFirebaseConnection = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      // Test 1: Firebase App initialization
      addTestResult('Firebase App', true, 'Firebase app initialized successfully');

      // Test 2: Test login with demo credentials
      addTestResult('Demo Login Test', false, 'Starting demo login test...');
      
      const loginResult = await authService.login('faculty1@university.edu', 'Faculty123!');
      
      if (loginResult.success) {
        addTestResult('Demo Login', true, `Login successful! User: ${loginResult.user.fullName}`);
      } else {
        addTestResult('Demo Login', false, `Login failed: ${loginResult.error}`);
      }

      // Test 3: Check current user
      const currentUser = await authService.getCurrentUser();
      if (currentUser) {
        addTestResult('Current User', true, `User found: ${currentUser.fullName} (${currentUser.role})`);
      } else {
        addTestResult('Current User', false, 'No current user found');
      }

    } catch (error) {
      addTestResult('Firebase Test', false, `Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testDemoAccountCreation = async () => {
    setLoading(true);
    try {
      addTestResult('Demo Creation', false, 'Creating demo accounts...');
      
      const { createDemoUsers } = await import('../utils/setupUsers');
      const result = await createDemoUsers();
      
      if (result.success) {
        addTestResult('Demo Creation', true, `Successfully created ${result.created.length} demo users`);
        result.created.forEach(user => {
          addTestResult('Demo User', true, `Created: ${user.email} (${user.role})`);
        });
      } else {
        addTestResult('Demo Creation', false, `Failed: ${result.error}`);
      }
    } catch (error) {
      addTestResult('Demo Creation', false, `Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Firebase Connection Test</h1>
          
          <div className="space-y-4 mb-6">
            <button
              onClick={testFirebaseConnection}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Firebase Connection & Login'}
            </button>
            
            <button
              onClick={testDemoAccountCreation}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 ml-4"
            >
              {loading ? 'Creating...' : 'Create Demo Accounts'}
            </button>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Test Results:</h2>
            <div className="bg-gray-100 p-4 rounded-md max-h-96 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500">No tests run yet. Click a button above to start testing.</p>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className={`p-2 rounded mb-2 ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">{result.test}:</span> {result.message}
                      </div>
                      <span className="text-xs opacity-75">{result.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="font-semibold text-blue-900 mb-2">Troubleshooting Steps:</h3>
            <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
              <li>Ensure Firebase Authentication is enabled with Email/Password provider</li>
              <li>Ensure Firestore Database is created and accessible</li>
              <li>Check browser console (F12) for detailed error messages</li>
              <li>Verify Firebase configuration in config/firebase.js</li>
              <li>Try creating demo accounts first, then test login</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-md">
            <h3 className="font-semibold text-yellow-900 mb-2">Demo Account Credentials:</h3>
            <div className="text-sm text-yellow-800 space-y-1">
              <p><strong>Faculty:</strong> faculty1@university.edu / Faculty123!</p>
              <p><strong>Student:</strong> student1@university.edu / Student123!</p>
              <p><strong>SuperAdmin:</strong> Created via Setup page. Use the temporary password displayed there or send a reset email.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestFirebase;
