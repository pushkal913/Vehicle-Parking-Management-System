// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Commented out analytics to avoid measurement ID errors
// import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAXybmt8d0OuTfg4h62E2beF1AZVWBYyHs",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "university-car-parking-system.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "university-car-parking-system",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "university-car-parking-system.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "377393001940",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:377393001940:web:69c52d40b77ce4e3165241"
  // Commented out measurementId to avoid analytics errors
  // measurementId: "G-9QK0K7MGMB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (optional) - commented out for now
// export const analytics = getAnalytics(app);

export default app;
