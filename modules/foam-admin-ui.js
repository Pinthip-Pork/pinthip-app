/**
 * foam-admin-ui.js — Admin review + print queue for foam label delivery
 * Dependencies: window.PinThipSafe.foamCustomerRepo, window.PinThipSafe.foamDeliveryRepo, window.PinThipSafe.foamPrint
 */
(function () {
  'use strict';

  function escape(value) {
    return window.PinThipSafe && window.PinThipSafe.escapeHtml
      ? window.PinThipSafe.escapeHtml(value)
      : String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getCustomerRepo() {
    return window.PinThipSafe && window.PinThipSafe.foamCustomerRepo;
  }

  function getDeliveryRepo() {
    return window.PinThipSafe && window.PinThipSafe.foamDeliveryRepo;
  }

  function getPrintApi() {
    return window.PinThipSafe && window.PinThipSafe.foamPrint;
  }

  function getTodayStr() {
    return (window.PinThipSafe && window.PinThipSafe.utils && window.PinThipSafe.utils.getLocalDateTimeString)
      ? window.PinThipSafe.utils.getLocalDateTimeString()
      : new Date().toISOString().slice(0, 10);
  }

  function statusBadgeClass(status) {
    if (status === 'pending_review' || status === 'pending_duplicate_approval') return '#e67e22';
    if (status === 'approved') return '#0d6efd';
    if (status === 'printed') return '#28a745';
    if (status === 'completed') return '#198754';
    if (status === 'cancelled') return '#dc3545';
    return '#6c757d';
  }

  function statusLabel(status) {
    var repo = getDeliveryRepo();
    if (repo && repo.STATUS_LABELS && repo.STATUS_LABELS[status]) return repo.STATUS_LABELS[status];
    return status || 'ไม่ระบุ';
  }

  function formatAddress(item) {
    var parts = [
      item.address,
      item.subdistrict,
      item.district,
      item.province,
      item.postalCode
    ].filter(Boolean);
    return parts.join(' ');
  }

  function showFoamAdminView() {
    window.isAdmin = true;
    var mainCard = document.getElementById('mainCard');
    if (mainCard) mainCard.classList.add('admin-wide');

    var bellBtn = document.getElementById('bellBtn');
    if (bellBtn) bellBtn.style.display = 'block';

    var hamburgerBtn = document.getElementById('hamburgerBtn');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';

    var pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.innerText = '📦 จัดการป้ายลังโฟม';

    var status = document.getElementById('status');
    if (status) status.innerText = '';

    var listBox = document.getElementById('listBox');
    if (listBox) listBox.style.display = 'none';

    var html = '' +
      '<div class="user-banner">📦 แอดมินตรวจสอบข้อมูลป้ายลังโฟม</div>' +
      '<div id="foamAdminLayout" style="display:grid; grid-template-columns: 1.1fr 1fr; gap:16px; align-items:start;">' +
        '<div id="foamAdminQueue" style="min-width:0;">' +
          '<div style="color:#666; text-align:center; padding:18px;">กำลังโหลดรายการแจ้งเตือน...</div>' +
        '</div>' +
        '<div id="foamAdminDetail" style="min-width:0;">' +
          '<div style="color:#666; text-align:center; padding:18px;">เลือกรายการจากซ้ายเพื่อดูรายละเอียด</div>' +
        '</div>' +
      '</div>' +
      '<button class="btn-back" onclick="showAdminDashboard()" style="margin-top:16px;">⬅️ กลับหน้าแอดมิน</button>';

    var mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;

    loadFoamAdminQueue();
  }

  function loadFoamAdminQueue() {
    var repo = getDeliveryRepo();
    if (!repo) {
      var queue = document.getElementById('foamAdminQueue');
      if (queue) queue.innerHTML = '<div style="color:#d9534f; padding:18px;">โหลดระบบส่งลังโฟมไม่สำเร็จ</div>';
      return;
    }

    repo.fetchRequestsByDate(getTodayStr()).then(function (requests) {
      var queue = document.getElementById('foamAdminQueue');
      if (!queue) return;

      requests.sort(function (a, b) {
        return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      });

      if (!requests.length) {
        queue.innerHTML = '<div style="color:#888; text-align:center; padding:18px;">ยังไม่มีรายการส่งลังโฟมวันนี้</div>';
        return;
      }

      var html = '';
      requests.forEach(function (request) {
        var snapshot = request.customerSnapshot || {};
        var name = snapshot.name || 'ลูกค้าใหม่';
        var status = statusLabel(request.status);
        var badgeColor = statusBadgeClass(request.status);
        var isSelected = request.key === (window.__FOAM_SELECTED_KEY__ || '');

        html += '<div class="history-item" style="cursor:pointer; border-left:4px solid ' + badgeColor + '; ' + (isSelected ? 'background:#eef7ff;' : '') + '" data-request-key="' + escape(request.key || '') + '" data-date="' + escape(getTodayStr()) + '" onclick="foamAdminSelectRequest(this.dataset.requestKey, this.dataset.date)">';
        html += '<div style="display:flex; justify-content:space-between; gap:8px; align-items:center; margin-bottom:6px;">';
        html += '<b>' + escape(name) + '</b>';
        html += '<span style="font-size:11px; color:' + badgeColor + '; font-weight:bold;">' + escape(status) + '</span>';
        html += '</div>';
        html += '📦 ' + (request.boxCount || 1) + ' ลัง';
        if (snapshot.shipping) html += ' | 🚚 ' + escape(snapshot.shipping);
        if (request.isDuplicate) html += ' | <span style="color:#e67e22; font-weight:bold;">ซ้ำ</span>';
        html += '<br><span style="font-size:12px; color:#666;">👤 ' + escape(request.employeeName || '-') + '</span>';
        html += '</div>';
      });

      queue.innerHTML = html;

      if (!window.__FOAM_SELECTED_KEY__) {
        var firstRequest = requests[0];
        if (firstRequest) {
          window.__FOAM_SELECTED_KEY__ = firstRequest.key;
          foamAdminSelectRequest(firstRequest.key, getTodayStr());
        }
      } else {
        var selectedExists = requests.some(function (item) { return item.key === window.__FOAM_SELECTED_KEY__; });
        if (!selectedExists) {
          window.__FOAM_SELECTED_KEY__ = requests[0].key;
        }
        foamAdminSelectRequest(window.__FOAM_SELECTED_KEY__, getTodayStr());
      }
    }).catch(function (err) {
      console.warn('loadFoamAdminQueue failed:', err);
      var queue = document.getElementById('foamAdminQueue');
      if (queue) queue.innerHTML = '<div style="color:#d9534f; padding:18px;">โหลดรายการไม่สำเร็จ กรุณารีเฟรช</div>';
    });
  }

  function foamAdminSelectRequest(requestKey, dateStr) {
    window.__FOAM_SELECTED_KEY__ = requestKey;
    var repo = getDeliveryRepo();
    if (!repo) return;

    dateStr = dateStr || getTodayStr();
    var refPath = 'foam_delivery_requests/' + dateStr + '/' + requestKey;
    var db = window.db;
    if (!db) return;

    db.ref(refPath).once('value').then(function (snapshot) {
      var request = snapshot.val();
      if (!request) return;

      var detail = document.getElementById('foamAdminDetail');
      if (!detail) return;

      var snapshotData = request.customerSnapshot || {};
      var name = snapshotData.name || 'ลูกค้าใหม่';
      var address = formatAddress(snapshotData);
      var status = statusLabel(request.status);
      var badgeColor = statusBadgeClass(request.status);

      var canApprove = request.status !== 'cancelled' && request.status !== 'completed';

      var html = '' +
        '<div class="user-banner" style="margin-bottom:10px;">📋 รายละเอียดรายการที่เลือก</div>' +
        '<div style="background:#f8f9fa; border:1px solid #e9ecef; border-left:4px solid ' + badgeColor + '; border-radius:10px; padding:12px; text-align:left;">' +
          '<div style="display:flex; justify-content:space-between; gap:10px; align-items:center; margin-bottom:8px;">' +
            '<b>🏬 ' + escape(name) + '</b>' +
            '<span style="font-size:11px; font-weight:bold; color:' + badgeColor + ';">' + escape(status) + '</span>' +
          '</div>' +
          '<div style="font-size:13px; color:#555; line-height:1.8;">' +
            (snapshotData.phone ? '📞 ' + escape(snapshotData.phone) + '<br>' : '') +
            (address ? '📍 ' + escape(address) + '<br>' : '') +
            (snapshotData.shipping ? '🚚 ' + escape(snapshotData.shipping) + '<br>' : '') +
            '📦 จำนวนลัง: <b>' + (request.boxCount || 1) + '</b><br>' +
            '👤 ผู้ส่ง: ' + escape(request.employeeName || '-') + '<br>' +
            '🕒 วันที่: ' + escape(dateStr) + '<br>' +
            (request.note ? '📝 หมายเหตุ: ' + escape(request.note) : '') +
          '</div>' +
        '</div>' +
        '<div style="margin-top:12px; text-align:left;">' +
          '<label style="display:block; font-weight:bold; margin-bottom:4px;">ชื่อลูกค้า</label>' +
          '<input id="foamEditName" type="text" value="' + escape(name) + '">' +

          '<label style="display:block; font-weight:bold; margin-top:8px; margin-bottom:4px;">เบอร์โทรศัพท์</label>' +
          '<input id="foamEditPhone" type="text" value="' + escape(snapshotData.phone || '') + '">' +

          '<label style="display:block; font-weight:bold; margin-top:8px; margin-bottom:4px;">ที่อยู่</label>' +
          '<textarea id="foamEditAddress" rows="2">' + escape(snapshotData.address || '') + '</textarea>' +

          '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">' +
            '<div><label style="display:block; font-weight:bold; margin-bottom:4px;">แขวง/ตำบล</label><input id="foamEditSubdistrict" type="text" value="' + escape(snapshotData.subdistrict || '') + '"></div>' +
            '<div><label style="display:block; font-weight:bold; margin-bottom:4px;">เขต/อำเภอ</label><input id="foamEditDistrict" type="text" value="' + escape(snapshotData.district || '') + '"></div>' +
          '</div>' +

          '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">' +
            '<div><label style="display:block; font-weight:bold; margin-bottom:4px;">จังหวัด</label><input id="foamEditProvince" type="text" value="' + escape(snapshotData.province || '') + '"></div>' +
            '<div><label style="display:block; font-weight:bold; margin-bottom:4px;">รหัสไปรษณีย์</label><input id="foamEditPostal" type="text" value="' + escape(snapshotData.postalCode || '') + '"></div>' +
          '</div>' +

          '<label style="display:block; font-weight:bold; margin-top:8px; margin-bottom:4px;">ขนส่ง</label>' +
          '<input id="foamEditShipping" type="text" value="' + escape(snapshotData.shipping || '') + '">' +

          '<label style="display:block; font-weight:bold; margin-top:8px; margin-bottom:4px;">หมายเหตุ</label>' +
          '<textarea id="foamEditNote" rows="2">' + escape(snapshotData.note || request.note || '') + '</textarea>' +

          '<label style="display:block; font-weight:bold; margin-top:8px; margin-bottom:4px;">จำนวนลัง</label>' +
          '<select id="foamEditBoxCount" style="font-weight:bold;">' +
            '<option value="1" ' + ((request.boxCount || 1) === 1 ? 'selected' : '') + '>1 ลัง</option>' +
            '<option value="2" ' + ((request.boxCount || 1) === 2 ? 'selected' : '') + '>2 ลัง</option>' +
            '<option value="3" ' + ((request.boxCount || 1) === 3 ? 'selected' : '') + '>3 ลัง</option>' +
          '</select>' +
        '</div>' +
        '<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:14px;">' +
          '<button class="btn-blue" onclick="foamAdminSaveSelected(' + JSON.stringify(requestKey) + ', ' + JSON.stringify(dateStr) + ')" style="flex:1; min-width:120px;">💾 บันทึกข้อมูล</button>' +
          (canApprove ? '<button class="btn-fuel" onclick="foamAdminApproveSelected(' + JSON.stringify(requestKey) + ', ' + JSON.stringify(dateStr) + ')" style="flex:1; min-width:120px;">✅ อนุมัติ</button>' : '') +
          '<button class="btn-danger" onclick="foamAdminRejectSelected(' + JSON.stringify(requestKey) + ', ' + JSON.stringify(dateStr) + ')" style="flex:1; min-width:120px;">❌ ยกเลิก</button>' +
          '<button class="btn-purple" onclick="foamAdminPrintSelected(' + JSON.stringify(requestKey) + ', ' + JSON.stringify(dateStr) + ')" style="flex:1; min-width:120px;">🖨️ พิมพ์ป้าย</button>' +
        '</div>';

      detail.innerHTML = html;
    }).catch(function (err) {
      console.warn('foamAdminSelectRequest failed:', err);
    });
  }

  function foamAdminSaveSelected(requestKey, dateStr) {
    var repository = getDeliveryRepo();
    var customerRepo = getCustomerRepo();
    var detail = document.getElementById('foamAdminDetail');
    if (!repository || !customerRepo || !detail) return;

    var requestRef = window.db.ref('foam_delivery_requests/' + dateStr + '/' + requestKey);
    var selected = {};
    requestRef.once('value').then(function (snapshot) {
      selected = snapshot.val() || {};
      var data = {
        name: document.getElementById('foamEditName')?.value.trim() || '',
        phone: document.getElementById('foamEditPhone')?.value.trim() || '',
        address: document.getElementById('foamEditAddress')?.value.trim() || '',
        subdistrict: document.getElementById('foamEditSubdistrict')?.value.trim() || '',
        district: document.getElementById('foamEditDistrict')?.value.trim() || '',
        province: document.getElementById('foamEditProvince')?.value.trim() || '',
        postalCode: document.getElementById('foamEditPostal')?.value.trim() || '',
        shipping: document.getElementById('foamEditShipping')?.value.trim() || '',
        note: document.getElementById('foamEditNote')?.value.trim() || '',
        boxCount: Number(document.getElementById('foamEditBoxCount')?.value || 1)
      };

      if (!data.name) {
        window.alert('กรุณากรอกชื่อลูกค้า');
        return Promise.resolve();
      }

      var snapshotData = {
        name: data.name,
        phone: data.phone,
        address: data.address,
        subdistrict: data.subdistrict,
        district: data.district,
        province: data.province,
        postalCode: data.postalCode,
        shipping: data.shipping,
        note: data.note
      };

      var promise = selected.customerId
        ? customerRepo.updateCustomer(selected.customerId, snapshotData)
        : customerRepo.addCustomer(snapshotData, 'admin');

      return promise.then(function (result) {
        var customerId = selected.customerId || (result && result.key) || null;
        var targetStatus = selected.status === 'pending_duplicate_approval' ? 'approved' : (selected.status || 'approved');
        return repository.updateRequest(dateStr, requestKey, {
          customerId: customerId,
          customerSnapshot: snapshotData,
          boxCount: data.boxCount,
          shipping: data.shipping,
          note: data.note
        }).then(function () {
          return repository.updateStatus(dateStr, requestKey, targetStatus, 'admin');
        });
      });
    }).then(function () {
      window.showModal('💾 สำเร็จ', 'บันทึกข้อมูลลูกค้าและรายการส่งเรียบร้อยแล้ว', '<button class="btn-ok" onclick="closeModal(); foamAdminSelectRequest(\'' + requestKey + '\', \'" + dateStr + "\' );">ตกลง</button>');
      loadFoamAdminQueue();
    }).catch(function (err) {
      console.warn('Save foam request failed:', err);
      window.alert('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    });
  }

  function foamAdminApproveSelected(requestKey, dateStr) {
    var repo = getDeliveryRepo();
    if (!repo) return;

    repo.updateStatus(dateStr, requestKey, 'approved', 'admin').then(function () {
      loadFoamAdminQueue();
    }).catch(function (err) {
      console.warn('Approve foam request failed:', err);
      window.alert('อนุมัติรายการไม่สำเร็จ');
    });
  }

  function foamAdminRejectSelected(requestKey, dateStr) {
    var repo = getDeliveryRepo();
    if (!repo) return;

    if (!window.confirm('ต้องการยกเลิกรายการนี้ใช่หรือไม่?')) return;

    repo.updateStatus(dateStr, requestKey, 'cancelled', 'admin').then(function () {
      loadFoamAdminQueue();
    }).catch(function (err) {
      console.warn('Reject foam request failed:', err);
      window.alert('ยกเลิกรายการไม่สำเร็จ');
    });
  }

  function foamAdminPrintSelected(requestKey, dateStr) {
    var db = window.db;
    if (!db) return;

    db.ref('foam_delivery_requests/' + dateStr + '/' + requestKey).once('value').then(function (snapshot) {
      var request = snapshot.val();
      if (!request) {
        window.alert('ไม่พบรายการที่ต้องการพิมพ์');
        return;
      }

      var data = request.customerSnapshot || {};
      var printApi = getPrintApi();
      if (!printApi) {
        window.alert('ระบบพิมพ์ป้ายยังไม่พร้อมใช้งาน');
        return;
      }

      printApi.printMultipleLabels({
        name: data.name || '',
        phone: data.phone || '',
        address: data.address || '',
        subdistrict: data.subdistrict || '',
        district: data.district || '',
        province: data.province || '',
        postalCode: data.postalCode || '',
        shipping: data.shipping || request.shipping || ''
      }, Number(request.boxCount || 1));

      var repo = getDeliveryRepo();
      if (repo) {
        repo.updateStatus(dateStr, requestKey, 'printed', 'admin').then(function () {
          loadFoamAdminQueue();
        }).catch(function () {
          loadFoamAdminQueue();
        });
      }
    });
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.foamAdminUI = {
    showFoamAdminView: showFoamAdminView,
    loadFoamAdminQueue: loadFoamAdminQueue,
    foamAdminSelectRequest: foamAdminSelectRequest,
    foamAdminSaveSelected: foamAdminSaveSelected,
    foamAdminApproveSelected: foamAdminApproveSelected,
    foamAdminRejectSelected: foamAdminRejectSelected,
    foamAdminPrintSelected: foamAdminPrintSelected
  };

  window.showFoamAdminView = showFoamAdminView;
  window.loadFoamAdminQueue = loadFoamAdminQueue;
  window.foamAdminSelectRequest = foamAdminSelectRequest;
  window.foamAdminSaveSelected = foamAdminSaveSelected;
  window.foamAdminApproveSelected = foamAdminApproveSelected;
  window.foamAdminRejectSelected = foamAdminRejectSelected;
  window.foamAdminPrintSelected = foamAdminPrintSelected;
})();
