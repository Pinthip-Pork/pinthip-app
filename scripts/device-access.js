/**
 * device-access.js — Device presence, access guard, device management
 * Extracted from index.html inline script
 * Dependencies: app-globals.js, notification.js
 */

// ===== Device Presence State =====
var devicePresenceKey = null;
var devicePresenceInterval = null;
var deviceAccessGuardInterval = null;
var deviceAccessEntriesCache = [];
var deviceAccessAutoApproveCache = false;
var adminApprovedDevicesCache = {};
var adminPendingDevicesCache = {};

// ===== Feature Flags =====
function isDeviceAccessPilotEnabled() {
  return Boolean(window.PinThipSafe?.config?.deviceAccessPilot?.enabled);
}

function isCustomAuthEnabled() {
  return Boolean(window.PinThipSafe?.config?.deviceAccessPilot?.customAuthEnabled);
}

// ===== Device Presence =====
function startDevicePresence(key, name, role) {
  if (!isDeviceAccessPilotEnabled()) return;
  stopDevicePresence();
  devicePresenceKey = key;
  var presenceRef = db.ref('device_access/' + key);
  var updatePresence = function() {
    presenceRef.update({
      empName: String(name || (role === 'admin' ? 'Admin' : '-')),
      role: role,
      online: true,
      lastSeenAt: new Date().toISOString()
    });
  };
  presenceRef.onDisconnect().update({ online: false });
  updatePresence();
  // FCM push notifications are NOT initialized here to avoid blocking login
  // on mobile devices. Users can enable push notifications manually via the
  // "🔔 เปิดการแจ้งเตือน" button. See fcm.js → enablePushNotifications().
  devicePresenceInterval = window.setInterval(updatePresence, 30000);
}

function stopDevicePresence() {
  if (devicePresenceInterval) {
    window.clearInterval(devicePresenceInterval);
    devicePresenceInterval = null;
  }
  if (typeof window.stopPushNotifications === 'function') {
    window.stopPushNotifications();
  }
  if (devicePresenceKey) {
    var presenceUpdate = db.ref('device_access/' + devicePresenceKey).update({ online: false, lastSeenAt: new Date().toISOString() });
    if (presenceUpdate && typeof presenceUpdate.catch === 'function') {
      presenceUpdate.catch(function (error) {
        console.warn('Device presence update skipped:', error);
      });
    }
    devicePresenceKey = null;
  }
}

// ===== Device Access Guard =====
function startDeviceAccessGuard() {
  stopDeviceAccessGuard();
  if (!isDeviceAccessPilotEnabled()) return;
  if (!currentUser && !isAdmin) return;
  checkCurrentDeviceAccess();
  deviceAccessGuardInterval = window.setInterval(checkCurrentDeviceAccess, 30000);
}

function stopDeviceAccessGuard() {
  if (deviceAccessGuardInterval) {
    window.clearInterval(deviceAccessGuardInterval);
    deviceAccessGuardInterval = null;
  }
}

async function checkCurrentDeviceAccess() {
  if (!isDeviceAccessPilotEnabled()) return;
  if (!currentUser && !isAdmin) return;
  try {
    var deviceId = window.PinThipSafe.utils.getDeviceId();
    var snapshot = await db.ref('device_access/' + deviceId + '/status').once('value');
    if (snapshot.val() !== 'blocked') return;

    stopDeviceAccessGuard();
    stopDevicePresence();
    currentUser = null;
    window.currentUser = null;
    isAdmin = false;
    window.isAdmin = false;
    PinThipSafe.session.clearAuthState();
    if (typeof showLoginForm === 'function') showLoginForm();
    setStatusText('status', '\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E42\u0E14\u0E22 Admin');
  } catch (error) {
    console.warn('Device access refresh failed:', error);
  }
}

async function checkDeviceAccess(foundUser) {
  if (!isDeviceAccessPilotEnabled()) return { allowed: true };

  try {
    var deviceId = window.PinThipSafe.utils.getDeviceId();
    var deviceRef = db.ref('device_access/' + deviceId);
    var snapshot = await deviceRef.once('value');
    var existing = snapshot.val();
    var autoApproveSnapshot = await db.ref('settings/deviceAccessAutoApprove').once('value');
    var autoApproveEnabled = autoApproveSnapshot.val() !== false;
    var now = new Date().toISOString();

    if (!existing) {
      await deviceRef.set({
        empId: String(foundUser.empId),
        empName: String(foundUser.empName || ''),
        deviceInfo: window.PinThipSafe.utils.getDeviceInfo(),
        status: autoApproveEnabled ? 'active' : 'pending',
        createdAt: now,
        lastSeenAt: now
      });
      return autoApproveEnabled
        ? { allowed: true, deviceId: deviceId }
        : { allowed: false, message: '\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E41\u0E25\u0E49\u0E27 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E2D Admin \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E01\u0E48\u0E2D\u0E19\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19' };
    }

    await deviceRef.update({
      empId: String(foundUser.empId),
      empName: String(foundUser.empName || ''),
      lastSeenAt: now
    });

    if (existing.status === 'active' || existing.status === 'approved') {
      // Verify empId matches — prevent device sharing across employees
      if (existing.empId && String(existing.empId) !== String(foundUser.empId)) {
        logDeviceAccessEvent('mismatched_device', deviceId, foundUser.empId, foundUser.empName);
        return { allowed: false, message: '\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2D\u0E37\u0E48\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D Admin' };
      }
      return { allowed: true, deviceId: deviceId };
    }
    if (existing.status === 'blocked') {
      logDeviceAccessEvent('blocked_login_attempt', deviceId, foundUser.empId, foundUser.empName);
      return { allowed: false, message: '\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D Admin' };
    }
    return { allowed: false, message: '\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E01\u0E33\u0E25\u0E31\u0E07\u0E23\u0E2D Admin \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E01\u0E48\u0E2D\u0E19\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19' };
  } catch (error) {
    console.warn('Device access check failed:', error);
    return { allowed: false, message: '\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07' };
  }
}

function logDeviceAccessEvent(type, deviceId, empId, empName) {
  if (!isDeviceAccessPilotEnabled()) return;
  try {
    var now = new Date().toISOString();
    var monthKey = now.slice(0, 7);
    db.ref('logs/device-access/' + monthKey).push({
      type: type,
      deviceId: deviceId,
      empId: String(empId || ''),
      empName: String(empName || ''),
      deviceInfo: window.PinThipSafe.utils.getDeviceInfo(),
      timestamp: now
    });
  } catch (e) {
    console.warn('logDeviceAccessEvent failed:', e);
  }
}

// ===== Device Access Management (Admin UI) =====
function updatePendingDevicesBadge() {
  if (!isAdmin) return;
  db.ref('device_access').once('value').then(function(snapshot) {
    var devices = snapshot.val() || {};
    var pendingCount = Object.values(devices).filter(function(d) { return d && d.status === 'pending'; }).length;
    var badge = document.getElementById('pendingDevicesBadge');
    if (badge) {
      badge.textContent = pendingCount;
      badge.style.display = pendingCount > 0 ? '' : 'none';
    }
  }).catch(function() {});
}

function showDeviceAccessManagement() {
  if (!isAdmin) return;
  document.getElementById('pageTitle').innerText = '\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E41\u0E25\u0E30\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C';
  document.getElementById('listBox').style.display = 'none';
  var mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = '\u003Cdiv class=\"loading\"\u003E\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C...\u003C/div\u003E';

  Promise.all([
    db.ref('device_access').once('value'),
    db.ref('settings/deviceAccessAutoApprove').once('value'),
    db.ref('settings/admin/approvedDevices').once('value'),
    db.ref('settings/admin/pendingDevices').once('value')
  ]).then(function(results) {
    var snapshot = results[0];
    var autoApproveSnapshot = results[1];
    var approvedSnapshot = results[2];
    var pendingSnapshot = results[3];
    var devices = snapshot.val() || {};
    deviceAccessEntriesCache = Object.entries(devices).map(function(entry) {
      var deviceId = entry[0], device = entry[1];
      device.deviceId = deviceId;
      return device;
    });
    deviceAccessAutoApproveCache = autoApproveSnapshot.val() !== false;
    adminApprovedDevicesCache = approvedSnapshot.val() || {};
    adminPendingDevicesCache = pendingSnapshot.val() || {};
    renderDeviceAccessManagement();
  }).catch(function() {
    mainContent.innerHTML = '\u003Cdiv class=\"no-data\"\u003E\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u003C/div\u003E\u003Cbutton class=\"btn-back\" onclick=\"showAdminDashboard()\"\u003E\u2B05\uFE0F \u0E01\u0E25\u0E31\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E14\u0E2A\u0E1A\u0E2D\u0E23\u0E4C\u0E14\u003C/button\u003E';
  });
}

function renderDeviceAccessManagement() {
  var mainContent = document.getElementById('mainContent');
  if (!mainContent) return;
  var searchInput = document.getElementById('deviceAccessSearch');
  var rawValue = searchInput ? searchInput.value : '';
  var search = String(rawValue).trim().toLowerCase();
  var cursorPos = searchInput ? searchInput.selectionStart : 0;
  var wasFocused = searchInput && document.activeElement === searchInput;
  var filterSelect = document.getElementById('deviceAccessFilter');
  var filter = filterSelect ? filterSelect.value : 'all';

  var filtered = deviceAccessEntriesCache.filter(function(device) {
    var haystack = (device.empId || '') + ' ' + (device.empName || '') + ' ' + (device.deviceInfo || '') + ' ' + (device.deviceId || '');
    haystack = haystack.toLowerCase();
    var isDuplicate = deviceAccessEntriesCache.filter(function(item) {
      return String(item.empId || item.uid || item.deviceId) === String(device.empId || device.uid || device.deviceId);
    }).length > 1;
    var matchSearch = !search || haystack.indexOf(search) !== -1;
    var matchFilter = filter === 'all' ||
      (filter === 'pending' && device.status === 'pending') ||
      (filter === 'online' && device.online) ||
      (filter === 'blocked' && device.status === 'blocked') ||
      (filter === 'duplicate' && isDuplicate);
    return matchSearch && matchFilter;
  });

  // Group by employee/admin
  var groups = {};
  filtered.forEach(function(device) {
    var key = device.role === 'admin' ? 'admin' : (device.empId || 'unknown') + '|' + (device.uid || '');
    if (!groups[key]) groups[key] = [];
    groups[key].push(device);
  });

  var modeLabel = deviceAccessAutoApproveCache ? '\u0E2D\u0E2D\u0E42\u0E15\u0E49: \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35' : '\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E40\u0E2D\u0E07: \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E23\u0E2D Admin';

  var adminSectionHtml = '';
  // ===== Admin Device Lock Section =====
  var pendingKeys = Object.keys(adminPendingDevicesCache || {});
  var approvedKeys = Object.keys(adminApprovedDevicesCache || {});
  if (pendingKeys.length > 0) {
    adminSectionHtml += '\u003Cdiv class=\"user-banner\" style=\"background:#fff3cd; margin-top:10px;\"\u003E' +
      '\uD83D\uDD12 \u0E02\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E40\u0E02\u0E49\u0E32\u0E23\u0E30\u0E1A\u0E1A Admin (' + pendingKeys.length + ' \u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07)\u003C/div\u003E';
    pendingKeys.forEach(function(deviceId) {
      var pending = adminPendingDevicesCache[deviceId] || {};
      var info = String(pending.deviceInfo || '\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E44\u0E21\u0E48\u0E17\u0E23\u0E32\u0E1A\u0E0A\u0E19\u0E34\u0E14');
      var reqTime = pending.lastAttemptAt ? new Date(pending.lastAttemptAt).toLocaleString('th-TH') : '-';
      adminSectionHtml += '\u003Cdiv class=\"history-item\" style=\"margin-bottom:8px; text-align:left; background:#fffbe6;\"\u003E' +
        '\uD83D\uDCC5 \u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34: \u003Cb\u003E' + safeText(info) + '\u003C/b\u003E\u003Cbr\u003E' +
        'Device ID: \u003Csmall\u003E' + safeText(deviceId) + '\u003C/small\u003E\u003Cbr\u003E' +
        '\u0E02\u0E2D\u0E40\u0E02\u0E49\u0E32\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E21\u0E37\u0E48\u0E2D: \u003Cb\u003E' + safeText(reqTime) + '\u003C/b\u003E' +
        '\u003Cdiv style=\"display:flex; gap:6px; margin-top:6px;\"\u003E' +
        '\u003Cbutton class=\"btn-green\" style=\"width:auto; margin:0; padding:6px 10px;\" onclick=\"approveAdminDevice(\'' + safeText(deviceId) + '\', \'' + safeText(info) + '\')\"\u003E\u2705 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E40\u0E1B\u0E47\u0E19 Admin\u003C/button\u003E' +
        '\u003Cbutton class=\"btn-danger\" style=\"width:auto; margin:0; padding:6px 10px;\" onclick=\"removePendingAdminDevice(\'' + safeText(deviceId) + '\')\"\u003E\u274C \u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u003C/button\u003E' +
        '\u003C/div\u003E\u003C/div\u003E';
    });
  }
  if (approvedKeys.length > 0) {
    adminSectionHtml += '\u003Cdiv class=\"user-banner\" style=\"background:#e6f4ea; margin-top:10px;\"\u003E' +
      '\uD83D\uDD10 \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C Admin \u0E17\u0E35\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34 (' + approvedKeys.length + ' \u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07)\u003C/div\u003E';
    approvedKeys.forEach(function(deviceId) {
      var approved = adminApprovedDevicesCache[deviceId] || {};
      var info = String(approved.deviceInfo || '\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E44\u0E21\u0E48\u0E17\u0E23\u0E32\u0E1A\u0E0A\u0E19\u0E34\u0E14');
      var isRoot = Boolean(approved.root);
      var approvedTime = approved.approvedAt ? new Date(approved.approvedAt).toLocaleString('th-TH') : '-';
      adminSectionHtml += '\u003Cdiv class=\"history-item\" style=\"margin-bottom:8px; text-align:left; background:#f0fff4;\"\u003E' +
        (isRoot ? '\uD83D\uDC51' : '\uD83D\uDCBB') + ' ' + (isRoot ? 'Root Admin' : 'Admin') + ': \u003Cb\u003E' + safeText(info) + '\u003C/b\u003E\u003Cbr\u003E' +
        'Device ID: \u003Csmall\u003E' + safeText(deviceId) + '\u003C/small\u003E\u003Cbr\u003E' +
        '\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E40\u0E21\u0E37\u0E48\u0E2D: \u003Cb\u003E' + safeText(approvedTime) + '\u003C/b\u003E' +
        (isRoot ? '\u003Cspan style=\"color:#666; font-size:12px;\"\u003E (\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E2B\u0E25\u0E31\u0E01 \u0E25\u0E1A\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49)\u003C/span\u003E' :
          '\u003Cdiv style=\"display:flex; gap:6px; margin-top:6px;\"\u003E' +
          '\u003Cbutton class=\"btn-danger\" style=\"width:auto; margin:0; padding:6px 10px;\" onclick=\"revokeAdminDevice(\'' + safeText(deviceId) + '\')\"\u003E\uD83D\uDEAB \u0E40\u0E1E\u0E34\u0E01\u0E16\u0E2D\u0E19\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C Admin\u003C/button\u003E' +
          '\u003C/div\u003E') +
        '\u003C/div\u003E';
    });
  }

  var html = adminSectionHtml +
    '\u003Cdiv class=\"user-banner\"\u003E\u0E42\u0E2B\u0E21\u0E14\u0E17\u0E14\u0E25\u0E2D\u0E07: ' + modeLabel + '\u003Cbr\u003E' +
    '\u003Cbutton class=\"btn-blue\" style=\"width:auto; margin-top:8px; padding:7px 12px;\" onclick=\"setDeviceAutoApprove(' + (!deviceAccessAutoApproveCache) + ')\"\u003E' +
    (deviceAccessAutoApproveCache ? '\u0E1B\u0E34\u0E14\u0E2D\u0E2D\u0E42\u0E15\u0E49 \u0E43\u0E0A\u0E49\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E40\u0E2D\u0E07' : '\u0E40\u0E1B\u0E34\u0E14\u0E2D\u0E2D\u0E42\u0E15\u0E49 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E17\u0E31\u0E19\u0E17\u0E35') +
    '\u003C/button\u003E ' +
    '\u003Cbutton class=\"btn-green\" style=\"width:auto; margin-top:8px; padding:7px 12px;\" onclick=\"showAddDeviceForm()\"\u003E\u2795 \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u003C/button\u003E\u003C/div\u003E' +
    '\u003Cdiv style=\"display:flex; gap:8px; margin-bottom:10px;\"\u003E' +
    '\u003Cinput id=\"deviceAccessSearch\" value=\"' + safeText(search) + '\" oninput=\"renderDeviceAccessManagement()\" placeholder=\"\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E0A\u0E37\u0E48\u0E2D\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\" style=\"margin:0;\"\u003E' +
    '\u003Cselect id=\"deviceAccessFilter\" onchange=\"renderDeviceAccessManagement()\" style=\"width:auto; margin:0;\"\u003E' +
    '\u003Coption value=\"all\" ' + (filter === 'all' ? 'selected' : '') + '\u003E\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u003C/option\u003E' +
    '\u003Coption value=\"pending\" ' + (filter === 'pending' ? 'selected' : '') + '\u003E\u23F3 \u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u003C/option\u003E' +
    '\u003Coption value=\"online\" ' + (filter === 'online' ? 'selected' : '') + '\u003E\u0E2D\u0E2D\u0E19\u0E44\u0E25\u0E19\u0E4C\u003C/option\u003E' +
    '\u003Coption value=\"duplicate\" ' + (filter === 'duplicate' ? 'selected' : '') + '\u003E\u0E21\u0E35\u0E2B\u0E25\u0E32\u0E22\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u003C/option\u003E' +
    '\u003Coption value=\"blocked\" ' + (filter === 'blocked' ? 'selected' : '') + '\u003E\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u003C/option\u003E' +
    '\u003C/select\u003E\u003C/div\u003E';

  if (filtered.length === 0) html += '\u003Cdiv class=\"no-data\"\u003E\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E15\u0E32\u0E21\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02\u003C/div\u003E';

  Object.keys(groups).forEach(function(groupKey) {
    var group = groups[groupKey];
    var first = group[0];
    var title = first.role === 'admin' ? '\uD83D\uDC51 \u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A' : '\uD83D\uDC64 ' + (first.empName || '-') + ' (' + (first.empId || '-') + ')';
    html += '\u003Cdiv class=\"user-banner\" style=\"margin-top:10px; margin-bottom:6px;\"\u003E' + safeText(title) + ' \u003Csmall\u003E(' + group.length + ' \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C' + (group.length > 1 ? ' / \u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E0B\u0E49\u0E33' : '') + ')\u003C/small\u003E\u003C/div\u003E';

    group.forEach(function(device) {
      var status = String(device.status || 'active');
      var statusLabel = status === 'blocked' ? '\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A' : (status === 'pending' ? '\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34' : '\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49');
      var nextStatus = status === 'blocked' || status === 'pending' ? 'active' : 'blocked';
      var nextLabel = status === 'blocked' || status === 'pending' ? '\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34/\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19' : '\u0E23\u0E30\u0E07\u0E31\u0E1A';
      var onlineLabel = device.online ? '\uD83D\uDFE2 \u0E2D\u0E2D\u0E19\u0E44\u0E25\u0E19\u0E4C' : '\u26AA \u0E2D\u0E2D\u0E1F\u0E44\u0E25\u0E19\u0E4C';
      var lastSeenLabel = device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('th-TH') : '\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25';

      html += '\u003Cdiv class=\"history-item\" style=\"margin-bottom:8px; text-align:left;\"\u003E' +
        '\u003Cb\u003E' + safeText(device.deviceInfo || '\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E44\u0E21\u0E48\u0E17\u0E23\u0E32\u0E1A\u0E0A\u0E19\u0E34\u0E14') + '\u003C/b\u003E ' + (device.online ? '\uD83D\uDFE2' : '\u26AA') + '\u003Cbr\u003E' +
        'Device ID: \u003Csmall\u003E' + safeText(device.deviceId) + '\u003C/small\u003E\u003Cbr\u003E' +
        '\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D: \u003Cb\u003E' + onlineLabel + '\u003C/b\u003E | \u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14: \u003Cb\u003E' + safeText(lastSeenLabel) + '\u003C/b\u003E\u003Cbr\u003E' +
        '\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C: \u003Cb\u003E' + statusLabel + '\u003C/b\u003E' +
        '\u003Cdiv style=\"display:flex; gap:6px; margin-top:6px;\"\u003E' +
        '\u003Cbutton class=\"btn-blue\" style=\"width:auto; margin:0; padding:6px 10px;\" onclick=\"setDeviceAccessStatus(\'' + safeText(device.deviceId) + '\', \'' + nextStatus + '\')\"\u003E' + nextLabel + '\u003C/button\u003E' +
        '\u003Cbutton class=\"btn-danger\" style=\"width:auto; margin:0; padding:6px 10px;\" onclick=\"deleteDeviceAccess(\'' + safeText(device.deviceId) + '\')\"\u003E\u0E25\u0E1A\u003C/button\u003E' +
        '\u003C/div\u003E\u003C/div\u003E';
    });
  });

  html += '\u003Cbutton class=\"btn-back\" onclick=\"showAdminDashboard()\" style=\"margin-top:15px;\"\u003E\u2B05\uFE0F \u0E01\u0E25\u0E31\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E14\u0E2A\u0E1A\u0E2D\u0E23\u0E4C\u0E14\u003C/button\u003E';
  mainContent.innerHTML = html;

  // Restore cursor position and focus on search input
  if (wasFocused) {
    var newInput = document.getElementById('deviceAccessSearch');
    if (newInput) {
      newInput.focus();
      newInput.setSelectionRange(cursorPos, cursorPos);
    }
  }
}

function setDeviceAutoApprove(enabled) {
  if (!isAdmin) return;
  var message = enabled
    ? '\u0E40\u0E1B\u0E34\u0E14\u0E2D\u0E2D\u0E42\u0E15\u0E49 \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E08\u0E30\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35\u0E43\u0E0A\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48?'
    : '\u0E1B\u0E34\u0E14\u0E2D\u0E2D\u0E42\u0E15\u0E49 \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E08\u0E30\u0E15\u0E49\u0E2D\u0E07\u0E23\u0E2D Admin \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E0A\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48?';
  if (!window.confirm(message)) return;
  db.ref('settings/deviceAccessAutoApprove').set(Boolean(enabled)).then(function() {
    logDeviceAccessEvent(enabled ? 'auto_approve_enabled' : 'auto_approve_disabled', 'settings', 'admin', 'Admin');
    showDeviceAccessManagement();
  });
}

function setDeviceAccessStatus(deviceId, status) {
  if (!isAdmin) return;
  db.ref('device_access/' + deviceId).update({ status: status, updatedAt: new Date().toISOString() }).then(function() {
    logDeviceAccessEvent('status_change_' + status, deviceId, 'admin', 'Admin');
    updatePendingDevicesBadge();
    showDeviceAccessManagement();
  });
}

function deleteDeviceAccess(deviceId) {
  if (!isAdmin || !window.confirm('\u0E25\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E43\u0E0A\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48? \u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E08\u0E30\u0E16\u0E39\u0E01\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E21\u0E37\u0E48\u0E2D Login \u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07')) return;
  db.ref('device_access/' + deviceId).remove().then(function() { showDeviceAccessManagement(); });
}

// ===== Admin Device Approval / Revocation =====
function approveAdminDevice(deviceId, deviceInfo) {
  if (!isAdmin) return;
  if (!window.confirm('\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E40\u0E1B\u0E47\u0E19 Admin \u0E43\u0E0A\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48? (' + deviceInfo + ')\n\n\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E08\u0E30\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16 login \u0E14\u0E49\u0E27\u0E22 admin/8888 \u0E44\u0E14\u0E49')) return;
  var approveUpdates = {};
  approveUpdates['settings/admin/approvedDevices/' + deviceId] = {
    approvedAt: Date.now(),
    deviceInfo: String(deviceInfo || 'Unknown device'),
    root: false
  };
  approveUpdates['settings/admin/pendingDevices/' + deviceId] = null;
  db.ref().update(approveUpdates).then(function() {
    logDeviceAccessEvent('admin_device_approved', deviceId, 'admin', 'Admin');
    window.alert('\u2705 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E2D\u0E38\u0E1B\u0E01\u0E03\u0E13\u0E4C\u0E40\u0E1B\u0E47\u0E19 Admin \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08!');
    showDeviceAccessManagement();
  }).catch(function(err) {
    window.alert('\u274C \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E44\u0E21\u0E08\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ' + (err.message || err));
  });
}

function removePendingAdminDevice(deviceId) {
  if (!isAdmin) return;
  if (!window.confirm('\u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E01\u0E32\u0E23\u0E02\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E43\u0E0A\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48? (' + deviceId + ')')) return;
  db.ref('settings/admin/pendingDevices/' + deviceId).remove().then(function() {
    window.alert('\u274C \u0E1B\u0E0F\u0E34\u0E40\u0E2A\u0E18\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27');
    showDeviceAccessManagement();
  });
}

function revokeAdminDevice(deviceId) {
  if (!isAdmin) return;
  if (!window.confirm('\u0E40\u0E1E\u0E34\u0E01\u0E16\u0E2D\u0E19\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C Admin \u0E02\u0E2D\u0E07\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E43\u0E0A\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48? (' + deviceId + ')\n\n\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E08\u0E30\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16 login \u0E40\u0E1B\u0E47\u0E19 admin \u0E44\u0E14\u0E49\u0E2D\u0E35\u0E01')) return;
  var revokeUpdates = {};
  revokeUpdates['settings/admin/approvedDevices/' + deviceId] = null;
  revokeUpdates['device_access/' + deviceId + '/status'] = 'blocked';
  revokeUpdates['device_access/' + deviceId + '/blockedAt'] = Date.now();
  db.ref().update(revokeUpdates).then(function() {
    logDeviceAccessEvent('admin_device_revoked', deviceId, 'admin', 'Admin');
    window.alert('\uD83D\uDEAB \u0E40\u0E1E\u0E34\u0E01\u0E16\u0E2D\u0E19\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C Admin \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08');
    showDeviceAccessManagement();
  }).catch(function(err) {
    window.alert('\u274C \u0E40\u0E1E\u0E34\u0E01\u0E16\u0E2D\u0E19\u0E44\u0E21\u0E08\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ' + (err.message || err));
  });
}

// ===== Manual Add Device (Admin) =====
function showAddDeviceForm() {
  if (!isAdmin) return;
  var mainContent = document.getElementById('mainContent');
  if (!mainContent) return;

  // Load employee list for dropdown
  db.ref('employees').once('value').then(function(snapshot) {
    var employees = snapshot.val() || {};
    var empOptions = '';
    Object.entries(employees).forEach(function(entry) {
      var emp = entry[1];
      if (!emp || !emp.empId) return;
      empOptions += '\u003Coption value=\"' + safeText(emp.empId) + '\"\u003E' + safeText(emp.empId) + ' - ' + safeText(emp.empName || '-') + '\u003C/option\u003E';
    });

    var html = '\u003Cdiv class=\"user-banner\"\u003E\u2795 \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E14\u0E49\u0E27\u0E22\u0E15\u0E19\u0E40\u0E2D\u0E07\u003C/div\u003E' +
      '\u003Cdiv style=\"background:#fff; border-radius:12px; padding:16px; margin-bottom:12px;\"\u003E' +
      '\u003Clabel style=\"display:block; margin-bottom:4px; font-weight:bold;\"\u003E\u0E23\u0E2B\u0E31\u0E2A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19 (Emp ID)\u003C/label\u003E' +
      '\u003Cselect id=\"addDeviceEmpId\" style=\"width:100%; margin-bottom:12px;\"\u003E' +
      '\u003Coption value=\"\"\u003E-- \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19 --\u003C/option\u003E' +
      empOptions +
      '\u003C/select\u003E' +
      '\u003Clabel style=\"display:block; margin-bottom:4px; font-weight:bold;\"\u003EDevice ID (\u0E40\u0E27\u0E49\u0E19\u0E27\u0E48\u0E32\u0E07\u0E2B\u0E32\u0E01\u0E44\u0E21\u0E48\u0E23\u0E30\u0E1A\u0E38 \u0E08\u0E30\u0E43\u0E0A\u0E49\u0E40\u0E1A\u0E23\u0E32\u0E27\u0E4C\u0E40\u0E0B\u0E2D\u0E23\u0E4C\u0E02\u0E2D\u0E07\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19)\u003C/label\u003E' +
      '\u003Cinput id=\"addDeviceId\" placeholder=\"\u0E40\u0E0A\u0E48\u0E19 Chrome-Windows-abc123\" style=\"width:100%; margin-bottom:12px;\"\u003E' +
      '\u003Clabel style=\"display:block; margin-bottom:4px; font-weight:bold;\"\u003E\u0E0A\u0E37\u0E48\u0E2D\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C (\u0E2D\u0E18\u0E34\u0E1A\u0E32\u0E22)\u003C/label\u003E' +
      '\u003Cinput id=\"addDeviceInfo\" placeholder=\"\u0E40\u0E0A\u0E48\u0E19 \u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E41\u0E21\u0E48\u0E1A\u0E49\u0E32\u0E19\" style=\"width:100%; margin-bottom:16px;\"\u003E' +
      '\u003Cdiv style=\"display:flex; gap:8px;\"\u003E' +
      '\u003Cbutton class=\"btn-green\" style=\"flex:1; margin:0;\" onclick=\"addDeviceManually()\"\u003E\u2705 \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u003C/button\u003E' +
      '\u003Cbutton class=\"btn-back\" style=\"flex:1; margin:0;\" onclick=\"showDeviceAccessManagement()\"\u003E\u2B05\uFE0F \u0E01\u0E25\u0E31\u0E1A\u003C/button\u003E' +
      '\u003C/div\u003E\u003C/div\u003E';
    mainContent.innerHTML = html;
  }).catch(function() {
    mainContent.innerHTML = '\u003Cdiv class=\"no-data\"\u003E\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E0A\u0E37\u0E48\u0E2D\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u003C/div\u003E\u003Cbutton class=\"btn-back\" onclick=\"showDeviceAccessManagement()\"\u003E\u2B05\uFE0F \u0E01\u0E25\u0E31\u0E1A\u003C/button\u003E';
  });
}

function addDeviceManually() {
  if (!isAdmin) return;
  var empId = String(document.getElementById('addDeviceEmpId').value).trim();
  var deviceId = String(document.getElementById('addDeviceId').value).trim();
  var deviceInfo = String(document.getElementById('addDeviceInfo').value).trim();

  if (!empId) { window.alert('\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19'); return; }
  if (!deviceId) { window.alert('\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 Device ID'); return; }

  // Look up employee name
  db.ref('employees').once('value').then(function(snapshot) {
    var employees = snapshot.val() || {};
    var empName = '';
    Object.entries(employees).forEach(function(entry) {
      if (entry[1] && String(entry[1].empId) === empId) {
        empName = String(entry[1].empName || '');
      }
    });

    var now = new Date().toISOString();
    db.ref('device_access/' + deviceId).set({
      empId: empId,
      empName: empName,
      deviceInfo: deviceInfo || ('\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E42\u0E14\u0E22 Admin - ' + now.slice(0, 10)),
      status: 'active',
      createdAt: now,
      lastSeenAt: now,
      role: 'employee'
    }).then(function() {
      logDeviceAccessEvent('manual_add', deviceId, empId, empName);
      window.alert('\u2705 \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08! \u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19 ' + empId + ' \u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35');
      showDeviceAccessManagement();
    }).catch(function(err) {
      window.alert('\u274C \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08: ' + err.message);
    });
  });
}
