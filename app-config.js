(function () {
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
    enabled: true,
    username: 'admin',
    pin: '8888'
  };

  const runtimeAdminCredentials = window.__PINTHIP_ADMIN__ || {};
  const adminCredentials = {
    ...defaultAdminCredentials,
    ...runtimeAdminCredentials,
    enabled: Boolean(runtimeAdminCredentials.enabled ?? defaultAdminCredentials.enabled),
    username: String(runtimeAdminCredentials.username || defaultAdminCredentials.username),
    pin: String(runtimeAdminCredentials.pin || defaultAdminCredentials.pin)
  };

  const sessionSettings = {
    adminSessionTtlMinutes: 60 * 24 * 30
  };

  const deviceAccessPilot = {
    enabled: Boolean(runtimeAdminCredentials.deviceAccessPilotEnabled || false)
  };

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.config = {
    firebaseConfig,
    adminCredentials,
    sessionSettings,
    deviceAccessPilot
  };
})();
