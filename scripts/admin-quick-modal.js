/**
 * admin-quick-modal.js — Admin quick command center modals (job, fuel, leave)
 * Extracted from index.html inline script
 * Dependencies: app-globals.js (for openWideModal, getLocalDateTimeString, db, etc.)
 */

function openAdminQuickModal(type) {
  var quickTitles = {
    job: '\uD83D\uDCE6 \u0E08\u0E31\u0E14\u0E01\u0E32\u0E23\u0E08\u0E31\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E14\u0E48\u0E27\u0E19',
    fuel: '\u26FD/\uD83D\uDD27 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E40\u0E1A\u0E34\u0E01\u0E08\u0E48\u0E32\u0E22\u0E14\u0E48\u0E27\u0E19',
    leave: '\uD83C\uDF34 \u0E2D\u0E19\u0E38\u0E21\u0E31\u0E15\u0E34\u0E43\u0E1A\u0E25\u0E32\u0E14\u0E48\u0E27\u0E19'
  };
  var loaders = {
    job: loadQuickJobContent,
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

// ===== Quick Job (Assign Delivery) =====
function loadQuickJobContent() {
  var todayStr = getLocalDateTimeString();
  db.ref('employees').once('value', function(empSnap) {
    var empObj = empSnap.val() || {};
    var driversList = [];
    Object.keys(empObj).forEach(function(k) { if (empObj[k].isDriver) driversList.push(empObj[k]); });

    db.ref('customers').once('value', function(custSnap) {
      var custObj = custSnap.val() || {};
      var custList = [];
      Object.keys(custObj).forEach(function(k) { custList.push({ key: k, name: custObj[k].name, address: custObj[k].address || '\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B' }); });

      db.ref('delivery_jobs/' + todayStr).once('value', function(jobSnap) {
        var todayJobsObj = jobSnap.val() || {};
        var driverOptions = '\u003Coption value=\"\"\u003E-- \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E31\u0E1A\u0E23\u0E16 --\u003C/option\u003E';
        driversList.forEach(function(d) {
          driverOptions += '\u003Coption value=\"' + d.empId + '\" data-name=\"' + d.empName + '\"\u003E' + d.empName + ' (' + d.empId + ')\u003C/option\u003E';
        });

        var customerCheckboxesHtml = '';
        if (custList.length === 0) {
          customerCheckboxesHtml = '\u003Cdiv style=\"color:#888; font-size:13px;\"\u003E\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E23\u0E32\u0E22\u0E0A\u0E37\u0E48\u0E2D\u0E25\u0E39\u0E01\u0E04\u0E49\u0E32\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u003C/div\u003E';
        } else {
          custList.forEach(function(c) {
            customerCheckboxesHtml += '\u003Clabel style=\"display:flex; align-items:center; gap:8px; margin:4px 0; font-size:14px; background:white; padding:6px 10px; border-radius:6px; border:1px solid #ddd; cursor:pointer;\"\u003E' +
              '\u003Cinput type=\"checkbox\" class=\"cust-checkbox-quick\" value=\"' + c.name + '\" style=\"width:18px; height:18px; margin:0;\"\u003E' +
              '\u003Cspan\u003E\uD83C\uDFEC ' + c.name + ' (' + c.address + ')\u003C/span\u003E' +
              '\u003C/label\u003E';
          });
        }

        var html = '\u003Cdiv style=\"background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 12px; padding: 15px; margin-bottom: 15px; text-align: left;\"\u003E' +
          '\u003Cb\u003E\u2795 \u0E21\u0E2D\u0E1A\u0E2B\u0E21\u0E32\u0E22\u0E08\u0E31\u0E1A\u0E43\u0E2B\u0E49\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19 (\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E04\u0E19\u0E02\u0E31\u0E1A + \u0E15\u0E34\u0E4B\u0E01\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E49\u0E32\u0E19\u0E04\u0E49\u0E32):\u003C/b\u003E' +
          '\u003Cdiv style=\"margin-top:8px;\"\u003E\u003Cspan style=\"font-size:12px; color:#555;\"\u003E1. \u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E31\u0E1A\u0E23\u0E16:\u003C/span\u003E\u003Cselect id=\"quickAssignDriverSelect\" style=\"font-weight:bold;\"\u003E' + driverOptions + '\u003C/select\u003E\u003C/div\u003E' +
          '\u003Cdiv style=\"margin-top:10px;\"\u003E\u003Cspan style=\"font-size:12px; color:#555;\"\u003E2. \u0E15\u0E34\u0E4B\u0E01\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E49\u0E32\u0E19\u0E04\u0E49\u0E32\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E1B\u0E2A\u0E48\u0E07\u0E43\u0E19\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49:\u003C/span\u003E' +
          '\u003Cdiv style=\"max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; border-radius: 8px; background: #fff;\"\u003E' + customerCheckboxesHtml + '\u003C/div\u003E\u003C/div\u003E' +
          '\u003Cbutton class=\"btn-fuel\" onclick=\"saveQuickAssignedJobs()\" style=\"margin-top:10px;\"\u003E\uD83D\uDCBE \u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E08\u0E31\u0E1A\u0E2A\u0E48\u0E07\u003C/button\u003E' +
          '\u003C/div\u003E' +
          '\u003Cdiv id=\"quickTodayJobsOverview\"\u003E\u003C/div\u003E';
        document.getElementById('quickModalContent').innerHTML = html;
        renderQuickJobsOverview(todayJobsObj, driversList);
      });
    });
  });
}

function saveQuickAssignedJobs() {
  var driverSelect = document.getElementById('quickAssignDriverSelect');
  var driverId = driverSelect.value;
  if (!driverId) { alert('\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E02\u0E31\u0E1A\u0E23\u0E16'); return; }
  var driverName = driverSelect.options[driverSelect.selectedIndex].getAttribute('data-name');

  var checkboxes = document.querySelectorAll('.cust-checkbox-quick:checked');
  var selectedCusts = [];
  checkboxes.forEach(function(cb) { selectedCusts.push(cb.value); });
  if (selectedCusts.length === 0) { alert('\u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E4B\u0E01\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E49\u0E32\u0E19\u0E04\u0E49\u0E32\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E1B\u0E2A\u0E48\u0E07'); return; }

  var todayStr = getLocalDateTimeString();
  var jobsRef = db.ref('delivery_jobs/' + todayStr);
  selectedCusts.forEach(function(custName) {
    jobsRef.push({
      driverId: driverId,
      driverName: driverName,
      customerName: custName,
      status: '\u0E23\u0E2D\u0E08\u0E31\u0E14\u0E2A\u0E48\u0E07 \u23F3',
      deliveredTime: '-'
    });
  });
  alert('\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E21\u0E2D\u0E1A\u0E2B\u0E21\u0E32\u0E22\u0E08\u0E31\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22');
  loadQuickJobContent();
  if (typeof showAdminCommandCenter === 'function') showAdminCommandCenter();
}

function adminDeleteQuickJob(jobKey) {
  if (!confirm('\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E25\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E19\u0E35\u0E49\u0E44\u0E0A\u0E48\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48?')) return;

  var todayStr = getLocalDateTimeString();
  db.ref('delivery_jobs/' + todayStr + '/' + jobKey).remove(function(err) {
    if (err) {
      alert('\u0E25\u0E1A\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48');
      return;
    }
    loadQuickJobContent();
    if (typeof showAdminCommandCenter === 'function') showAdminCommandCenter();
  });
}

function renderQuickJobsOverview(jobsObj, driversList) {
  var container = document.getElementById('quickTodayJobsOverview');
  if (!container) return;
  var list = [];
  Object.keys(jobsObj).forEach(function(k) { list.push({ key: k, ...jobsObj[k] }); });
  if (list.length === 0) {
    container.innerHTML = '\u003Cdiv style=\"color:#888; font-size:13px; text-align:center; padding:10px;\"\u003E\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E21\u0E35\u0E01\u0E32\u0E23\u0E21\u0E2D\u0E1A\u0E2B\u0E21\u0E32\u0E22\u0E08\u0E31\u0E1A\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E43\u0E19\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u003C/div\u003E';
    return;
  }
  var grouped = {};
  driversList.forEach(function(d) { grouped[d.empId] = { name: d.empName, jobs: [] }; });
  list.forEach(function(j) {
    if (!grouped[j.driverId]) grouped[j.driverId] = { name: j.driverName, jobs: [] };
    grouped[j.driverId].jobs.push(j);
  });
  var html = '\u003Cb\u003E\uD83D\uDCCB \u0E2A\u0E23\u0E38\u0E1B\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E01\u0E32\u0E23\u0E2A\u0E48\u0E07\u0E02\u0E2D\u0E07\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49:\u003C/b\u003E';
  Object.keys(grouped).forEach(function(did) {
    var g = grouped[did];
    if (g.jobs.length === 0) return;
    var completedCount = g.jobs.filter(function(j) { return String(j.status).indexOf('\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08') !== -1; }).length;
    html += '\u003Cdiv class=\"history-item\"\u003E\u003Cb\u003E\uD83D\uDE9A \u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19: ' + g.name + '\u003C/b\u003E (\u0E2A\u0E48\u0E07\u0E41\u0E25\u0E49\u0E27 ' + completedCount + ' / ' + g.jobs.length + ' \u0E23\u0E49\u0E32\u0E19)\u003Cdiv style=\"margin-top:6px; display:flex; flex-direction:column; gap:6px;\"\u003E';
    g.jobs.forEach(function(j) {
      var isCompleted = String(j.status).indexOf('\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08') !== -1;
      var badgeColor = isCompleted ? '#28a745' : '#e67e22';
      html += '\u003Cdiv style=\"background:white; padding:6px 10px; border-radius:6px; border:1px solid #ddd; display:flex; justify-content:space-between; align-items:center; font-size:13px;\"\u003E' +
        '\u003Cdiv\u003E\uD83C\uDFEC \u003Cb\u003E' + j.customerName + '\u003C/b\u003E\u003Cbr\u003E\u003Cspan style=\"color:' + badgeColor + '; font-weight:bold;\"\u003E' + j.status + ' (' + (j.deliveredTime || '-') + ')\u003C/span\u003E\u003C/div\u003E' +
        '\u003Cdiv style=\"display:flex; gap:4px;\"\u003E' +
        '\u003Cbutton class=\"btn-blue\" style=\"width:auto; margin:0; padding:4px 8px; font-size:11px;\" onclick=\"adminToggleJobStatus(\'' + j.key + '\', \'' + j.status + '\'); loadQuickJobContent(); if(typeof showAdminCommandCenter===\'function\') showAdminCommandCenter();\"\u003E\uD83D\uDD04 \u0E2A\u0E25\u0E31\u0E1A\u0E2A\u0E16\u0E32\u0E19\u0E30\u003C/button\u003E' +
        '\u003Cbutton class=\"btn-danger\" style=\"width:auto; margin:0; padding:4px 8px; font-size:11px;\" onclick=\"adminDeleteQuickJob(\'' + j.key + '\')\"\u003E\uD83D\uDDD1\uFE0F \u0E25\u0E1A\u003C/button\u003E' +
        '\u003C/div\u003E\u003C/div\u003E';
    });
    html += '\u003C/div\u003E\u003C/div\u003E';
  });
  container.innerHTML = html;
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
