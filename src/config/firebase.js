/**
 * Firebase Configuration Module
 * Loads Firebase config from environment variables
 * 
 * IMPORTANT: Never hardcode credentials in this file!
 * All credentials should come from .env.local file
 */

// Load environment variables
function getEnvVariable(key, defaultValue = null) {
  // Try to get from window object (set by index.html before loading scripts)
  if (window.__ENV__ && window.__ENV__[key]) {
    return window.__ENV__[key];
  }

  // Try to get from localStorage (for cached config)
  const cached = localStorage.getItem(`env_${key}`);
  if (cached) {
    return cached;
  }

  // Return default or throw error
  if (defaultValue === null) {
    console.warn(`Environment variable ${key} not found and no default provided`);
  }
  return defaultValue;
}

// Firebase Configuration
export const firebaseConfig = {
  apiKey: getEnvVariable('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVariable('VITE_FIREBASE_AUTH_DOMAIN'),
  databaseURL: getEnvVariable('VITE_FIREBASE_DATABASE_URL'),
  projectId: getEnvVariable('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVariable('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVariable('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVariable('VITE_FIREBASE_APP_ID'),
  measurementId: getEnvVariable('VITE_FIREBASE_MEASUREMENT_ID', null)
};

// Validate Firebase config
export function validateFirebaseConfig() {
  const requiredKeys = [
    'apiKey',
    'authDomain',
    'databaseURL',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

  if (missingKeys.length > 0) {
    console.error('Missing Firebase configuration:', missingKeys);
    return false;
  }

  return true;
}

// Admin Configuration
export const adminConfig = {
  // In production, this should be validated via backend
  // DO NOT store actual password here
  defaultPin: getEnvVariable('VITE_ADMIN_PASSWORD', '8888')
};

/**
 * NOTE: For Production Deployment
 * 
 * 1. Move Firebase initialization to backend
 * 2. Implement proper authentication (OAuth, JWT, etc)
 * 3. Use Cloud Functions for secure operations
 * 4. Never expose API keys in frontend code
 * 5. Implement proper authorization rules in Firestore/Realtime DB
 */

export default {
  firebase: firebaseConfig,
  admin: adminConfig,
  validate: validateFirebaseConfig
};
