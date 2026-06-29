import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Base URL for the Express API server fallback (running locally)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? `${window.location.origin}/api` : `http://${window.location.hostname}:5001/api`);

// Optional: Paste your Firebase Web Client config details here
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let app = null;
let auth = null;
let db = null;
let isFirebaseActive = false;

// Attempt to initialize Firebase Web SDK if config placeholders have been replaced
if (
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "YOUR_API_KEY" && 
  firebaseConfig.projectId && 
  firebaseConfig.projectId !== "YOUR_PROJECT_ID"
) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    isFirebaseActive = true;
    console.log('🔥 [Firebase SDK] Successfully initialized live Firebase Client.');
  } catch (error) {
    console.error('❌ [Firebase SDK] Error initializing Firebase client:', error.message);
  }
} else {
  console.log('🚀 [Firebase SDK] Running in API Mode. Falling back to local Node.js API endpoints.');
}

export { auth, db, isFirebaseActive };
