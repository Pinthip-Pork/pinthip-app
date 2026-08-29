(function () {
  'use strict';

  var messaging = null;
  var currentDeviceId = null;
  var currentRole = null;
  var currentEmpId = null;
  var registrationPromise = null;
  var promptId = 'pushPermissionPrompt';
  var messagingSdkLoading = null;

  function loadMessagingSdk() {
    if (messagingSdkLoading) return messagingSdkLoading;
    messagingSdkLoading = new Promise(function (resolve, reject) {
      if (window.firebase && typeof firebase.messaging === 'function') {
        resolve();
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js';
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
        if (messaging && !messaging.__pinthipForegroundHandler) {
          messaging.onMessage(function (payload) {
            var data = (payload && payload.data) || {};
            var notif = (payload && payload.notification) || {};
            var title = notif.title || data.title || 'ปิ่นทิพย์ เช็กอิน';
            var body = notif.body || data.body || 'มีการแจ้งเตือนใหม่';
            if (typeof window.showNotification === 'function') {
              window.showNotification(title + ': ' + body);
            }
          });
          messaging.__pinthipForegroundHandler = true;
        }
      } catch (error) {
        console.warn('FCM init skipped:', error);
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
      var vapidKey = (window.PinThipSafe && window.PinThipSafe.config && window.PinThipSafe.config.fcmVapidKey) || null;
      // Pass the VAPID key exactly as Firebase Console provides it (base64url).
      // The Firebase Messaging compat SDK handles the conversion internally.
      var token = await fcm.getToken({
        serviceWorkerRegistration: registration,
        vapidKey: vapidKey || undefined
      });
      if (token) {
        await saveToken(token);
        removePrompt();
      }
      return Boolean(token);
    } catch (error) {
      // Silent failure — only log to console, never show alert popup.
      // Push notifications are optional; login and all features work without them.
      console.warn('Push notification setup skipped:', error.message || error);
      removePrompt();
      return false;
    }
  }

  // Lightweight init — stores device info and shows the prompt button.
  // Actual FCM SDK loading + token registration only happens on user click.
  function initPushNotifications(options) {
    options = options || {};
    currentDeviceId = String(options.deviceId || '').trim();
    currentRole = String(options.role || (isAdmin ? 'admin' : 'employee'));
    currentEmpId = String(options.empId || (currentUser && currentUser.empId) || '').trim();
    if (!currentDeviceId || !supported()) return false;

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