/**
 * employee-ui.js — Employee dashboard, clock-in, leave, history, logout
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
    statusEl.innerHTML = '\u26A0\uFE0F \u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E44\u0E14\u0E49\u0E01\u0E23\u0E38\u0E13\u0E32\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E21\u0E48';
    statusEl.className = 'user-status-badge status-error';
  });
}

function showClockInForm() {
  var t = i18n[currentLang];
  document.getElementById('pageTitle').innerText = t.pageTitleClockIn;
  document.getElementById('listBox').style.display = "none";

  var html = '\u003Cdiv class=\"user-banner\"\u003E' + currentUser.empName + ' (' + currentUser.empId + ')\u003C/div\u003E' +
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

  var html = '\u003Cdiv class=\"user-banner\"\u003E' + currentUser.empName + ' (' + currentUser.empId + ')\u003C/div\u003E' +
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

    var html = '\u003Cdiv class=\"user-banner\"\u003E\uD83D\uDC64 ' + currentUser.empName + ' (' + currentUser.empId + ')\u003C/div\u003E' +
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
          '\uD83C\uDF34 \u003Cb\u003E' + item.leaveType + '\u003C/b\u003E (' + item.status + ')\u003Cbr\u003E' +
          '\uD83D\uDCC5 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48: ' + item.startDate + ' \u0E16\u0E36\u0E07 ' + item.endDate + '\u003Cbr\u003E' +
          '\uD83D\uDCAC \u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25: ' + item.reason + '\u003C/div\u003E';
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

    var html = '\u003Cdiv class=\"user-banner\"\u003E' + currentUser.empName + '\u003C/div\u003E';
    html += '\u003Cb\u003E\uD83C\uDF34 \u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E25\u0E32:\u003C/b\u003E';
    if (myLeaves.length === 0) html += '\u003Cdiv style=\"color:#888; font-size:12px;\"\u003E\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E01\u0E32\u0E23\u0E25\u0E32\u003C/div\u003E';
    myLeaves.forEach(function(item) {
      html += '\u003Cdiv class=\"history-item\"\u003E\u003Cb\u003E' + item.leaveType + '\u003C/b\u003E (' + item.status + ')\u003Cbr\u003E\uD83D\uDCC5 ' + item.startDate + ' \u0E16\u0E36\u0E07 ' + item.endDate + '\u003C/div\u003E';
    });

    if (currentUser.isDriver) {
      html += '\u003Cbr\u003E\u003Cb\u003E\u26FD/\uD83D\uDD27 \u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E40\u0E1A\u0E34\u0E01\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19 / \u0E04\u0E48\u0E32\u0E0B\u0E48\u0E2D\u0E21:\u003C/b\u003E';
      if (myFuels.length === 0) html += '\u003Cdiv style=\"color:#888; font-size:12px;\"\u003E\u0E44\u0E21\u0E48\u0E21\u0E35\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u003C/div\u003E';
      myFuels.forEach(function(item) {
        var typeLabel = item.requestType || '\u0E40\u0E1A\u0E34\u0E01\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19';
        var plateInfo = item.carPlate ? ' (\u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19: ' + item.carPlate + ')' : '';
        var amtDisplay = item.amount > 0 ? item.amount + ' \u0E1A\u0E32\u0E17' : '\u0E23\u0E2D\u0E41\u0E2D\u0E14\u0E21\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14';
        var routeInfo = item.route && item.route !== '-' ? '\u003Cbr\u003E\u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14: ' + item.route : '';
        html += '\u003Cdiv class=\"history-item\"\u003E[' + typeLabel + ']' + plateInfo + routeInfo + ' | \u003Cb\u003E\u0E22\u0E2D\u0E14: ' + amtDisplay + '\u003C/b\u003E (' + item.status + ')\u003Cbr\u003E\uD83D\uDCC5 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48: ' + item.date + '\u003C/div\u003E';
      });
    }

    html += '\u003Cbutton class=\"btn-back\" onclick=\"showDashboard()\"\u003E' + t.btnBack + '\u003C/button\u003E';
    document.getElementById('mainContent').innerHTML = html;
  });
}

// ===== Today List (Quick Stats) =====
var todayListRefreshTimer = null;

function loadTodayListRealtime() {
  var container = document.getElementById('checkinContainer');
  var statsContainer = document.getElementById('quickStatsContainer');
  if (!container) return;

  var todayStr = getLocalDateTimeString();

  Promise.all([
    db.ref('settings/globalLateTime').once('value'),
    db.ref('employees').once('value'),
    PinThipSafe.logsRepo.fetchLogsForRange(db, todayStr, todayStr),
    db.ref('leaves').once('value')
  ]).then(function(results) {
    var settingsSnap = results[0];
    var empSnap = results[1];
    var logsObj = results[2];
    var leaveSnap = results[3];
    var globalLateTime = settingsSnap.val() || "08:00";
    var employeesObj = empSnap.val() || {};
    var leavesObj = leaveSnap.val() || {};

    var allEmployees = Object.values(employeesObj);
    var checkedInList = Object.values(logsObj).filter(function(l) {
      return l.date === todayStr && l.type === "\u0E40\u0E02\u0E49\u0E32\u0E07\u0E32\u0E19";
    });
    var approvedLeavesToday = Object.values(leavesObj).filter(function(l) {
      return String(l.status || '').indexOf('\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27') !== -1 && l.startDate <= todayStr && l.endDate >= todayStr;
    });

    var leaveList = [];
    var presentList = [];
    var lateList = [];
    var absentList = [];

    allEmployees.forEach(function(emp) {
      var present = checkedInList.find(function(item) { return String(item.empId) === String(emp.empId); });
      var leave = approvedLeavesToday.find(function(item) { return String(item.empId) === String(emp.empId); });
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
      html += '\u003Cdiv class=\"emp-tag-leave\"\u003E\u003Cspan\u003E\uD83C\uDF34 ' + item.emp.empName + '\u003C/span\u003E\u003Cspan\u003E\u003Cb\u003E' + item.leave.leaveType + '\u003C/b\u003E\u003C/span\u003E\u003C/div\u003E';
    });
    presentList.forEach(function(item) {
      html += '\u003Cdiv class=\"emp-tag-present\"\u003E\u003Cspan\u003E\uD83D\uDFE2 ' + item.emp.empName + '\u003C/span\u003E\u003Cspan\u003E\u003Cb\u003E' + item.present.time + ' \u0E19.\u003C/b\u003E\u003C/span\u003E\u003C/div\u003E';
    });
    lateList.forEach(function(item) {
      html += '\u003Cdiv class=\"emp-tag-late\"\u003E\u003Cspan\u003E\u23F0 ' + item.emp.empName + '\u003C/span\u003E\u003Cspan\u003E\u003Cb style=\"color:#d9534f;\"\u003E\u0E2A\u0E32\u0E22 ' + item.present.time + ' \u0E19.\u003C/b\u003E\u003C/span\u003E\u003C/div\u003E';
    });
    absentList.forEach(function(item) {
      html += '\u003Cdiv class=\"emp-tag-absent\"\u003E\u003Cspan\u003E\uD83D\uDD34 ' + item.emp.empName + '\u003C/span\u003E\u003Cspan style=\"font-size:11px;\"\u003E\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E25\u0E07\u0E40\u0E27\u0E25\u0E32\u003C/span\u003E\u003C/div\u003E';
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

    if (todayListRefreshTimer) clearTimeout(todayListRefreshTimer);
    todayListRefreshTimer = setTimeout(loadTodayListRealtime, 15000);
  });
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
  if (typeof stopDeviceAccessGuard === 'function') stopDeviceAccessGuard();
  if (typeof stopDevicePresence === 'function') stopDevicePresence();
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
  if (typeof showDesktopNotificationControl === 'function') showDesktopNotificationControl(false);
  PinThipSafe.session.clearAuthState();
  if (typeof showLoginForm === 'function') showLoginForm();
}

// ========================================================
// ADMIN NOTIFICATION LISTENERS (keep with employee-ui for now)
// ========================================================
var pendingLeavesCache = [];
var pendingFuelsCache = [];
var isInitialLoadLeaves = true;
var isInitialLoadFuels = true;
var myPendingJobsCache = [];
var isInitialLoadEmpJobs = true;

function startAdminNotificationListener() {
  document.getElementById('bellBtn').style.display = 'block';

  db.ref('leaves').on('value', function(snap) {
    var obj = snap.val() || {};
    pendingLeavesCache = [];
    var newPendingCount = 0;

    Object.keys(obj).forEach(function(k) {
      if (String(obj[k].status || '').indexOf('\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34') !== -1) {
        pendingLeavesCache.push({ key: k, ...obj[k] });
        newPendingCount++;
      }
    });

    if (!isInitialLoadLeaves && newPendingCount > 0) {
      if (typeof playNotificationAlert === 'function') playNotificationAlert('\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E25\u0E32\u0E43\u0E2B\u0E21\u0E48 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A');
      if (typeof showDesktopNotification === 'function') showDesktopNotification('\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E25\u0E32\u0E43\u0E2B\u0E21\u0E48', '\u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E04\u0E33\u0E02\u0E2D\u0E25\u0E32\u0E08\u0E32\u0E01\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19');
      showModal("\uD83D\uDD14 \u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E04\u0E33\u0E02\u0E2D\u0E43\u0E2B\u0E21\u0E48", "\u0E21\u0E35\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E25\u0E32\u0E21\u0E32\u0E43\u0E2B\u0E21\u0E48 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E43\u0E19\u0E40\u0E21\u0E19\u0E39\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E1A\u0E25\u0E32", '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal()\"\u003E\u0E15\u0E01\u0E25\u0E07\u003C/button\u003E');
    }
    isInitialLoadLeaves = false;
    updateAdminBellBadgeCount();
  });

  db.ref('fuel_requests').on('value', function(snap) {
    var obj = snap.val() || {};
    pendingFuelsCache = [];
    var newFuelPendingCount = 0;

    Object.keys(obj).forEach(function(k) {
      if (String(obj[k].status || '').indexOf('\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34') !== -1) {
        pendingFuelsCache.push({ key: k, ...obj[k] });
        newFuelPendingCount++;
      }
    });

    if (!isInitialLoadFuels && newFuelPendingCount > 0) {
      if (typeof playNotificationAlert === 'function') playNotificationAlert('\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E04\u0E48\u0E32\u0E0B\u0E48\u0E2D\u0E21\u0E43\u0E2B\u0E21\u0E48 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A');
      if (typeof showDesktopNotification === 'function') showDesktopNotification('\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E43\u0E2B\u0E21\u0E48', '\u0E21\u0E35\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E04\u0E48\u0E32\u0E0B\u0E48\u0E2D\u0E21\u0E23\u0E16');
      showModal("\uD83D\uDD14 \u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E43\u0E2B\u0E21\u0E48", "\u0E21\u0E35\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19/\u0E04\u0E48\u0E32\u0E0B\u0E48\u0E2D\u0E21\u0E23\u0E16\u0E21\u0E32\u0E43\u0E2B\u0E21\u0E48", '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal()\"\u003E\u0E15\u0E01\u0E25\u0E07\u003C/button\u003E');
    }
    isInitialLoadFuels = false;
    updateAdminBellBadgeCount();
  });
}

function updateAdminBellBadgeCount() {
  var totalPending = pendingLeavesCache.length + pendingFuelsCache.length;
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
  if (leavesBadge) {
    leavesBadge.innerText = pendingLeavesCache.length;
    leavesBadge.style.display = pendingLeavesCache.length > 0 ? 'inline-block' : 'none';
  }
  if (fuelsBadge) {
    fuelsBadge.innerText = pendingFuelsCache.length;
    fuelsBadge.style.display = pendingFuelsCache.length > 0 ? 'inline-block' : 'none';
  }

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

function startEmployeeNotificationListener() {
  if (!currentUser) return;
  var todayStr = getLocalDateTimeString();

  var bellBtn = document.getElementById('bellBtn');
  if (bellBtn) bellBtn.style.display = 'block';

  db.ref('delivery_jobs/' + todayStr).on('value', function(snap) {
    var obj = snap.val() || {};
    myPendingJobsCache = [];
    var myNewJobsCount = 0;

    Object.keys(obj).forEach(function(k) {
      var j = obj[k];
      if (String(j.driverId) === String(currentUser.empId) && String(j.status || '').indexOf('\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08') === -1) {
        myPendingJobsCache.push({ key: k, ...j });
        myNewJobsCount++;
      }
    });

    if (!isInitialLoadEmpJobs && myNewJobsCount > 0) {
      if (typeof playNotificationAlert === 'function') playNotificationAlert('\u0E21\u0E35\u0E07\u0E32\u0E19\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13');
      if (typeof showDesktopNotification === 'function') showDesktopNotification('\u0E21\u0E35\u0E07\u0E32\u0E19\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48', '\u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E07\u0E32\u0E19\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13');
      showModal("\uD83D\uDCE6 \u0E21\u0E35\u0E07\u0E32\u0E19\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48!", "\u0E04\u0E38\u0E13\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E21\u0E2D\u0E1A\u0E2B\u0E21\u0E32\u0E22\u0E08\u0E4A\u0E2D\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49 (" + myNewJobsCount + " \u0E23\u0E49\u0E32\u0E19)\n\u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E17\u0E35\u0E48\u0E01\u0E23\u0E30\u0E14\u0E34\u0E48\u0E07\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19", '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal(); showDriverMyJobsView();\"\u003E\u0E44\u0E1B\u0E17\u0E35\u0E48\u0E07\u0E32\u0E19\u0E02\u0E2D\u0E07\u0E09\u0E31\u0E19\u003C/button\u003E');
    }
    isInitialLoadEmpJobs = false;
    updateEmployeeBellBadgeCount();
  });
}

function updateEmployeeBellBadgeCount() {
  var badge = document.getElementById('bellBadge');
  if (badge) {
    if (myPendingJobsCache.length > 0) {
      badge.innerText = myPendingJobsCache.length;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

function showNotificationModal() {
  if (isAdmin) {
    showAdminNotificationModal();
  } else {
    showEmployeeNotificationModal();
  }
}

function showAdminNotificationModal() {
  var html = '\u003Cdiv style=\"max-height: 350px; overflow-y: auto;\"\u003E';

  if (pendingLeavesCache.length === 0 && pendingFuelsCache.length === 0) {
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
  }

  html += '\u003C/div\u003E';
  showModal("\uD83D\uDD14 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34", "", html, '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal()\"\u003E\u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u003C/button\u003E');
}

function showEmployeeNotificationModal() {
  var html = '\u003Cdiv style=\"max-height: 350px; overflow-y: auto;\"\u003E';

  if (myPendingJobsCache.length === 0) {
    html += '\u003Cdiv style=\"text-align:center; color:#888; padding:20px;\"\u003E\uD83C\uDF89 \u0E44\u0E21\u0E48\u0E21\u0E35\u0E07\u0E32\u0E19\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E04\u0E49\u0E32\u0E07\u0E2A\u0E48\u0E07\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49\u003C/div\u003E';
  } else {
    html += '\u003Cdiv style=\"font-weight:bold; color:#e67e22; margin-bottom:8px;\"\u003E\uD83D\uDCE6 \u0E07\u0E32\u0E19\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E1B\u0E2A\u0E48\u0E07 (' + myPendingJobsCache.length + ' \u0E23\u0E49\u0E32\u0E19):\u003C/div\u003E';
    myPendingJobsCache.forEach(function(item) {
      html += '\u003Cdiv class=\"history-item\" style=\"cursor:pointer; background:#fff3cd;\" onclick=\"closeModal(); showDriverMyJobsView();\"\u003E' +
        '\uD83C\uDFEC \u003Cb\u003E\u0E23\u0E49\u0E32\u0E19: ' + item.customerName + '\u003C/b\u003E\u003Cbr\u003E' +
        '\u0E2A\u0E16\u0E32\u0E19\u0E30: \u003Cspan style=\"color:#e67e22; font-weight:bold;\"\u003E' + item.status + '\u003C/span\u003E\u003Cbr\u003E' +
        '\u003Cspan style=\"font-size:11px; color:#555;\"\u003E(\u0E04\u0E25\u0E34\u0E01\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E44\u0E1B\u0E2B\u0E19\u0E49\u0E32\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07)\u003C/span\u003E\u003C/div\u003E';
    });
  }

  html += '\u003C/div\u003E';
  showModal("\uD83D\uDD14 \u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E07\u0E32\u0E19\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49", "", html, '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal()\"\u003E\u0E1B\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E15\u0E48\u0E32\u0E07\u003C/button\u003E');
}
