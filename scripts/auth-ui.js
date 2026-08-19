/**
 * auth-ui.js — Login flow, session restore, handleLogin
 * Extracted from index.html inline script
 * Dependencies: app-globals.js, notification.js, device-access.js
 */

// ===== Login UI =====
function validateUsernameLength(input) {
  var val = input.value;
  if (val.toLowerCase().startsWith('a')) {
    if (val.length > 5) input.value = val.substring(0, 5);
  } else {
    if (val.length > 4) input.value = val.substring(0, 4);
  }
}

async function handleLogin() {
  var t = i18n[currentLang];
  var inputId = document.getElementById('loginId').value.trim();
  var inputPin = document.getElementById('loginPin').value.trim();

  if (!inputId || !inputPin) {
    setStatusText('status', t.emptyInputErr);
    return;
  }

  setStatusText('status', t.checking);

  // Admin login attempt via Cloud Function + Firebase Auth
  try {
    var deviceId = window.PinThipSafe.utils.getDeviceId();
    var adminCallable = firebase.functions().httpsCallable('adminLogin');
    var adminResult = await adminCallable({
      username: inputId,
      pin: inputPin,
      deviceId: deviceId,
      deviceInfo: window.PinThipSafe.utils.getDeviceInfo(),
      setup: window.__PINTHIP_ADMIN__ ? {
        username: String(window.__PINTHIP_ADMIN__.username || 'admin'),
        pin: String(window.__PINTHIP_ADMIN__.pin || inputPin)
      } : undefined
    });
    await firebase.auth().signInWithCustomToken(adminResult.data.token);

    setStatusText('status', '');
    var sessionState = PinThipSafe.session.setAdminSession({
      username: inputId,
      sessionToken: adminResult.data.sessionToken
    });
    isAdmin = sessionState.isAdmin;
    window.isAdmin = isAdmin;
    currentUser = sessionState.currentUser;
    window.currentUser = currentUser;
    if (typeof showNotificationSoundControl === 'function') showNotificationSoundControl(true);
    if (typeof enableNotificationSound === 'function') enableNotificationSound();
    if (typeof startDevicePresence === 'function') {
      startDevicePresence('admin-' + deviceId, 'Admin', 'admin');
    }
    if (typeof startDeviceAccessGuard === 'function') startDeviceAccessGuard();
    if (typeof showAdminDashboard === 'function') showAdminDashboard();
    if (typeof startAdminNotificationListener === 'function') startAdminNotificationListener();
    // Show push notification button (non-blocking, no FCM SDK load until user clicks)
    if (typeof initPushNotifications === 'function') {
      setTimeout(function () {
        try { initPushNotifications({ deviceId: 'admin-' + deviceId, role: 'admin' }); }
        catch (e) { console.warn('Push notification prompt skipped:', e); }
      }, 1000);
    }
    return;
  } catch (adminError) {
    var errCode = adminError?.code || adminError?.details?.code || '';
    var errMessage = adminError?.message || adminError?.details?.message || '';
    var isNotAdmin = errCode === 'unauthenticated' || errCode === 'permission-denied';
    // If admin login failed due to device lock, show the admin-specific message
    // instead of falling through to employee login.
    if (errCode === 'permission-denied' && (errMessage.indexOf('device') !== -1 || errMessage.indexOf('approved') !== -1 || errMessage.indexOf('blocked') !== -1)) {
      setStatusText('status', '\u274C ' + errMessage);
      return;
    }
    if (!isNotAdmin && !errMessage.includes('unauthenticated') && !errMessage.includes('permission-denied')) {
      console.warn('Admin login error:', adminError);
    }
  }

  if (isCustomAuthEnabled()) {
    await handleCustomAuthLogin(inputId, inputPin);
    return;
  }

  // Fallback: legacy employee login (only if custom auth is disabled)
  db.ref('employees').once('value', async function(snapshot) {
    var employees = snapshot.val();
    var foundUser = window.PinThipSafe.auth.findEmployeeByCredentials(employees, inputId, inputPin);

    if (foundUser) {
      var deviceAccess = await checkDeviceAccess(foundUser);
      if (!deviceAccess.allowed) {
        setStatusText('status', deviceAccess.message);
        return;
      }

      setStatusText('status', '');
      isAdmin = false;
      window.isAdmin = false;
      currentUser = window.PinThipSafe.auth.normalizeSessionUser({
        success: true,
        empId: foundUser.empId,
        empName: foundUser.empName,
        isDriver: foundUser.isDriver || false,
        canSendFoamLabels: foundUser.canSendFoamLabels || false,
        pin: foundUser.pin,
        role: foundUser.role || 'employee'
      });
      var sessionState = PinThipSafe.session.setUserSession(currentUser, {
        empId: inputId,
        pin: inputPin
      });
      currentUser = sessionState.currentUser;
      window.currentUser = currentUser;
      isAdmin = sessionState.isAdmin;
      window.isAdmin = isAdmin;
      if (typeof showNotificationSoundControl === 'function') showNotificationSoundControl(true);
      if (typeof enableNotificationSound === 'function') enableNotificationSound();
      if (typeof startDevicePresence === 'function') {
        startDevicePresence(deviceAccess.deviceId, currentUser.empName, 'employee');
      }
      if (typeof showDashboard === 'function') showDashboard();
      if (typeof startDeviceAccessGuard === 'function') startDeviceAccessGuard();
      // Show push notification button for employee (non-blocking)
      if (typeof initPushNotifications === 'function') {
        setTimeout(function () {
          try { initPushNotifications({ deviceId: deviceAccess.deviceId, role: 'employee', empId: currentUser.empId }); }
          catch (e) { console.warn('Push notification prompt skipped:', e); }
        }, 1000);
      }
    } else {
      setStatusText('status', '\u274C \u0E23\u0E2B\u0E31\u0E2A\u0E40\u0E02\u0E49\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 \u0E2B\u0E23\u0E37\u0E2D PIN \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07!');
    }
  });
}

async function handleCustomAuthLogin(inputId, inputPin) {
  try {
    var deviceId = window.PinThipSafe.utils.getDeviceId();
    var callable = firebase.functions().httpsCallable('loginWithPin');
    var result = await callable({
      empId: inputId,
      pin: inputPin,
      deviceId: deviceId,
      deviceInfo: window.PinThipSafe.utils.getDeviceInfo()
    });
    await firebase.auth().signInWithCustomToken(result.data.token);

    db.ref('employees').once('value', function(snapshot) {
      // Cloud Function already validated the PIN — just look up employee data by empId
      var foundUser = window.PinThipSafe.auth.findEmployeeByEmpId(snapshot.val(), inputId);
      if (!foundUser) {
        setStatusText('status', '\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E41\u0E15\u0E48\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19');
        return;
      }

      currentUser = window.PinThipSafe.auth.normalizeSessionUser({
        empId: foundUser.empId,
        empName: foundUser.empName,
        isDriver: foundUser.isDriver || false,
        canSendFoamLabels: foundUser.canSendFoamLabels || false,
        role: foundUser.role || 'employee'
      });
      var sessionState = PinThipSafe.session.setUserSession(currentUser, {
        empId: inputId,
        sessionToken: result.data.sessionToken
      });
      currentUser = sessionState.currentUser;
      window.currentUser = currentUser;
      isAdmin = false;
      window.isAdmin = false;
      setStatusText('status', '');
      if (typeof showNotificationSoundControl === 'function') showNotificationSoundControl(true);
      if (typeof enableNotificationSound === 'function') enableNotificationSound();
      if (typeof startDevicePresence === 'function') {
        startDevicePresence(result.data.deviceId, currentUser.empName, 'employee');
      }
      if (typeof showDashboard === 'function') showDashboard();
      if (typeof startDeviceAccessGuard === 'function') startDeviceAccessGuard();
      // Show push notification button for employee (non-blocking)
      if (typeof initPushNotifications === 'function') {
        setTimeout(function () {
          try { initPushNotifications({ deviceId: result.data.deviceId, role: 'employee', empId: currentUser.empId }); }
          catch (e) { console.warn('Push notification prompt skipped:', e); }
        }, 1000);
      }
    });
  } catch (error) {
    console.warn('Custom auth login failed:', error);
    var message = error?.details || error?.message || '';
    setStatusText('status', message.indexOf('waiting for admin') !== -1
      ? '\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E01\u0E33\u0E25\u0E31\u0E07\u0E23\u0E2D Admin \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34'
      : (message.indexOf('blocked') !== -1 ? '\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19' : '\u0E23\u0E2B\u0E31\u0E2A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2B\u0E23\u0E37\u0E2D PIN \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07'));
  }
}
