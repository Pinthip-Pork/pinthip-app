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
var deviceAccessAutoApproveCache = true;

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
  devicePresenceInterval = window.setInterval(updatePresence, 30000);
}

function stopDevicePresence() {
  if (devicePresenceInterval) {
    window.clearInterval(devicePresenceInterval);
    devicePresenceInterval = null;
  }
  if (devicePresenceKey) {
    db.ref('device_access/' + devicePresenceKey).update({ online: false, lastSeenAt: new Date().toISOString() });
    devicePresenceKey = null;
  }
}

// ===== Device Access Guard =====
function startDeviceAccessGuard() {
  stopDeviceAccessGuard();
  if (!isDeviceAccessPilotEnabled() || !currentUser) return;
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
  if (!isDeviceAccessPilotEnabled() || !currentUser) return;
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

    if (existing.status === 'active' || existing.status === 'approved') return { allowed: true, deviceId: deviceId };
    if (existing.status === 'blocked') return { allowed: false, message: '\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D Admin' };
    return { allowed: false, message: '\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E01\u0E33\u0E25\u0E31\u0E07\u0E23\u0E2D Admin \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E01\u0E48\u0E2D\u0E19\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19' };
  } catch (error) {
    console.warn('Device access check failed:', error);
    return { allowed: false, message: '\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07' };
  }
}

// ===== Device Access Management (Admin UI) =====
function showDeviceAccessManagement() {
  if (!isAdmin) return;
  document.getElementById('pageTitle').innerText = '\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E41\u0E25\u0E30\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C';
  document.getElementById('listBox').style.display = 'none';
  var mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = '\u003Cdiv class=\"loading\"\u003E\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C...\u003C/div\u003E';

  Promise.all([
    db.ref('device_access').once('value'),
    db.ref('settings/deviceAccessAutoApprove').once('value')
  ]).then(function(results) {
    var snapshot = results[0];
    var autoApproveSnapshot = results[1];
    var devices = snapshot.val() || {};
    deviceAccessEntriesCache = Object.entries(devices).map(function(entry) {
      var deviceId = entry[0], device = entry[1];
      device.deviceId = deviceId;
      return device;
    });
    deviceAccessAutoApproveCache = autoApproveSnapshot.val() !== false;
    renderDeviceAccessManagement();
  }).catch(function() {
    mainContent.innerHTML = '\u003Cdiv class=\"no-data\"\u003E\u0E42\u0E2B\u0E25\u0E14\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u003C/div\u003E\u003Cbutton class=\"btn-back\" onclick=\"showAdminDashboard()\"\u003E\u2B05\uFE0F \u0E01\u0E25\u0E31\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E14\u0E2A\u0E1A\u0E2D\u0E23\u0E4C\u0E14\u003C/button\u003E';
  });
}

function renderDeviceAccessManagement() {
  var mainContent = document.getElementById('mainContent');
  if (!mainContent) return;
  var searchInput = document.getElementById('deviceAccessSearch');
  var search = String(searchInput ? searchInput.value : '').trim().toLowerCase();
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

  var html = '\u003Cdiv class=\"user-banner\"\u003E\u0E42\u0E2B\u0E21\u0E14\u0E17\u0E14\u0E25\u0E2D\u0E07: ' + modeLabel + '\u003Cbr\u003E' +
    '\u003Cbutton class=\"btn-blue\" style=\"width:auto; margin-top:8px; padding:7px 12px;\" onclick=\"setDeviceAutoApprove(' + (!deviceAccessAutoApproveCache) + ')\"\u003E' +
    (deviceAccessAutoApproveCache ? '\u0E1B\u0E34\u0E14\u0E2D\u0E2D\u0E42\u0E15\u0E49 \u0E43\u0E0A\u0E49\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E40\u0E2D\u0E07' : '\u0E40\u0E1B\u0E34\u0E14\u0E2D\u0E2D\u0E42\u0E15\u0E49 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E17\u0E31\u0E19\u0E17\u0E35') +
    '\u003C/button\u003E\u003C/div\u003E' +
    '\u003Cdiv style=\"display:flex; gap:8px; margin-bottom:10px;\"\u003E' +
    '\u003Cinput id=\"deviceAccessSearch\" value=\"' + safeText(search) + '\" oninput=\"renderDeviceAccessManagement()\" placeholder=\"\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E0A\u0E37\u0E48\u0E2D\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\" style=\"margin:0;\"\u003E' +
    '\u003Cselect id=\"deviceAccessFilter\" onchange=\"renderDeviceAccessManagement()\" style=\"width:auto; margin:0;\"\u003E' +
    '\u003Coption value=\"all\" ' + (filter === 'all' ? 'selected' : '') + '\u003E\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14\u003C/option\u003E' +
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
}

function setDeviceAutoApprove(enabled) {
  if (!isAdmin) return;
  var message = enabled
    ? '\u0E40\u0E1B\u0E34\u0E14\u0E2D\u0E2D\u0E42\u0E15\u0E49 \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E08\u0E30\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49\u0E17\u0E31\u0E19\u0E17\u0E35\u0E43\u0E0A\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48?'
    : '\u0E1B\u0E34\u0E14\u0E2D\u0E2D\u0E42\u0E15\u0E49 \u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E43\u0E2B\u0E21\u0E48\u0E08\u0E30\u0E15\u0E49\u0E2D\u0E07\u0E23\u0E2D Admin \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E0A\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48?';
  if (!window.confirm(message)) return;
  db.ref('settings/deviceAccessAutoApprove').set(Boolean(enabled)).then(function() {
    showDeviceAccessManagement();
  });
}

function setDeviceAccessStatus(deviceId, status) {
  if (!isAdmin) return;
  db.ref('device_access/' + deviceId).update({ status: status, updatedAt: new Date().toISOString() }).then(function() {
    showDeviceAccessManagement();
  });
}

function deleteDeviceAccess(deviceId) {
  if (!isAdmin || !window.confirm('\u0E25\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E19\u0E35\u0E49\u0E43\u0E0A\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48? \u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E08\u0E30\u0E16\u0E39\u0E01\u0E25\u0E07\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E21\u0E37\u0E48\u0E2D Login \u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07')) return;
  db.ref('device_access/' + deviceId).remove().then(function() { showDeviceAccessManagement(); });
}
