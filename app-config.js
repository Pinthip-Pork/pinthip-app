(function () {
  // Device access default config
  window.__PINTHIP_DEVICE_ACCESS__ = {
    enabled: true,
    customAuthEnabled: true
  };

  const firebaseConfig = {
    apiKey: 'AIzaSyBeBOyADRqJPLfGGREE8vNWBW051hQJKCo',
    authDomain: 'pinthip-checkin.firebaseapp.com',
    databaseURL: 'https://pinthip-checkin-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'pinthip-checkin',
    storageBucket: 'pinthip-checkin.firebasestorage.app',
    messagingSenderId: '281531263382',
    appId: '1:281531263382:web:282eaac91c9d64249695b7',
    measurementId: 'G-FWKZ4L2LST'
  };

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
    adminSessionTtlMinutes: 60 * 8
  };

  const deviceAccessPilot = {
    enabled: Boolean(window.__PINTHIP_DEVICE_ACCESS__?.enabled || runtimeAdminCredentials.deviceAccessPilotEnabled || true),
    customAuthEnabled: Boolean(window.__PINTHIP_DEVICE_ACCESS__?.customAuthEnabled !== false)
  };

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.config = {
    firebaseConfig,
    adminCredentials,
    sessionSettings,
    deviceAccessPilot
  };
})();
