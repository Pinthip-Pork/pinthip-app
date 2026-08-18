/**
 * employee-ui.js โ€” Employee dashboard, clock-in, leave, history, logout
 * Also includes admin notification listeners (startAdminNotificationListener, etc.)
 * Extracted from index.html inline script
 * Dependencies: app-globals.js, notification.js, device-access.js
 */

// ===== Employee Dashboard =====
function showDashboard() {
  isAdmin = false;
  window.isAdmin = false;
  document.getElementById('mainCard').classList.remove('admin-wide');
  document.getElementById('hamburgerBtn').style.display = 'none';
  var t = i18n[currentLang];
  document.getElementById('pageTitle').innerText = t.pageTitleDashboard;
  document.getElementById('status').innerText = "";
  document.getElementById('listBox').style.display = "block";
  document.getElementById('mainContent').innerHTML = window.PinThipSafe.employeeDashboard.buildDashboardHtml(currentUser, t);
  updateClockInStatus();
  loadTodayListRealtime();
}

// ===== Clock In =====
function updateClockInStatus() {
  var statusEl = document.getElementById('clockInStatus');
  if (!statusEl || !currentUser) return;
  var t = i18n[currentLang];
  var todayStr = getLocalDateTimeString();
  PinThipSafe.logsRepo.fetchLogsForRange(db, todayStr, todayStr).then(function(logsObj) {
    var todayLogs = Object.values(logsObj).filter(function(l) {
      return l.date === todayStr && String(l.empId) === String(currentUser.empId) && l.type === '\u0E40\u0E02\u0E49\u0E32\u0E07\u0E32\u0E19';
    });
    if (todayLogs.length > 0) {
      statusEl.innerHTML = t.clockedIn;
      statusEl.className = 'user-status-badge status-done';
    } else {
      statusEl.innerHTML = t.notClockedIn;
      statusEl.className = 'user-status-badge status-pending';
    }
  }).catch(function() {
    statusEl.textContent = t.clockInStatusError;
    statusEl.className = 'user-status-badge status-error';
  });
}

function showClockInForm() {
  var t = i18n[currentLang];
  document.getElementById('pageTitle').innerText = t.pageTitleClockIn;
  document.getElementById('listBox').style.display = "none";

      var html = '\u003Cdiv class=\"user-banner\"\u003E' + safeText(currentUser.empName) + ' (' + safeText(currentUser.empId) + ')\u003C/div\u003E' +
        '\u003Cselect id=\"clockType\"\u003E' +
    '\u003Coption value=\"\u0E40\u0E02\u0E49\u0E32\u0E07\u0E32\u0E19\"\u003E' + t.optIn + '\u003C/option\u003E' +
    '\u003C/select\u003E' +
    '\u003Cbutton id=\"btnSubmitClock\" onclick=\"executeClockIn(\'\')\"\u003E' + t.btnSubmitClockIn + '\u003C/button\u003E' +
    '\u003Cbutton class=\"btn-back\" onclick=\"showDashboard()\"\u003E' + t.btnBack + '\u003C/button\u003E';
  document.getElementById('mainContent').innerHTML = html;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  return window.PinThipSafe.utils.calculateDistance(lat1, lon1, lat2, lon2);
}

function executeClockIn(lateReason) {
  if (!navigator.geolocation) {
    alert("\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E44\u0E21\u0E48\u0E23\u0E2D\u0E07\u0E23\u0E31\u0E1A GPS");
    return;
  }

  var btn = document.getElementById('btnSubmitClock');
  if (btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    var countdown = 10;
    btn.innerText = '\u23F3 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E2D\u0E2A\u0E31\u0E01\u0E04\u0E23\u0E39\u0E48 (' + countdown + 's)...';

    var timer = setInterval(function() {
      countdown--;
      if (countdown > 0) {
        var activeBtn = document.getElementById('btnSubmitClock');
        if (activeBtn) {
          activeBtn.innerText = '\u23F3 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E2D\u0E2A\u0E31\u0E01\u0E04\u0E23\u0E39\u0E48 (' + countdown + 's)...';
        }
      } else {
        clearInterval(timer);
        var finalBtn = document.getElementById('btnSubmitClock');
        if (finalBtn) {
          finalBtn.disabled = false;
          finalBtn.innerText = i18n[currentLang].btnSubmitClockIn;
        }
      }
    }, 1000);
  }

  var now = new Date();
  var dateStr = getLocalDateTimeString();

  PinThipSafe.logsRepo.fetchLogsForRange(db, dateStr, dateStr).then(function(logsObj) {
    var alreadyCheckedInToday = false;

    Object.keys(logsObj).forEach(function(k) {
      var log = logsObj[k];
      if (String(log.empId) === String(currentUser.empId) && log.date === dateStr && log.type === "\u0E40\u0E02\u0E49\u0E32\u0E07\u0E32\u0E19") {
        alreadyCheckedInToday = true;
      }
    });

    if (alreadyCheckedInToday) {
      showModal("\u26A0\uFE0F \u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19", "\u0E04\u0E38\u0E13\u0E44\u0E14\u0E49\u0E17\u0E33\u0E01\u0E32\u0E23\u0E25\u0E07\u0E40\u0E27\u0E25\u0E32\u0E40\u0E02\u0E49\u0E32\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E44\u0E1B\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27 \u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E07\u0E0B\u0E49\u0E33\u0E44\u0E14\u0E49\u0E2D\u0E35\u0E01!", null, '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal(); showDashboard();\"\u003E\u0E15\u0E01\u0E25\u0E07\u003C/button\u003E');
      return;
    }

    navigator.geolocation.getCurrentPosition(function(pos) {
      var userLat = pos.coords.latitude;
      var userLng = pos.coords.longitude;

      db.ref('locations').once('value', function(snapshot) {
        var locObj = snapshot.val();
        var locationsList = [];

        if (locObj) {
          Object.keys(locObj).forEach(function(k) { locationsList.push(locObj[k]); });
        } else {
          locationsList = [
            { name: "\u0E08\u0E38\u0E14\u0E17\u0E35\u0E48 1 (\u0E2B\u0E19\u0E49\u0E32\u0E23\u0E49\u0E32\u0E19)", lat: 13.813105, lng: 100.067600, radius: 100 },
            { name: "\u0E08\u0E38\u0E14\u0E17\u0E35\u0E48 2 (\u0E42\u0E23\u0E07\u0E07\u0E32\u0E19)", lat: 13.873747, lng: 100.073376, radius: 100 }
          ];
        }

        var nearestLoc = locationsList[0];
        var minDistance = calculateDistance(userLat, userLng, nearestLoc.lat, nearestLoc.lng);

        locationsList.forEach(function(loc) {
          var dist = calculateDistance(userLat, userLng, loc.lat, loc.lng);
          if (dist < minDistance) { minDistance = dist; nearestLoc = loc; }
        });

        var allowedRadius = nearestLoc.radius || 100;
        if (minDistance > allowedRadius) {
          showModal("\uD83D\uDEAB \u0E2D\u0E22\u0E39\u0E48\u0E19\u0E2D\u0E01\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48", "\u0E04\u0E38\u0E13\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E48\u0E32\u0E07\u0E08\u0E32\u0E01 \"" + nearestLoc.name + "\" (" + minDistance + " \u0E21.)\n\u0E40\u0E01\u0E34\u0E19\u0E23\u0E31\u0E28\u0E21\u0E35\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14 (" + allowedRadius + " \u0E40\u0E21\u0E15\u0E23) \u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E07\u0E40\u0E27\u0E25\u0E32\u0E44\u0E14\u0E49!", null, '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal()\"\u003E\u0E15\u0E01\u0E25\u0E07\u003C/button\u003E');
          return;
        }

        var timeStr = now.toTimeString().substring(0, 5);

        PinThipSafe.logsRepo.writeLogEntry(db, {
          empId: currentUser.empId,
          empName: currentUser.empName,
          type: "\u0E40\u0E02\u0E49\u0E32\u0E07\u0E32\u0E19",
          date: dateStr,
          time: timeStr,
          lat: userLat,
          lng: userLng,
          distance: minDistance,
          nearestLocation: nearestLoc.name,
          device: getDeviceInfo(),
          reason: lateReason || "-"
        }, function(err) {
          if (!err) {
            showModal("\uD83C\uDF89 \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08", "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E40\u0E27\u0E25\u0E32\u0E40\u0E02\u0E49\u0E32\u0E07\u0E32\u0E19\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08!\n\uD83D\uDCCD \u0E1E\u0E37\u0E49\u0E19\u0E17\u0E35\u0E48: " + nearestLoc.name + " (" + minDistance + " \u0E21.)", null, '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal(); showDashboard();\"\u003E\u0E15\u0E01\u0E25\u0E07\u003C/button\u003E');
          }
        });
      });
    }, function(err) {
      alert("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E1B\u0E34\u0E14\u0E41\u0E25\u0E30\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C GPS \u0E1A\u0E19\u0E21\u0E37\u0E2D\u0E16\u0E37\u0E2D\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13");
    }, { enableHighAccuracy: true, timeout: 8000 });
  });
}

// ===== Leave Form =====
function showLeaveForm() {
  var t = i18n[currentLang];
  document.getElementById('pageTitle').innerText = t.pageTitleLeave;
  document.getElementById('listBox').style.display = "none";
  var today = getLocalDateTimeString();

      var html = '\u003Cdiv class=\"user-banner\"\u003E' + safeText(currentUser.empName) + ' (' + safeText(currentUser.empId) + ')\u003C/div\u003E' +
        '\u003Cselect id=\"leaveType\"\u003E' +
    '\u003Coption value=\"\u0E25\u0E32\u0E1B\u0E48\u0E27\u0E22\"\u003E' + t.optSick + '\u003C/option\u003E' +
    '\u003Coption value=\"\u0E25\u0E32\u0E01\u0E34\u0E08\"\u003E' + t.optPersonal + '\u003C/option\u003E' +
    '\u003Coption value=\"\u0E25\u0E32\u0E1E\u0E31\u0E01\u0E23\u0E49\u0E2D\u0E19\"\u003E' + t.optVacation + '\u003C/option\u003E' +
    '\u003C/select\u003E' +
    '\u003Cinput type=\"date\" id=\"startDate\" value=\"' + today + '\"\u003E' +
    '\u003Cinput type=\"date\" id=\"endDate\" value=\"' + today + '\"\u003E' +
    '\u003Ctextarea id=\"leaveReason\" rows=\"2\" placeholder=\"' + t.phReason + '\"\u003E\u003C/textarea\u003E' +
    '\u003Cbutton onclick=\"handleLeaveSubmit()\"\u003E' + t.btnSubmitLeave + '\u003C/button\u003E' +
    '\u003Cbutton class=\"btn-back\" onclick=\"showDashboard()\"\u003E' + t.btnBack + '\u003C/button\u003E';
  document.getElementById('mainContent').innerHTML = html;
}

function handleLeaveSubmit() {
  var leaveType = document.getElementById('leaveType').value;
  var startDate = document.getElementById('startDate').value;
  var endDate = document.getElementById('endDate').value;
  var reason = document.getElementById('leaveReason').value.trim();

  if (!reason) { alert("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25"); return; }

  db.ref('leaves').push().set({
    empId: currentUser.empId,
    empName: currentUser.empName,
    leaveType: leaveType,
    startDate: startDate,
    endDate: endDate,
    reason: reason,
    status: "\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34 \u23F3",
    applyDate: new Date().toLocaleDateString()
  }, function(err) {
    if (!err) {
      showModal("\uD83C\uDF89 \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08", "\u0E22\u0E37\u0E48\u0E19\u0E43\u0E1A\u0E25\u0E32\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22", '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal(); showDashboard();\"\u003E\u0E15\u0E01\u0E25\u0E07\u003C/button\u003E');
    }
  });
}

// ===== My Attendance History =====
function showMyAttendance() {
  var t = i18n[currentLang];
  document.getElementById('pageTitle').innerText = t.pageTitleHistory;
  document.getElementById('listBox').style.display = "none";
  document.getElementById('status').innerHTML = i18n[currentLang].checking;

  Promise.all([
    db.ref('settings/globalLateTime').once('value'),
    PinThipSafe.logsRepo.fetchAllLogs(db),
    db.ref('leaves').once('value')
  ]).then(function(results) {
    var settingsSnap = results[0];
    var logsObj = results[1];
    var leaveSnap = results[2];
    var globalLateTime = settingsSnap.val() || "08:00";
    var leavesObj = leaveSnap.val() || {};

    var presentDays = 0;
    var lateRecords = [];

    Object.values(logsObj).forEach(function(item) {
      if (String(item.empId) === String(currentUser.empId) && item.type === "\u0E40\u0E02\u0E49\u0E32\u0E07\u0E32\u0E19") {
        presentDays++;
        if (item.time > globalLateTime) {
          lateRecords.push(item);
        }
      }
    });

    var leaveCount = 0;
    var leaveRecords = [];
    Object.values(leavesObj).forEach(function(item) {
      var statusStr = String(item.status || '');
      if (String(item.empId) === String(currentUser.empId) && statusStr.indexOf('\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34') !== -1) {
        leaveCount++;
        leaveRecords.push(item);
      }
    });

    document.getElementById('status').innerHTML = "";

    var html = '\u003Cdiv class=\"user-banner\"\u003E\uD83D\uDC64 ' + safeText(currentUser.empName) + ' (' + safeText(currentUser.empId) + ')\u003C/div\u003E' +
      '\u003Cdiv style=\"display: flex; gap: 8px; margin-bottom: 15px;\"\u003E' +
      '\u003Cdiv class=\"stat-box\" style=\"background:#e8f5e9; color:#2e7d32; padding: 12px; border-radius: 10px; flex:1;\"\u003E\u0E21\u0E32\u0E17\u0E33\u0E07\u0E32\u0E19\u0E23\u0E27\u0E21\u003Cbr\u003E\u003Cb style=\"font-size:20px;\"\u003E' + presentDays + '\u003C/b\u003E \u0E27\u0E31\u0E19\u003C/div\u003E' +
      '\u003Cdiv class=\"stat-box\" style=\"background:#fff3cd; color:#856404; padding: 12px; border-radius: 10px; flex:1;\"\u003E\u0E21\u0E32\u0E2A\u0E32\u0E22\u003Cbr\u003E\u003Cb style=\"font-size:20px;\"\u003E' + lateRecords.length + '\u003C/b\u003E \u0E04\u0E23\u0E31\u0E49\u0E07\u003C/div\u003E' +
      '\u003Cdiv class=\"stat-box\" style=\"background:#e2e3e5; color:#383d41; padding: 12px; border-radius: 10px; flex:1;\"\u003E\u0E25\u0E32\u0E07\u0E32\u0E19\u003Cbr\u003E\u003Cb style=\"font-size:20px;\"\u003E' + leaveCount + '\u003C/b\u003E \u0E27\u0E31\u0E19\u003C/div\u003E' +
      '\u003C/div\u003E';

    if (lateRecords.length > 0 || leaveRecords.length > 0) {
      html += '\u003Cdiv style=\"text-align:left; font-weight:bold; margin: 15px 0 5px 0; color:#495057;\"\u003E\uD83D\uDCCC \u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14\u0E27\u0E31\u0E19\u0E21\u0E32\u0E2A\u0E32\u0E22 \u0E2B\u0E23\u0E37\u0E2D \u0E27\u0E31\u0E19\u0E25\u0E32:\u003C/div\u003E';

      lateRecords.slice().reverse().forEach(function(item) {
        html += '\u003Cdiv class=\"history-item\" style=\"background: #fff3cd; border-left: 4px solid #ffc107;\"\u003E' +
          '\u23F0 \u003Cb\u003E\u0E21\u0E32\u0E2A\u0E32\u0E22\u003C/b\u003E \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48: ' + item.date + ' (\u0E40\u0E27\u0E25\u0E32\u0E2A\u0E41\u0E01\u0E19: \u003Cb style=\"color:#d9534f;\"\u003E' + item.time + ' \u0E19.\u003C/b\u003E)\u003Cbr\u003E' +
          '\u003Cspan style=\"font-size:12px; color:#555;\"\u003E\u0E40\u0E01\u0E13\u0E11\u0E4C\u0E40\u0E27\u0E25\u0E32\u0E40\u0E02\u0E49\u0E32\u0E07\u0E32\u0E19: ' + globalLateTime + ' \u0E19.\u003C/span\u003E\u003C/div\u003E';
      });

      leaveRecords.slice().reverse().forEach(function(item) {
        html += '\u003Cdiv class=\"history-item\" style=\"background: #e2e3e5; border-left: 4px solid #6c757d;\"\u003E' +
          '\uD83C\uDF34 \u003Cb\u003E' + safeText(item.leaveType) + '\u003C/b\u003E (' + safeText(item.status) + ')\u003Cbr\u003E' +
          '\uD83D\uDCC5 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48: ' + safeText(item.startDate) + ' \u0E16\u0E36\u0E07 ' + safeText(item.endDate) + '\u003Cbr\u003E' +
          '\uD83D\uDCAC \u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25: ' + safeText(item.reason) + '\u003C/div\u003E';
      });
    } else {
      html += '\u003Cdiv style=\"color: #28a745; background: #e8f5e9; padding: 15px; border-radius: 10px; margin-top: 15px; font-weight: bold;\"\u003E\uD83C\uDF89 \u0E22\u0E2D\u0E14\u0E40\u0E22\u0E35\u0E48\u0E22\u0E21! \u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E40\u0E04\u0E22\u0E21\u0E32\u0E2A\u0E32\u0E22\u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E25\u0E32\u0E40\u0E25\u0E22\u003C/div\u003E';
    }

    html += '\u003Cbutton class=\"btn-back\" onclick=\"showDashboard()\" style=\"margin-top:15px;\"\u003E' + t.btnBack + '\u003C/button\u003E';
    document.getElementById('mainContent').innerHTML = html;
  });
}

function showHistory() {
  var t = i18n[currentLang];
  document.getElementById('pageTitle').innerText = "\uD83D\uDCDC \u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E25\u0E32 & \u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22";
  document.getElementById('listBox').style.display = "none";

  Promise.all([
    db.ref('leaves').once('value'),
    db.ref('fuel_requests').once('value')
  ]).then(function(results) {
    var leaveSnap = results[0];
    var fuelSnap = results[1];
    var leavesObj = leaveSnap.val() || {};
    var fuelObj = fuelSnap.val() || {};

    var myLeaves = Object.values(leavesObj).filter(function(item) {
      return String(item.empId) === String(currentUser.empId);
    });
    var myFuels = Object.values(fuelObj).filter(function(item) {
      return String(item.empId) === String(currentUser.empId);
    });

    var html = '\u003Cdiv class=\"user-banner\"\u003E' + safeText(currentUser.empName) + '\u003C/div\u003E';
    html += '\u003Cb\u003E\uD83C\uDF34 \u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E25\u0E32:\u003C/b\u003E';
    if (myLeaves.length === 0) html += '\u003Cdiv style=\"color:#888; font-size:12px;\"\u003E\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E25\u0E32\u003C/div\u003E';
    myLeaves.forEach(function(item) {
      html += '\u003Cdiv class=\"history-item\"\u003E\u003Cb\u003E' + safeText(item.leaveType) + '\u003C/b\u003E (' + safeText(item.status) + ')\u003Cbr\u003E\uD83D\uDCC5 ' + safeText(item.startDate) + ' \u0E16\u0E36\u0E07 ' + safeText(item.endDate) + '\u003C/div\u003E';
    });

    if (currentUser.isDriver) {
      html += '\u003Cbr\u003E\u003Cb\u003E\u26FD/\uD83D\uDD27 \u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E40\u0E1A\u0E34\u0E01\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19 / \u0E04\u0E48\u0E32\u0E0B\u0E48\u0E2D\u0E21:\u003C/b\u003E';
      if (myFuels.length === 0) html += '\u003Cdiv style=\"color:#888; font-size:12px;\"\u003E\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u003C/div\u003E';
      myFuels.forEach(function(item) {
        var typeLabel = safeText(item.requestType || '\u0E40\u0E1A\u0E34\u0E01\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19');
        var plateInfo = item.carPlate ? ' (\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19: ' + safeText(item.carPlate) + ')' : '';
        var amtDisplay = item.amount > 0 ? item.amount + ' \u0E1A\u0E32\u0E17' : '\u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14';
        var routeInfo = item.route && item.route !== '-' ? '\u003Cbr\u003E\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14: ' + safeText(item.route) : '';
        html += '\u003Cdiv class=\"history-item\"\u003E[' + typeLabel + ']' + plateInfo + routeInfo + ' | \u003Cb\u003E\u0E22\u0E2D\u0E14: ' + amtDisplay + '\u003C/b\u003E (' + safeText(item.status) + ')\u003Cbr\u003E\uD83D\uDCC5 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48: ' + safeText(item.date) + '\u003C/div\u003E';
      });
    }

    html += '\u003Cbutton class=\"btn-back\" onclick=\"showDashboard()\"\u003E' + t.btnBack + '\u003C/button\u003E';
    document.getElementById('mainContent').innerHTML = html;
  });
}

// ===== Today List (Quick Stats) =====
var todayListRefreshTimer = null;
// OPTIMIZATION: keep a single set of realtime listeners for today's logs + leaves so
// the UI updates the moment someone clocks in, instead of re-fetching the entire
// settings/employees/logs/leaves tree every 15 seconds via setTimeout.
var todayListListeners = { logs: null, leaves: null, settings: null, employees: null };
var todayListLatest = { globalLateTime: '08:00', employeesObj: {}, logsObj: {}, leavesObj: {} };
var todayListRenderPending = false;

function stopTodayListRealtime() {
  try {
    if (todayListListeners.logs) { db.ref('logs/' + getLocalDateTimeString().slice(0, 7)).off('value', todayListListeners.logs); todayListListeners.logs = null; }
    if (todayListListeners.leaves) { db.ref('leaves').off('value', todayListListeners.leaves); todayListListeners.leaves = null; }
    if (todayListListeners.settings) { db.ref('settings/globalLateTime').off('value', todayListListeners.settings); todayListListeners.settings = null; }
    if (todayListListeners.employees) { db.ref('employees').off('value', todayListListeners.employees); todayListListeners.employees = null; }
  } catch (e) {
    console.warn('stopTodayListRealtime failed:', e);
  }
}

function scheduleTodayListRender() {
  if (todayListRenderPending) return;
  todayListRenderPending = true;
  var run = function () { todayListRenderPending = false; renderTodayList(); };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  else setTimeout(run, 16);
}

function loadTodayListRealtime() {
  var container = document.getElementById('checkinContainer');
  if (!container) return;

  // OPTIMIZATION: replace the 15s setTimeout polling loop with Firebase realtime
  // listeners. The dashboard now updates instantly on clock-in/leave changes with a
  // single open connection per path instead of 4 once()-reads every 15 seconds.
  stopTodayListRealtime();

  todayListListeners.settings = db.ref('settings/globalLateTime').on('value', function(snap) {
    todayListLatest.globalLateTime = snap.val() || '08:00';
    scheduleTodayListRender();
  });
  todayListListeners.employees = db.ref('employees').on('value', function(snap) {
    todayListLatest.employeesObj = snap.val() || {};
    scheduleTodayListRender();
  });
  todayListListeners.logs = db.ref('logs/' + getLocalDateTimeString().slice(0, 7)).on('value', function(snap) {
    todayListLatest.logsObj = snap.val() || {};
    scheduleTodayListRender();
  });
  todayListListeners.leaves = db.ref('leaves').on('value', function(snap) {
    todayListLatest.leavesObj = snap.val() || {};
    scheduleTodayListRender();
  });

  renderTodayList();
}

function renderTodayList() {
  var container = document.getElementById('checkinContainer');
  var statsContainer = document.getElementById('quickStatsContainer');
  if (!container) return;

  var todayStr = getLocalDateTimeString();
  var globalLateTime = todayListLatest.globalLateTime || '08:00';
  var employeesObj = todayListLatest.employeesObj || {};
  var logsObj = todayListLatest.logsObj || {};
  var leavesObj = todayListLatest.leavesObj || {};

    var allEmployees = Object.values(employeesObj);
    // OPTIMIZATION: index today's check-ins and approved leaves by empId once so the
    // per-employee lookup is O(1) instead of O(logs) with repeated .find() calls.
    var checkedInByEmpId = {};
    Object.values(logsObj).forEach(function(l) {
      if (l.date === todayStr && l.type === "\u0E40\u0E02\u0E49\u0E32\u0E07\u0E32\u0E19") {
        checkedInByEmpId[String(l.empId)] = l;
      }
    });
    var approvedLeaveByEmpId = {};
    Object.values(leavesObj).forEach(function(l) {
      if (String(l.status || '').indexOf('\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27') !== -1 && l.startDate <= todayStr && l.endDate >= todayStr) {
        approvedLeaveByEmpId[String(l.empId)] = l;
      }
    });

    var leaveList = [];
    var presentList = [];
    var lateList = [];
    var absentList = [];

    allEmployees.forEach(function(emp) {
      var empIdStr = String(emp.empId);
      var leave = approvedLeaveByEmpId[empIdStr];
      var present = checkedInByEmpId[empIdStr];
      if (leave) {
        leaveList.push({ emp: emp, leave: leave });
      } else if (present) {
        (present.time > globalLateTime ? lateList : presentList).push({ emp: emp, present: present });
      } else {
        absentList.push({ emp: emp });
      }
    });

    presentList.sort(function(a, b) { return (a.present.time || "").localeCompare(b.present.time || ""); });
    lateList.sort(function(a, b) { return (a.present.time || "").localeCompare(b.present.time || ""); });

    var html = '';
    leaveList.forEach(function(item) {
      html += '\u003Cdiv class=\"emp-tag-leave\"\u003E\u003Cspan\u003E\uD83C\uDF34 ' + safeText(item.emp.empName) + '\u003C/span\u003E\u003Cspan\u003E\u003Cb\u003E' + safeText(item.leave.leaveType) + '\u003C/b\u003E\u003C/span\u003E\u003C/div\u003E';
    });
    presentList.forEach(function(item) {
      html += '\u003Cdiv class=\"emp-tag-present\"\u003E\u003Cspan\u003E\uD83D\uDFE2 ' + safeText(item.emp.empName) + '\u003C/span\u003E\u003Cspan\u003E\u003Cb\u003E' + safeText(item.present.time) + ' \u0E19.\u003C/b\u003E\u003C/span\u003E\u003C/div\u003E';
    });
    lateList.forEach(function(item) {
      html += '\u003Cdiv class=\"emp-tag-late\"\u003E\u003Cspan\u003E\u23F0 ' + safeText(item.emp.empName) + '\u003C/span\u003E\u003Cspan\u003E\u003Cb style=\"color:#d9534f;\"\u003E\u0E2A\u0E32\u0E22 ' + safeText(item.present.time) + ' \u0E19.\u003C/b\u003E\u003C/span\u003E\u003C/div\u003E';
    });
    absentList.forEach(function(item) {
      html += '\u003Cdiv class=\"emp-tag-absent\"\u003E\u003Cspan\u003E\uD83D\uDD34 ' + safeText(item.emp.empName) + '\u003C/span\u003E\u003Cspan style=\"font-size:11px;\"\u003E\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E25\u0E07\u0E40\u0E27\u0E25\u0E32\u003C/span\u003E\u003C/div\u003E';
    });

    var totalPresentCount = presentList.length + lateList.length;
    if (statsContainer) {
      statsContainer.innerHTML = '\u003Cdiv class=\"stats-card-container\"\u003E' +
        '\u003Cdiv class=\"stat-box\" style=\"background:#e8f5e9; color:#2e7d32;\"\u003E\u0E21\u0E32\u003Cb\u003E' + totalPresentCount + '\u003C/b\u003E\u003C/div\u003E' +
        '\u003Cdiv class=\"stat-box\" style=\"background:#fff3cd; color:#856404;\"\u003E\u0E25\u0E32\u003Cb\u003E' + leaveList.length + '\u003C/b\u003E\u003C/div\u003E' +
        '\u003Cdiv class=\"stat-box\" style=\"background:#ffebee; color:#c62828;\"\u003E\u0E44\u0E21\u0E48\u0E21\u0E32\u003Cb\u003E' + absentList.length + '\u003C/b\u003E\u003C/div\u003E' +
        '\u003C/div\u003E';
    }
    container.innerHTML = html;
}

// ===== Holiday Management =====
function showHolidayManagement() {
  isAdmin = true;
  window.isAdmin = true;
  document.getElementById('mainCard').classList.add('admin-wide');
  document.getElementById('hamburgerBtn').style.display = 'block';
  document.getElementById('bellBtn').style.display = 'block';
  document.getElementById('pageTitle').innerText = "\uD83D\uDCC5\uFE0F \u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E27\u0E31\u0E19\u0E2B\u0E22\u0E38\u0E14\u0E23\u0E49\u0E32\u0E19";
  document.getElementById('listBox').style.display = "none";
  db.ref('holidays').once('value', function(snapshot) {
    var holObj = snapshot.val() || {};
    var html = '\u003Cdiv style=\"background:#eef2f5; padding:12px; border-radius:10px; margin-bottom:15px; text-align:left;\"\u003E' +
      '\u003Cb\u003E\u2795 \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E27\u0E31\u0E19\u0E2B\u0E22\u0E38\u0E14:\u003C/b\u003E' +
      '\u003Cinput type=\"date\" id=\"hDate\" value=\"' + getLocalDateTimeString() + '\" style=\"margin-top:5px;\"\u003E' +
      '\u003Cinput type=\"text\" id=\"hName\" placeholder=\"\u0E0A\u0E37\u0E48\u0E2D\u0E27\u0E31\u0E19\u0E2B\u0E22\u0E38\u0E14\" style=\"margin-top:5px;\"\u003E' +
      '\u003Cbutton class=\"btn-blue\" onclick=\"addHoliday()\" style=\"margin-top:8px;\"\u003E\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E27\u0E31\u0E19\u0E2B\u0E22\u0E38\u0E14\u003C/button\u003E' +
      '\u003C/div\u003E';
    Object.keys(holObj).forEach(function(k) {
      html += '\u003Cdiv class=\"history-item\"\u003E' + holObj[k].date + ' - ' + holObj[k].name + ' \u003Cbutton onclick=\"delHoliday(\'' + k + '\')\" style=\"width:auto; padding:2px 8px; background:#dc3545; float:right;\"\u003E\u0E25\u0E1A\u003C/button\u003E\u003C/div\u003E';
    });
    html += '\u003Cbutton class=\"btn-back\" onclick=\"showAdminDashboard()\" style=\"margin-top:15px;\"\u003E\u2B05\uFE0F \u0E01\u0E25\u0E31\u0E1A\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E14\u0E2A\u0E1A\u0E2D\u0E23\u0E4C\u0E14\u003C/button\u003E';
    document.getElementById('mainContent').innerHTML = html;
  });
}

function addHoliday() {
  var d = document.getElementById('hDate').value;
  var n = document.getElementById('hName').value.trim();
  if (!d || !n) return;
  db.ref('holidays').push().set({ date: d, name: n }, function() { showHolidayManagement(); });
}

function delHoliday(k) {
  db.ref('holidays/' + k).remove(function() { showHolidayManagement(); });
}

// ===== Logout =====
function handleLogout() {
  if (typeof stopTodayListRealtime === 'function') stopTodayListRealtime();
  if (typeof stopDeviceAccessGuard === 'function') stopDeviceAccessGuard();
  if (typeof stopDevicePresence === 'function') stopDevicePresence();
  if (typeof stopAdminNotificationListener === 'function') stopAdminNotificationListener();

  // Revoke session token on server before clearing local state
  try {
    var sessionInfo = PinThipSafe.session ? PinThipSafe.session.restoreSession() : null;
    var token = sessionInfo && sessionInfo.credentials && sessionInfo.credentials.sessionToken;
    if (token && window.firebase && window.firebase.functions) {
      var logoutCallable = window.firebase.functions().httpsCallable('logout');
      logoutCallable({ sessionToken: token }).then(function() {
        console.log('Session token revoked on server');
      }).catch(function(err) {
        console.warn('Server revoke failed (will still clear local):', err);
      });
    }
  } catch (e) {
    console.warn('Unable to revoke session:', e);
  }

  if (window.firebase?.auth) {
    firebase.auth().signOut().then(function() {
      console.log('Firebase Auth sign-out successful');
    }).catch(function(err) {
      console.warn('Firebase Auth sign-out error:', err);
    });
  }
  currentUser = null;
  window.currentUser = null;
  isAdmin = false;
  window.isAdmin = false;
  if (typeof showNotificationSoundControl === 'function') showNotificationSoundControl(false);
  if (PinThipSafe && PinThipSafe.session) PinThipSafe.session.clearAuthState();
  if (typeof showLoginForm === 'function') showLoginForm();
}

// ========================================================
// ADMIN NOTIFICATION LISTENERS (keep with employee-ui for now)
// ========================================================
var pendingLeavesCache = [];
var pendingFuelsCache = [];
var pendingFoamCache = [];
var notifiedFoamKeys = {};
var isInitialLoadLeaves = true;
var notifiedLeavesKeys = {};
var isInitialLoadFuels = true;
var notifiedFuelsKeys = {};
var isInitialLoadFoam = true;

// Track realtime listener refs so we can detach them on logout (prevents leak on re-login)
var adminNotificationListeners = { foam: null, leaves: null, fuels: null };

function stopAdminNotificationListener() {
  try {
    if (adminNotificationListeners.foam) {
      db.ref('foam_delivery_requests').off('value', adminNotificationListeners.foam);
      adminNotificationListeners.foam = null;
    }
    if (adminNotificationListeners.leaves) {
      db.ref('leaves').off('value', adminNotificationListeners.leaves);
      adminNotificationListeners.leaves = null;
    }
    if (adminNotificationListeners.fuels) {
      db.ref('fuel_requests').off('value', adminNotificationListeners.fuels);
      adminNotificationListeners.fuels = null;
    }
  } catch (e) {
    console.warn('stopAdminNotificationListener failed:', e);
  }
  // Reset initial-load flags so next login starts fresh
  isInitialLoadFoam = true;
  isInitialLoadLeaves = true;
  isInitialLoadFuels = true;
}

function startAdminNotificationListener() {
  // Idempotent: detach any existing listeners first so re-login doesn't stack callbacks
  stopAdminNotificationListener();
  document.getElementById('bellBtn').style.display = 'block';

  adminNotificationListeners.foam = db.ref('foam_delivery_requests').on('value', function(snap) {
    var obj = snap.val() || {};
    pendingFoamCache = [];
    var newPendingFoamCount = 0;
    var hasNewFoamItem = false;

    Object.keys(obj).forEach(function(dateKey) {
      var group = obj[dateKey] || {};
      Object.keys(group).forEach(function(k) {
        var item = group[k];
        if (String(item.status || '').indexOf('pending') !== -1) {
          var compositeKey = dateKey + '/' + k;
          pendingFoamCache.push({ key: k, dateKey: dateKey, ...item });
          newPendingFoamCount++;
          if (!notifiedFoamKeys[compositeKey]) {
            hasNewFoamItem = true;
            notifiedFoamKeys[compositeKey] = true;
          }
        }
      });
    });

    if (!isInitialLoadFoam && hasNewFoamItem) {
      if (typeof playNotificationAlert === 'function') playNotificationAlert('มีรายการป้ายลังโฟมรออนุมัติ');
      if (typeof showDesktopNotification === 'function') showDesktopNotification('มีรายการป้ายลังโฟม', 'รายการส่งลังโฟมใหม่รอแอดมินตรวจสอบ');
      showModal('🔔 มีรายการป้ายลังโฟม', 'มีรายการส่งลังโฟมใหม่ที่ต้องตรวจสอบ', '<button class="btn-ok" onclick="closeModal(); showFoamAdminView();">ตกลง</button>');
    }

    isInitialLoadFoam = false;
    updateAdminBellBadgeCount();
  });

  adminNotificationListeners.leaves = db.ref('leaves').on('value', function(snap) {
    var obj = snap.val() || {};
    pendingLeavesCache = [];
    var newPendingCount = 0;
    var hasNewLeave = false;

    Object.keys(obj).forEach(function(k) {
      if (String(obj[k].status || '').indexOf('\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34') !== -1) {
        pendingLeavesCache.push({ key: k, ...obj[k] });
        newPendingCount++;
        if (!notifiedLeavesKeys[k]) {
          hasNewLeave = true;
          notifiedLeavesKeys[k] = true;
        }
      }
    });

    if (!isInitialLoadLeaves && hasNewLeave) {
      if (typeof playNotificationAlert === 'function') playNotificationAlert('\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E25\u0E32\u0E43\u0E2B\u0E21\u0E48 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A');
      if (typeof showDesktopNotification === 'function') showDesktopNotification('\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E25\u0E32\u0E43\u0E2B\u0E21\u0E48', '\u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E25\u0E32\u0E08\u0E32\u0E01\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19');
      showModal("\uD83D\uDD14 \u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E04\u0E33\u0E02\u0E2D\u0E43\u0E2B\u0E21\u0E48", "\u0E21\u0E35\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E25\u0E32\u0E21\u0E32\u0E43\u0E2B\u0E21\u0E48 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E43\u0E19\u0E40\u0E21\u0E19\u0E39\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E1A\u0E25\u0E32", '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal()\"\u003E\u0E15\u0E01\u0E25\u0E07\u003C/button\u003E');
    }
    isInitialLoadLeaves = false;
    updateAdminBellBadgeCount();
  });

  adminNotificationListeners.fuels = db.ref('fuel_requests').on('value', function(snap) {
    var obj = snap.val() || {};
    pendingFuelsCache = [];
    var newFuelPendingCount = 0;
    var hasNewFuel = false;

    Object.keys(obj).forEach(function(k) {
      if (String(obj[k].status || '').indexOf('\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34') !== -1) {
        pendingFuelsCache.push({ key: k, ...obj[k] });
        newFuelPendingCount++;
        if (!notifiedFuelsKeys[k]) {
          hasNewFuel = true;
          notifiedFuelsKeys[k] = true;
        }
      }
    });

    if (!isInitialLoadFuels && hasNewFuel) {
      if (typeof playNotificationAlert === 'function') playNotificationAlert('\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E04\u0E48\u0E32\u0E0B\u0E48\u0E2D\u0E21\u0E43\u0E2B\u0E21\u0E48 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A');
      if (typeof showDesktopNotification === 'function') showDesktopNotification('\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E43\u0E2B\u0E21\u0E48', '\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E04\u0E48\u0E32\u0E0B\u0E48\u0E2D\u0E21\u0E23\u0E16');
      showModal("\uD83D\uDD14 \u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E43\u0E2B\u0E21\u0E48", "\u0E21\u0E35\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19/\u0E04\u0E48\u0E32\u0E0B\u0E48\u0E2D\u0E21\u0E23\u0E16\u0E21\u0E32\u0E43\u0E2B\u0E21\u0E48", '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal()\"\u003E\u0E15\u0E01\u0E25\u0E07\u003C/button\u003E');
    }
    isInitialLoadFuels = false;
    updateAdminBellBadgeCount();
  });
}

function updateAdminBellBadgeCount() {
  var totalPending = pendingLeavesCache.length + pendingFuelsCache.length + pendingFoamCache.length;
  var badge = document.getElementById('bellBadge');
  if (badge) {
    if (totalPending > 0) {
      badge.innerText = totalPending;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  var leavesBadge = document.getElementById('pendingLeavesBadge');
  var fuelsBadge = document.getElementById('pendingFuelsBadge');
  var foamBadge = document.getElementById('pendingFoamBadge');
  if (leavesBadge) {
    leavesBadge.innerText = pendingLeavesCache.length;
    leavesBadge.style.display = pendingLeavesCache.length > 0 ? 'inline-block' : 'none';
  }
  if (fuelsBadge) {
    fuelsBadge.innerText = pendingFuelsCache.length;
    fuelsBadge.style.display = pendingFuelsCache.length > 0 ? 'inline-block' : 'none';
  }
  if (foamBadge) {
    foamBadge.innerText = pendingFoamCache.length;
    foamBadge.style.display = pendingFoamCache.length > 0 ? 'inline-block' : 'none';
  }
  if (typeof updatePendingDevicesBadge === 'function') updatePendingDevicesBadge();

  ['dashboardLeavesBadge', 'quickLeavesBadge'].forEach(function(id) {
    var element = document.getElementById(id);
    if (element) {
      element.innerText = pendingLeavesCache.length;
      element.style.display = pendingLeavesCache.length > 0 ? 'inline-block' : 'none';
    }
  });
  ['dashboardFuelsBadge', 'quickFuelsBadge'].forEach(function(id) {
    var element = document.getElementById(id);
    if (element) {
      element.innerText = pendingFuelsCache.length;
      element.style.display = pendingFuelsCache.length > 0 ? 'inline-block' : 'none';
    }
  });
}


function showNotificationModal() {
  if (isAdmin) {
    showAdminNotificationModal();
  }
}

function showAdminNotificationModal() {
  var html = '\u003Cdiv style=\"max-height: 55vh; overflow-y: auto; font-size: 15px; line-height: 1.6;\"\u003E';

  if (pendingLeavesCache.length === 0 && pendingFuelsCache.length === 0 && pendingFoamCache.length === 0) {
    html += '\u003Cdiv style=\"text-align:center; color:#888; padding:20px;\"\u003E\uD83C\uDF89 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E04\u0E33\u0E02\u0E2D\u0E17\u0E35\u0E48\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49\u003C/div\u003E';
  } else {
    if (pendingLeavesCache.length > 0) {
      html += '\u003Cdiv style=\"font-weight:bold; color:#fd7e14; margin-bottom:5px;\"\u003E\uD83C\uDF34 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E02\u0E2D\u0E25\u0E32\u0E07\u0E32\u0E19 (' + pendingLeavesCache.length + '):\u003C/div\u003E';
      pendingLeavesCache.forEach(function(item) {
        var empName = safeText(item.empName || '');
        var leaveType = safeText(item.leaveType || '');
        var startDate = safeText(item.startDate || '');
        var endDate = safeText(item.endDate || '');
        var reason = safeText(item.reason || '');
        html += '\u003Cdiv class=\"history-item\" style=\"cursor:pointer; background:#fff3cd;\" onclick=\"closeModal(); showAdminLeaves();\"\u003E' +
          '\u003Cb\u003E\uD83D\uDC64 ' + empName + '\u003C/b\u003E (' + leaveType + ')\u003Cbr\u003E' +
          '\uD83D\uDCC5 ' + startDate + ' \u0E16\u0E36\u0E07 ' + endDate + '\u003Cbr\u003E' +
          '\uD83D\uDCAC \u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25: ' + reason + '\u003C/div\u003E';
      });
    }

    if (pendingFuelsCache.length > 0) {
      html += '\u003Cdiv style=\"font-weight:bold; color:#e67e22; margin-top:10px; margin-bottom:5px;\"\u003E\u26FD/\uD83D\uDD27 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19/\u0E04\u0E48\u0E32\u0E0B\u0E48\u0E2D\u0E21 (' + pendingFuelsCache.length + '):\u003C/div\u003E';
      pendingFuelsCache.forEach(function(item) {
        var empName = safeText(item.empName || '');
        var typeLabel = safeText(item.requestType || '\u0E40\u0E1A\u0E34\u0E01\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19');
        var plateText = item.carPlate ? '\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19: ' + safeText(item.carPlate) : '';
        var routeText = safeText(item.route || '-');
        html += '\u003Cdiv class=\"history-item\" style=\"cursor:pointer; background:#fff3cd;\" onclick=\"closeModal(); showAdminFuelRequests();\"\u003E' +
          '\u003Cb\u003E\uD83D\uDC64 ' + empName + '\u003C/b\u003E [' + typeLabel + '] ' + plateText + '\u003Cbr\u003E' +
          '\uD83D\uDCCD \u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14: ' + routeText + '\u003C/div\u003E';
      });
    }

    if (pendingFoamCache.length > 0) {
      html += '\u003Cdiv style=\"font-weight:bold; color:#0d6efd; margin-top:10px; margin-bottom:5px;\"\u003E\uD83D\uDCE6 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E1B\u0E49\u0E33\u0E22\u0E19\u0E25\u0E39\u0E1D\u0E4C\u0E21\u0E4C\u0E2D\u0E2D\u0E19 (' + pendingFoamCache.length + '):\u003C/div\u003E';
      pendingFoamCache.forEach(function(item) {
        var custName = safeText((item.customerSnapshot && item.customerSnapshot.name) || 'ลูกค้าใหม่');
        html += '\u003Cdiv class=\"history-item\" style=\"cursor:pointer; background:#eaf3ff;\" onclick=\"closeModal(); showFoamAdminView();\"\u003E' +
          '\u003Cb\u003E\uD83C\uDFEC ' + custName + '\u003C/b\u003E\u003Cbr\u003E' +
          '\uD83D\uDCE6 \u0E2D\u0E32\u0E23\u0E39\u0E07\u0E40\u0E25\u0E37\u0E2D: ' + (item.boxCount || 1) + '\u003Cbr\u003E' +
          '\uD83D\uDE9A \u0E02\u0E19\u0E31\u0E14: ' + (shipping || '-') + '\u003C/div\u003E';
      });
    }
  }

  html += '\u003C/div\u003E';
  showModal("\uD83D\uDD14 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34", "", html, '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal()\"\u003E\u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u003C/button\u003E');
  document.getElementById('modalBoxContainer').classList.add('modal-medium');
}