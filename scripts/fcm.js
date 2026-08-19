/* global db, isAdmin, currentUser, Notification */
(function () {
  'use strict';

  var messaging = null;
  var currentDeviceId = null;
  var currentRole = null;
  var currentEmpId = null;
  var registrationPromise = null;
  var promptId = 'pushPermissionPrompt';

  function supported() {
    return Boolean(
      window.isSecureContext &&
      'serviceWorker' in navigator &&
      'Notification' in window &&
      window.firebase &&
      typeof firebase.messaging === 'function'
    );
  }

  function getServiceWorkerRegistration() {
    if (!registrationPromise) {
      registrationPromise = navigator.serviceWorker.ready;
    }
    return registrationPromise;
  }

  function getMessaging() {
    if (!messaging && supported()) {
      try {
        messaging = firebase.messaging();
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

    var fcm = getMessaging();
    if (!fcm) return false;

    try {
      var registration = await getServiceWorkerRegistration();
      var vapidKey = (window.PinThipSafe && window.PinThipSafe.config && window.PinThipSafe.config.fcmVapidKey) || null;
      var token = await fcm.getToken({
        serviceWorkerRegistration: registration,
        vapidKey: vapidKey || undefined
      });
      await saveToken(token);
      removePrompt();
      return Boolean(token);
    } catch (error) {
      console.warn('FCM token registration failed:', error);
      return false;
    }
  }

  async function initPushNotifications(options) {
    options = options || {};
    currentDeviceId = String(options.deviceId || '').trim();
    currentRole = String(options.role || (isAdmin ? 'admin' : 'employee'));
    currentEmpId = String(options.empId || (currentUser && currentUser.empId) || '').trim();
    if (!currentDeviceId) return false;

    if (!supported()) return false;

    var fcm = getMessaging();
    if (fcm && !fcm.__pinthipForegroundHandler) {
      fcm.onMessage(function (payload) {
        var data = payload && payload.data ? payload.data : {};
        var title = data.title || 'ปิ่นทิพย์ เช็กอิน';
        var body = data.body || 'มีการแจ้งเตือนใหม่';
        if (typeof window.showNotification === 'function') {
          window.showNotification(title + ': ' + body);
        } else if (Notification.permission === 'granted') {
          new Notification(title, { body: body, icon: './icon-192.png' });
        }
      });
      fcm.__pinthipForegroundHandler = true;
    }

    if (Notification.permission === 'granted') {
      return enablePushNotifications();
    }
    renderPrompt();
    return false;
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