/**
 * admin-quick-modal.js โ€” Admin quick command center modals (job, fuel, leave)
 * Extracted from index.html inline script
 * Dependencies: app-globals.js (for openWideModal, getLocalDateTimeString, db, etc.)
 */

function openAdminQuickModal(type) {
  var quickTitles = {
    fuel: '\u26FD/\uD83D\uDD27 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E14\u0E48\u0E27\u0E19',
    leave: '\uD83C\uDF34 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E1A\u0E25\u0E32\u0E14\u0E48\u0E27\u0E19'
  };
  var loaders = {
    fuel: loadQuickFuelContent,
    leave: loadQuickLeaveContent
  };
  var loader = loaders[type];
  if (!loader) return;

  openWideModal(
    quickTitles[type] || '\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E14\u0E48\u0E27\u0E19',
    '\u003Cdiv id=\"quickModalContent\"\u003E\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14...\u003C/div\u003E',
    '\u003Cbutton class=\"btn-back\" onclick=\"closeModal()\"\u003E\u0E1B\u0E34\u0E14\u003C/button\u003E'
  );
  loader();
}


// ===== Quick Fuel =====
function loadQuickFuelContent() {
  db.ref('fuel_requests').once('value', function(snapshot) {
    var fuelObj = snapshot.val() || {};
    var list = [];
    Object.keys(fuelObj).forEach(function(k) { list.push({ key: k, ...fuelObj[k] }); });
    var pendingList = list.filter(function(item) { return String(item.status || '').indexOf('\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34') !== -1; });
    var html = '\u003Ch2\u003E\u26FD/\uD83D\uDD27 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E04\u0E33\u0E02\u0E2D\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22 (\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34)\u003C/h2\u003E';
    if (pendingList.length === 0) {
      html += '\u003Cdiv style=\"color:#888; margin:20px 0; text-align:center;\"\u003E\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E17\u0E35\u0E48\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49\u003C/div\u003E';
    } else {
      pendingList.slice().reverse().forEach(function(item) {
        var badgeType = item.requestType || '\u26FD \u0E40\u0E1A\u0E34\u0E01\u0E04\u0E48\u0E32\u0E19\u0E49\u0E33\u0E21\u0E31\u0E19';
        var plateText = item.carPlate ? '\uD83D\uDE97 \u0E17\u0E30\u0E40\u0E1A\u0E35\u0E22\u0E19: \u003Cb\u003E' + item.carPlate + '\u003C/b\u003E' : '';
        html += '\u003Cdiv class=\"history-item\"\u003E' +
          '\u003Cb\u003E\uD83D\uDC64 ' + item.empName + ' (' + item.empId + ')\u003C/b\u003E [' + badgeType + '] \u23F3\u003Cbr\u003E' +
          plateText + '\u003Cbr\u003E' +
          '\uD83D\uDCCD \u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14: \u003Cb\u003E' + (item.route || '-') + '\u003C/b\u003E\u003Cbr\u003E' +
          '\uD83D\uDCC5 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E02\u0E2D: ' + item.date + '\u003Cbr\u003E\u003Cbr\u003E' +
          '\u003Cdiv style=\"text-align:left; font-size:13px; font-weight:bold; margin-bottom:3px;\"\u003E\uD83D\uDCB5 \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34 (\u0E1A\u0E32\u0E17):\u003C/div\u003E' +
          '\u003Cinput type=\"number\" id=\"quickFuelAmount_' + item.key + '\" value=\"' + (item.amount || '') + '\" placeholder=\"\u0E23\u0E30\u0E1A\u0E38\u0E22\u0E2D\u0E14\u0E40\u0E07\u0E34\u0E19\u0E17\u0E35\u0E48\u0E43\u0E2B\u0E49\u0E40\u0E1A\u0E34\u0E01\" style=\"margin-bottom:8px;\"\u003E' +
          '\u003Cdiv style=\"display:flex; gap:8px; align-items:center;\"\u003E' +
          '\u003Cselect id=\"quickFuelStatus_' + item.key + '\" style=\"margin:0; padding:8px; font-size:13px; font-weight:bold;\"\u003E' +
          '\u003Coption value=\"\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27 \uD83D\uDFE2\"\u003E\uD83D\uDFE2 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u003C/option\u003E' +
          '\u003Coption value=\"\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34 \uD83D\uDD34\"\u003E\uD83D\uDD34 \u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u003C/option\u003E' +
          '\u003C/select\u003E' +
          '\u003Cbutton onclick=\"updateQuickFuelStatus(\'' + item.key + '\')\" style=\"width:auto; margin:0; padding:8px 12px; font-size:13px; background:#0d6efd;\"\u003E\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E22\u0E2D\u0E14 \u0026 \u0E2A\u0E16\u0E32\u0E19\u0E30\u003C/button\u003E' +
          '\u003C/div\u003E\u003C/div\u003E';
      });
    }
    document.getElementById('quickModalContent').innerHTML = html;
  });
}

function updateQuickFuelStatus(key) {
  var newStatus = document.getElementById('quickFuelStatus_' + key).value;
  var amountVal = document.getElementById('quickFuelAmount_' + key).value.trim();
  if (newStatus.indexOf('\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34') !== -1 && (!amountVal || Number(amountVal) <= 0)) {
    alert('\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E08\u0E33\u0E19\u0E27\u0E19\u0E40\u0E07\u0E34\u0E19\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E2B\u0E49\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07');
    return;
  }
  db.ref('fuel_requests/' + key).update({ status: newStatus, amount: Number(amountVal || 0) }, function(err) {
    if (!err) {
      alert('\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22');
      loadQuickFuelContent();
      if (typeof showAdminCommandCenter === 'function') showAdminCommandCenter();
    }
  });
}

// ===== Quick Leave =====
function loadQuickLeaveContent() {
  db.ref('leaves').once('value', function(snapshot) {
    var leavesObj = snapshot.val() || {};
    var html = '\u003Ch2\u003E\uD83C\uDF34 \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E02\u0E2D\u0E25\u0E32\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E23\u0E2D\u0E01\u0E32\u0E23\u0E1E\u0E34\u0E08\u0E32\u0E23\u0E13\u0E32\u003C/h2\u003E';
    var pendingList = [];
    Object.keys(leavesObj).forEach(function(k) {
      var item = leavesObj[k];
      if (String(item.status || '').indexOf('\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34') !== -1 || item.status === '') {
        pendingList.push({ key: k, ...item });
      }
    });
    if (pendingList.length === 0) {
      html += '\u003Cdiv style=\"color:#888; margin:20px 0; text-align:center;\"\u003E\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E1A\u0E25\u0E32\u0E17\u0E35\u0E48\u0E23\u0E2D\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E19\u0E02\u0E13\u0E30\u0E19\u0E35\u0E49\u003C/div\u003E';
    } else {
      pendingList.slice().reverse().forEach(function(item) {
        html += '\u003Cdiv class=\"history-item\" style=\"background:#fff3cd;\"\u003E' +
          '\u003Cb\u003E\uD83D\uDC64 ' + item.empName + '\u003C/b\u003E (' + item.leaveType + ') \u23F3\u003Cbr\u003E' +
          '\uD83D\uDCC5 ' + item.startDate + ' \u0E16\u0E36\u0E07 ' + item.endDate + '\u003Cbr\u003E' +
          '\uD83D\uDCAC \u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25: ' + item.reason + '\u003Cbr\u003E\u003Cbr\u003E' +
          '\u003Cdiv style=\"display:flex; gap:8px;\"\u003E' +
          '\u003Cselect id=\"quickLeaveStatus_' + item.key + '\" style=\"margin:0; padding:8px; font-weight:bold;\"\u003E' +
          '\u003Coption value=\"\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E41\u0E25\u0E49\u0E27 \uD83D\uDFE2\"\u003E\uD83D\uDFE2 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u003C/option\u003E' +
          '\u003Coption value=\"\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34 \uD83D\uDD34\"\u003E\uD83D\uDD34 \u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u003C/option\u003E' +
          '\u003C/select\u003E' +
          '\u003Cbutton onclick=\"updateQuickLeaveStatus(\'' + item.key + '\')\" style=\"width:auto; margin:0; padding:8px 12px; background:#0d6efd;\"\u003E\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E1E\u0E34\u0E08\u0E32\u0E23\u0E13\u0E32\u003C/button\u003E' +
          '\u003C/div\u003E\u003C/div\u003E';
      });
    }
    document.getElementById('quickModalContent').innerHTML = html;
  });
}

function updateQuickLeaveStatus(key) {
  var status = document.getElementById('quickLeaveStatus_' + key).value;
  db.ref('leaves/' + key).update({ status: status }, function() {
    alert('\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E1E\u0E34\u0E08\u0E32\u0E23\u0E13\u0E32\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22');
    loadQuickLeaveContent();
    if (typeof showAdminCommandCenter === 'function') showAdminCommandCenter();
  });
}
