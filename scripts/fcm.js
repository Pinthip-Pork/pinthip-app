(function () {
  'use strict';

  var messaging = null;
  var currentDeviceId = null;
  var currentRole = null;
  var currentEmpId = null;
  var registrationPromise = null;
  var promptId = 'pushPermissionPrompt';
  var messagingSdkLoading = null;

  // Convert base64url VAPID key to Uint8Array — required by PushManager.subscribe()
  // on iOS Safari and some browsers that don't accept raw base64url strings.
  function vapidKeyToUint8Array(base64urlKey) {
    if (!base64urlKey) return null;
    var base64 = String(base64urlKey).replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    try {
      var rawData = atob(base64);
      var outputArray = new Uint8Array(rawData.length);
      for (var i = 0; i < rawData.length; i++) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (e) {
      console.warn('VAPID key conversion failed:', e);
      return null;
    }
  }

  function loadMessagingSdk() {
    if (messagingSdkLoading) return messagingSdkLoading;
    messagingSdkLoading = new Promise(function (resolve, reject) {
      if (window.firebase && typeof firebase.messaging === 'function') {
        resolve();
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js';
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Failed to load firebase-messaging-compat.js')); };
      document.head.appendChild(script);
    });
    return messagingSdkLoading;
  }

  function supported() {
    return Boolean(
      window.isSecureContext &&
      'serviceWorker' in navigator &&
      'Notification' in window &&
      window.firebase
    );
  }

  function getServiceWorkerRegistration() {
    if (!registrationPromise) {
      registrationPromise = navigator.serviceWorker.ready;
    }
    return registrationPromise;
  }

  async function getMessaging() {
    if (!messaging && supported()) {
      try {
        await loadMessagingSdk();
        messaging = firebase.messaging();
        // Set up foreground message handler — shows in-app notification
        // when a push arrives while the app is open.
        if (messaging && !messaging.__pinthipForegroundHandler) {
          messaging.onMessage(function (payload) {
            var data = (payload && payload.data) || {};
            var notif = (payload && payload.notification) || {};
            var title = notif.title || data.title || 'ปิ่นทิพย์ เช็กอิน';
            var body = notif.body || data.body || 'มีการแจ้งเตือนใหม่';
            if (typeof window.showNotification === 'function') {
              window.showNotification(title + ': ' + body);
            } else if (Notification.permission === 'granted') {
              new Notification(title, { body: body, icon: './icon-192.png' });
            }
          });
          messaging.__pinthipForegroundHandler = true;
        }
      } catch (error) {
        console.warn('FCM initialization failed:', error);
      }
    }
    return messaging;
  }

  function removePrompt() {
    var prompt = document.getElementById(promptId);
    if (prompt) prompt.remove();
  }

  function renderPrompt() {
    if (!supported() || Notification.permission !== 'default' || !currentDeviceId) return;
    if (document.getElementById(promptId)) return;

    var prompt = document.createElement('button');
    prompt.id = promptId;
    prompt.type = 'button';
    prompt.textContent = '🔔 เปิดการแจ้งเตือน';
    prompt.setAttribute('aria-label', 'เปิดการแจ้งเตือน');
    prompt.style.cssText = [
      'position:fixed', 'right:14px', 'bottom:14px', 'z-index:9999',
      'border:0', 'border-radius:8px', 'padding:10px 14px',
      'background:#16a34a', 'color:#fff', 'font-weight:700',
      'box-shadow:0 2px 10px rgba(0,0,0,.2)', 'cursor:pointer'
    ].join(';');
    prompt.addEventListener('click', function () {
      enablePushNotifications().then(removePrompt);
    });
    document.body.appendChild(prompt);
  }

  async function saveToken(token) {
    if (!token || !currentDeviceId || !window.db) return;
    var updates = {
      fcmToken: token,
      fcmTokenUpdatedAt: new Date().toISOString(),
      notificationsEnabled: true
    };
    if (currentRole) updates.role = currentRole;
    if (currentEmpId) updates.empId = currentEmpId;
    await db.ref('device_access/' + currentDeviceId).update(updates);
  }

  async function enablePushNotifications() {
    if (!supported() || !currentDeviceId) return false;

    var permission = Notification.permission;
    if (permission === 'denied') {
      removePrompt();
      return false;
    }
    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      renderPrompt();
      return false;
    }

    var fcm = await getMessaging();
    if (!fcm) return false;

    try {
      var registration = await getServiceWorkerRegistration();
      console.log('FCM: Service worker registration:', registration ? registration.scope : 'none');
      var vapidKeyStr = (window.PinThipSafe && window.PinThipSafe.config && window.PinThipSafe.config.fcmVapidKey) || null;
      console.log('FCM: VAPID key (raw):', vapidKeyStr ? 'present' : 'missing');
      var vapidKeyUint8 = vapidKeyToUint8Array(vapidKeyStr);
      console.log('FCM: VAPID key (Uint8Array):', vapidKeyUint8 ? vapidKeyUint8.length + ' bytes' : 'null');
      var token = await fcm.getToken({
        serviceWorkerRegistration: registration,
        vapidKey: vapidKeyUint8 || undefined
      });
      console.log('FCM: Token received:', token ? token.substring(0, 20) + '...' : 'null');
      await saveToken(token);
      removePrompt();
      return Boolean(token);
    } catch (error) {
      console.error('FCM: Token registration failed:', error.message || error);
      // 403 PERMISSION_DENIED from Firebase Installations API means the API
      // is blocked in Firebase Console. This is a server-side config issue,
      // not a code bug. Push notifications won't work until it's enabled,
      // but login and all other features are unaffected.
      if (String(error.message || '').indexOf('403') !== -1 || String(error.message || '').indexOf('PERMISSION_DENIED') !== -1) {
        console.warn('FCM: Firebase Installations API is blocked (403). Push notifications disabled. Enable the API in Firebase Console → Project Settings → Cloud Messaging.');
        window.alert('⚠️ ไม่สามารถเปิดการแจ้งเตือนได้\n\nFirebase Installations API ถูกปิดอยู่ กรุณาเปิด API นี้ก่อน:\n\n1. ไปที่ https://console.cloud.google.com/\n2. เลือก project: pinthip-checkin\n3. ไปที่ APIs & Services → Library\n4. ค้นหา "Firebase Installations API"\n5. กด Enable\n\nหลังจากเปิดแล้ว ล็อกอินใหม่และกดปุ่มแจ้งเตือนอีกครั้ง');
      } else {
        console.warn('FCM token registration failed:', error);
        window.alert('⚠️ ไม่สามารถเปิดการแจ้งเตือนได้: ' + (error.message || error));
      }
      return false;
    }
  }

  // initPushNotifications is now lightweight — it only stores device info
  // and renders the "🔔 เปิดการแจ้งเตือน" button. The actual FCM SDK loading
  // and token registration happen only when the user clicks the button
  // (via enablePushNotifications). This prevents FCM from interfering
  // with the login flow on mobile devices.
  function initPushNotifications(options) {
    options = options || {};
    currentDeviceId = String(options.deviceId || '').trim();
    currentRole = String(options.role || (isAdmin ? 'admin' : 'employee'));
    currentEmpId = String(options.empId || (currentUser && currentUser.empId) || '').trim();
    if (!currentDeviceId || !supported()) return false;

    // If permission is already granted, register the foreground message
    // handler and get a token. Otherwise, just show the prompt button.
    if (Notification.permission === 'granted') {
      enablePushNotifications().catch(function (error) {
        console.warn('Push notification setup skipped:', error);
      });
    } else {
      renderPrompt();
    }
    return true;
  }

  function stopPushNotifications() {
    removePrompt();
    currentDeviceId = null;
    currentRole = null;
    currentEmpId = null;
  }

  window.initPushNotifications = initPushNotifications;
  window.enablePushNotifications = enablePushNotifications;
  window.stopPushNotifications = stopPushNotifications;
})();