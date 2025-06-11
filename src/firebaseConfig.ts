import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Read from environment variables, with fallbacks to potential global vars or placeholders
const firebaseConfigValues = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (typeof (globalThis as any).__firebase_config !== 'undefined' ? JSON.parse((globalThis as any).__firebase_config).apiKey : "YOUR_API_KEY"),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (typeof (globalThis as any).__firebase_config !== 'undefined' ? JSON.parse((globalThis as any).__firebase_config).authDomain : "YOUR_AUTH_DOMAIN"),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (typeof (globalThis as any).__firebase_config !== 'undefined' ? JSON.parse((globalThis as any).__firebase_config).projectId : "YOUR_PROJECT_ID"),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (typeof (globalThis as any).__firebase_config !== 'undefined' ? JSON.parse((globalThis as any).__firebase_config).storageBucket : "YOUR_STORAGE_BUCKET"),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (typeof (globalThis as any).__firebase_config !== 'undefined' ? JSON.parse((globalThis as any).__firebase_config).messagingSenderId : "YOUR_MESSAGING_SENDER_ID"),
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (typeof (globalThis as any).__firebase_config !== 'undefined' ? JSON.parse((globalThis as any).__firebase_config).appId : "YOUR_APP_ID")
};

// Check if any essential Firebase config values are still placeholders from .env file OR fallback
if (firebaseConfigValues.apiKey === "YOUR_API_KEY" || !firebaseConfigValues.apiKey) {
    console.warn("Firebase API Key is not configured. Please check your .env file or __firebase_config global variable. Some Firebase services may not work.");
}
if (firebaseConfigValues.projectId === "YOUR_PROJECT_ID" || !firebaseConfigValues.projectId) {
    console.warn("Firebase Project ID is not configured. Please check your .env file or __firebase_config global variable. Some Firebase services may not work.");
}


export const firebaseConfig = firebaseConfigValues;

// Use VITE_APP_ID from .env as a primary source if __app_id is not defined
export const aId = typeof (globalThis as any).__app_id !== 'undefined' ? (globalThis as any).__app_id : (import.meta.env.VITE_APP_ID || 'default-app-id');

export const initialAuthToken = typeof (globalThis as any).__initial_auth_token !== 'undefined' ? (globalThis as any).__initial_auth_token : null;

let firebaseAppInstance: FirebaseApp;
let dbInstance: Firestore;
let authInstance: Auth;

try {
  // Only initialize if essential config is present
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
    firebaseAppInstance = initializeApp(firebaseConfig);
    dbInstance = getFirestore(firebaseAppInstance);
    authInstance = getAuth(firebaseAppInstance);
  } else {
    console.error("Firebase could not be initialized due to missing core configuration (apiKey or projectId).");
    // Set instances to undefined or a state that indicates failure if your app needs to handle this
  }
} catch (error: any) {
  console.error("Error initializing Firebase in firebaseConfig.ts:", error instanceof Error ? error.message : String(error));
  // Set instances to undefined or a state that indicates failure
}

export { dbInstance as db, authInstance as auth, firebaseAppInstance as firebaseApp };
