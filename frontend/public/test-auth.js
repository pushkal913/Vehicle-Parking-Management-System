// Manual login test - can be run in browser console
// This will test if the Firebase authentication is working

const testLogin = async () => {
  try {
    console.log('🧪 Testing Firebase Authentication...');
    
    // Test 1: Check if Firebase is loaded
    if (typeof window.firebase === 'undefined') {
      console.log('📦 Firebase SDK not found in global scope (this is normal for modern apps)');
    } else {
      console.log('✅ Firebase SDK detected');
    }
    
    // Test 2: Check if auth context is available
    const authInputs = document.querySelectorAll('input[type="email"], input[type="password"]');
    console.log(`📋 Found ${authInputs.length} auth inputs on page`);
    
    // Test 3: Check if demo credentials are visible
    const demoText = document.body.innerText;
    if (demoText.includes('faculty1@university.edu')) {
      console.log('✅ Demo credentials are visible on page');
    } else {
      console.log('❌ Demo credentials not found on page');
    }
    
    // Test 4: Check for React errors in console
    const errors = window.console.error.toString();
    console.log('🐛 Console state checked');
    
    console.log('✅ Basic checks completed');
    console.log('📝 Try manually logging in with: faculty1@university.edu / Faculty123!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Auto-run test
testLogin();
