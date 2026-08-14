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

  const adminCredentials = {
    enabled: true,
    username: 'admin',
    pin: '8888'
  };

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.config = {
    firebaseConfig,
    adminCredentials
  };
})();
