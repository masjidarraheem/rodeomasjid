// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: window.ENV?.FIREBASE_API_KEY || "your-api-key",
  authDomain: window.ENV?.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: window.ENV?.FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: window.ENV?.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: window.ENV?.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: window.ENV?.FIREBASE_APP_ID || "your-app-id"
};

// Initialize Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };