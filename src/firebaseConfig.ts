import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Global variables that would typically be provided by an environment or build process
// For now, we use the same logic as in the original padroQuiz.tsx
const appId = typeof (globalThis as any).__app_id !== 'undefined' ? (globalThis as any).__app_id : 'default-app-id';

// Attempt to parse __firebase_config if it exists, otherwise use a default empty object or a placeholder
let firebaseConfigObj = {};
if (typeof (globalThis as any).__firebase_config !== 'undefined') {
  try {
    firebaseConfigObj = JSON.parse((globalThis as any).__firebase_config);
  } catch (e) {
    console.error("Error parsing __firebase_config:", e);
    // Fallback to a default/empty config or handle error as appropriate
    firebaseConfigObj = {
      apiKey: "YOUR_API_KEY", // Placeholder
      authDomain: "YOUR_AUTH_DOMAIN", // Placeholder
      projectId: "YOUR_PROJECT_ID", // Placeholder
      storageBucket: "YOUR_STORAGE_BUCKET", // Placeholder
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Placeholder
      appId: "YOUR_APP_ID" // Placeholder
    };
  }
} else {
    // Fallback for when __firebase_config is not defined (e.g. local development without the Canvas environment)
    console.warn("__firebase_config not found, using placeholder Firebase config. Please ensure this is configured for your environment.");
    firebaseConfigObj = {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    };
}

export const firebaseConfig = firebaseConfigObj;

export const initialAuthToken = typeof (globalThis as any).__initial_auth_token !== 'undefined' ? (globalThis as any).__initial_auth_token : null;
export const aId = appId; // Exporting appId as aId to avoid naming conflicts if imported directly

let firebaseApp: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);
} catch (error) {
  console.error("Error initializing Firebase in firebaseConfig.ts:", error);
  // Handle initialization error, perhaps by setting db and auth to null or re-throwing
  // For now, we'll let them be potentially undefined, and the app should handle this.
}

export { db, auth, firebaseApp };
