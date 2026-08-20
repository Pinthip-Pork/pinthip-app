(function () {
  // Device access default config
  window.__PINTHIP_DEVICE_ACCESS__ = {
    enabled: true,
    customAuthEnabled: true
  };

  // Default Firebase config — can be overridden per-environment via
  // local-admin-config.js (window.__PINTHIP_FIREBASE_CONFIG__) so secrets/keys
  // need not live in the repo. The values below are the public web config that
  // is safe to commit (Firebase security is enforced by rules + Cloud Functions).
  const defaultFirebaseConfig = {
    apiKey: 'AIzaSyBeBOyADRqJPLfGGREE8vNWBW051hQJKCo',
    authDomain: 'pinthip-checkin.firebaseapp.com',
    databaseURL: 'https://pinthip-checkin-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'pinthip-checkin',
    storageBucket: 'pinthip-checkin.firebasestorage.app',
    messagingSenderId: '281531263382',
    appId: '1:281531263382:web:282eaac91c9d64249695b7',
    measurementId: 'G-FWKZ4L2LST'
  };

  const firebaseConfig = {
    ...defaultFirebaseConfig,
    ...(window.__PINTHIP_FIREBASE_CONFIG__ || {})
  };

  // FCM Web Push certificate key (public VAPID key) — required for getToken().
  // Safe to expose publicly. Generate from Firebase Console → Cloud Messaging → Web Push Certificates.
  // Can be overridden in local-admin-config.js via window.__PINTHIP_VAPID_KEY__.
  const fcmVapidKey = String(
    window.__PINTHIP_VAPID_KEY__ ||
    'BBfcPFdeOn4iG-D316YOvX51oL6Q20t-mvIhBfQXPSwc4uzLFxUNNrRWecwA4-AlacAURywzfQDD3BsJmTGWmoc'
  );

  const defaultAdminCredentials = {
    enabled: false,
    username: 'admin',
    pin: ''
  };

  const runtimeAdminCredentials = window.__PINTHIP_ADMIN__ || {};

  // If local-admin-config.js provides credentials, merge but still require Cloud Function validation
  const adminCredentials = {
    ...defaultAdminCredentials,
    ...runtimeAdminCredentials,
    enabled: Boolean(runtimeAdminCredentials.enabled ?? false),
    username: String(runtimeAdminCredentials.username || defaultAdminCredentials.username),
    pin: String(runtimeAdminCredentials.pin || '')
  };

  const sessionSettings = {
    adminSessionTtlMinutes: 60 * 24 * 7 // 7 days — reduced from 30 days for better security
  };

  const deviceAccessPilot = {
    enabled: Boolean(window.__PINTHIP_DEVICE_ACCESS__?.enabled || runtimeAdminCredentials.deviceAccessPilotEnabled),
    customAuthEnabled: Boolean(window.__PINTHIP_DEVICE_ACCESS__?.customAuthEnabled !== false)
  };

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.config = {
    firebaseConfig,
    adminCredentials,
    sessionSettings,
    deviceAccessPilot,
    fcmVapidKey
  };
})();
