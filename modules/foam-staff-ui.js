/**
 * foam-staff-ui.js — Staff view for foam label delivery
 * Dependencies: window.PinThipSafe.foamCustomerRepo, window.PinThipSafe.foamDeliveryRepo
 */
(function () {
  'use strict';

  function escape(value) {
    return window.PinThipSafe && window.PinThipSafe.escapeHtml
      ? window.PinThipSafe.escapeHtml(value)
      : String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function getRepo() {
    return window.PinThipSafe.foamCustomerRepo;
  }

  function getDeliveryRepo() {
    return window.PinThipSafe.foamDeliveryRepo;
  }

  // ===== Main Staff View =====
  function showFoamStaffView() {
    window.isAdmin = false;
    document.getElementById('mainCard').classList.remove('admin-wide');
    document.getElementById('hamburgerBtn').style.display = 'none';
    document.getElementById('pageTitle').innerText = '📦 ส่งลังโฟม';
    document.getElementById('status').innerText = '';
    document.getElementById('listBox').style.display = 'none';

    var html = '<div class="user-banner">📦 ระบบส่งลังโฟม - ' + escape(window.currentUser && window.currentUser.empName || '') + '</div>';

    html += '<div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">';
    html += '<input type="text" id="foamSearchInput" placeholder="🔍 ค้นหาชื่อหรือเบอร์โทรลูกค้า..." style="flex:1; min-width:180px;" oninput="foamSearchCustomers()">';
    html += '<button class="btn-blue" onclick="showFoamNewCustomerForm()" style="width:auto; margin:0; padding:10px 14px; white-space:nowrap;">➕ ลูกค้าใหม่</button>';
    html += '</div>';

    html += '<div id="foamCustomerList" style="max-height:400px; overflow-y:auto; margin-bottom:12px;">';
    html += '<div style="color:#888; text-align:center; padding:20px;">กำลังโหลดรายชื่อลูกค้า...</div>';
    html += '</div>';

    html += '<button class="btn-back" onclick="showDashboard()">⬅️ กลับหน้าหลัก</button>';

    document.getElementById('mainContent').innerHTML = html;
    foamLoadCustomerList('');
  }

  // ===== Load Customer List =====
  function foamLoadCustomerList(query) {
    var container = document.getElementById('foamCustomerList');
    if (!container) return;

    getRepo().searchCustomers(query).then(function (customers) {
      if (customers.length === 0) {
        container.innerHTML = '<div style="color:#888; text-align:center; padding:20px;">ไม่พบลูกค้า</div>';
        return;
      }

      customers.sort(function (a, b) {
        return String(a.name || '').localeCompare(String(b.name || ''), 'th');
      });

      var html = '';
      customers.forEach(function (c) {
        var addr = [c.address, c.subdistrict, c.district, c.province, c.postalCode]
          .filter(Boolean).join(' ');
        html += '<div class="history-item" style="cursor:pointer; border-left:4px solid #0d6efd;" onclick="foamSelectCustomer(\'' + escape(c.key) + '\')">';
        html += '<b>🏬 ' + escape(c.name) + '</b>';
        if (c.phone) html += ' | 📞 ' + escape(c.phone);
        if (addr) html += '<br><span style="font-size:12px; color:#555;">📍 ' + escape(addr) + '</span>';
        if (c.shipping) html += ' | 🚚 ' + escape(c.shipping);
        html += '</div>';
      });
      container.innerHTML = html;
    }).catch(function (err) {
      console.warn('Load customers failed:', err);
      container.innerHTML = '<div style="color:#d9534f; text-align:center; padding:20px;">โหลดข้อมูลไม่สำเร็จ</div>';
    });
  }

  function foamSearchCustomers() {
    var input = document.getElementById('foamSearchInput');
    var query = input ? input.value : '';
    foamLoadCustomerList(query);
  }

  // ===== Select Customer -> Show Confirm Form =====
  function foamSelectCustomer(customerKey) {
    getRepo().getCustomer(customerKey).then(function (customer) {
      if (!customer) {
        window.alert('ไม่พบข้อมูลลูกค้า');
        return;
      }
      foamShowConfirmForm(customer);
    });
  }

  function foamShowConfirmForm(customer) {
    var addr = [customer.address, customer.subdistrict, customer.district, customer.province, customer.postalCode]
      .filter(Boolean).join('\n');

    var html = '<div class="user-banner">📦 ยืนยันส่งลังโฟม</div>';

    html += '<div style="background:#f8f9fa; border-radius:10px; padding:14px; margin-bottom:12px; text-align:left;">';
    html += '<b>🏬 ' + escape(customer.name) + '</b><br>';
    if (customer.phone) html += '📞 ' + escape(customer.phone) + '<br>';
    if (addr) html += '📍 ' + escape(addr).replace(/\n/g, '<br>') + '<br>';
    if (customer.shipping) html += '🚚 ขนส่ง: ' + escape(customer.shipping) + '<br>';
    html += '</div>';

    html += '<label style="display:block; text-align:left; font-weight:bold; margin-bottom:4px;">จำนวนลัง:</label>';
    html += '<select id="foamBoxCount" style="font-weight:bold;">';
    html += '<option value="1">1 ลัง</option>';
    html += '<option value="2">2 ลัง</option>';
    html += '<option value="3">3 ลัง</option>';
    html += '</select>';

    html += '<label style="display:block; text-align:left; font-weight:bold; margin-top:10px; margin-bottom:4px;">🚚 ขนส่ง:</label>';
    html += '<input type="text" id="foamShipping" value="' + escape(customer.shipping || '') + '" placeholder="ระบุขนส่ง (เช่น Kerry, Flash)">';

    html += '<label style="display:block; text-align:left; font-weight:bold; margin-top:10px; margin-bottom:4px;">📝 หมายเหตุ:</label>';
    html += '<textarea id="foamNote" rows="2" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>';

    html += '<button class="btn-fuel" onclick="foamSubmitDelivery(\'' + escape(customer.key) + '\')" style="margin-top:12px; font-size:16px; padding:14px;">✅ ยืนยันส่งลังโฟมวันนี้</button>';
    html += '<button class="btn-back" onclick="showFoamStaffView()">⬅️ กลับ</button>';

    document.getElementById('mainContent').innerHTML = html;
  }

  // ===== Submit Delivery =====
  function foamSubmitDelivery(customerKey) {
    var boxCount = Number(document.getElementById('foamBoxCount')?.value) || 1;
    var shipping = document.getElementById('foamShipping')?.value.trim() || '';
    var note = document.getElementById('foamNote')?.value.trim() || '';

    getRepo().getCustomer(customerKey).then(function (customer) {
      if (!customer) {
        window.alert('ไม่พบข้อมูลลูกค้า');
        return;
      }

      getDeliveryRepo().submitRequest({
        customerId: customerKey,
        customerSnapshot: {
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          province: customer.province,
          district: customer.district,
          subdistrict: customer.subdistrict,
          postalCode: customer.postalCode,
          shipping: shipping || customer.shipping || '',
          note: note
        },
        employeeId: window.currentUser ? window.currentUser.empId : '',
        employeeName: window.currentUser ? window.currentUser.empName : '',
        boxCount: boxCount,
        shipping: shipping || customer.shipping || '',
        note: note
      }).then(function (result) {
        var msg = result.isDuplicate
          ? '⚠️ ลูกค้ารายนี้มีรายการส่งในวันนี้แล้ว\nรายการนี้ถูกส่งให้แอดมินอนุมัติ (รายการซ้ำ)'
          : '✅ ส่งรายการลังโฟมเรียบร้อย\nแอดมินจะตรวจสอบและพิมพ์ป้ายให้';
        window.showModal(result.isDuplicate ? '⚠️ รายการซ้ำ' : '🎉 สำเร็จ', msg,
          '<button class="btn-ok" onclick="closeModal(); showFoamStaffView();">ตกลง</button>');
      }).catch(function (err) {
        console.warn('Submit foam delivery failed:', err);
        window.alert('ส่งรายการไม่สำเร็จ กรุณาลองใหม่');
      });
    });
  }

  // ===== New Customer Form =====
  function showFoamNewCustomerForm() {
    var html = '<div class="user-banner">➕ ลูกค้าใหม่</div>';

    html += '<input type="text" id="foamNewName" placeholder="ชื่อลูกค้า *" style="font-weight:bold;">';
    html += '<input type="text" id="foamNewPhone" placeholder="เบอร์โทรศัพท์">';
    html += '<textarea id="foamNewAddress" rows="2" placeholder="ที่อยู่ (เท่าที่ทราบ)"></textarea>';
    html += '<input type="text" id="foamNewShipping" placeholder="🚚 ขนส่ง (ถ้าทราบ)">';
    html += '<label style="display:block; text-align:left; font-weight:bold; margin-top:8px;">จำนวนลัง:</label>';
    html += '<select id="foamNewBoxCount" style="font-weight:bold;">';
    html += '<option value="1">1 ลัง</option>';
    html += '<option value="2">2 ลัง</option>';
    html += '<option value="3">3 ลัง</option>';
    html += '</select>';
    html += '<textarea id="foamNewNote" rows="2" placeholder="หมายเหตุ (ถ้ามี)"></textarea>';

    html += '<button class="btn-fuel" onclick="foamSubmitNewCustomer()" style="margin-top:12px; font-size:16px; padding:14px;">📤 ส่งให้แอดมินตรวจสอบ</button>';
    html += '<button class="btn-back" onclick="showFoamStaffView()">⬅️ กลับ</button>';

    document.getElementById('mainContent').innerHTML = html;
  }

  function foamSubmitNewCustomer() {
    var name = document.getElementById('foamNewName')?.value.trim();
    var phone = document.getElementById('foamNewPhone')?.value.trim();
    var address = document.getElementById('foamNewAddress')?.value.trim();
    var shipping = document.getElementById('foamNewShipping')?.value.trim();
    var boxCount = Number(document.getElementById('foamNewBoxCount')?.value) || 1;
    var note = document.getElementById('foamNewNote')?.value.trim();

    if (!name) {
      window.alert('กรุณากรอกชื่อลูกค้า');
      return;
    }

    // Add as a new customer first (pending review by admin)
    getRepo().addCustomer({
      name: name,
      phone: phone,
      address: address,
      shipping: shipping,
      note: 'ลูกค้าใหม่ - รอแอดมินตรวจสอบที่อยู่'
    }, window.currentUser ? window.currentUser.empId : '').then(function (result) {
      // Then submit delivery request
      return getDeliveryRepo().submitRequest({
        customerId: result.key,
        customerSnapshot: {
          name: name,
          phone: phone,
          address: address,
          shipping: shipping,
          note: note
        },
        employeeId: window.currentUser ? window.currentUser.empId : '',
        employeeName: window.currentUser ? window.currentUser.empName : '',
        boxCount: boxCount,
        shipping: shipping,
        note: 'ลูกค้าใหม่ - ' + (note || '')
      });
    }).then(function () {
      window.showModal('🎉 สำเร็จ', 'ส่งข้อมูลลูกค้าใหม่เรียบร้อย\nแอดมินจะตรวจสอบและเติมที่อยู่ให้ครบถ้วน',
        '<button class="btn-ok" onclick="closeModal(); showFoamStaffView();">ตกลง</button>');
    }).catch(function (err) {
      console.warn('Submit new customer failed:', err);
      window.alert('ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่');
    });
  }

  // ===== View Today's Requests =====
  function showFoamMyTodayRequests() {
    window.isAdmin = false;
    document.getElementById('mainCard').classList.remove('admin-wide');
    document.getElementById('hamburgerBtn').style.display = 'none';
    document.getElementById('pageTitle').innerText = '📋 รายการส่งลังโฟมของฉันวันนี้';
    document.getElementById('status').innerText = '';
    document.getElementById('listBox').style.display = 'none';

    var html = '<div class="user-banner">📋 รายการของฉันวันนี้</div>';
    html += '<div id="foamMyTodayList"><div style="color:#888; text-align:center; padding:20px;">กำลังโหลด...</div></div>';
    html += '<button class="btn-back" onclick="showFoamStaffView()" style="margin-top:12px;">⬅️ กลับ</button>';

    document.getElementById('mainContent').innerHTML = html;

    getDeliveryRepo().fetchRequestsByDate().then(function (list) {
      var myList = list.filter(function (r) {
        return String(r.employeeId) === String(window.currentUser && window.currentUser.empId);
      });

      var container = document.getElementById('foamMyTodayList');
      if (!container) return;

      if (myList.length === 0) {
        container.innerHTML = '<div style="color:#888; text-align:center; padding:20px;">ยังไม่มีรายการส่งวันนี้</div>';
        return;
      }

      myList.sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });

      var listHtml = '';
      myList.forEach(function (r) {
        var cs = r.customerSnapshot || {};
        var statusText = getDeliveryRepo().statusLabel(r.status);
        var statusColor = r.status === 'approved' || r.status === 'printed' || r.status === 'completed' ? '#28a745' :
                          r.status === 'cancelled' ? '#dc3545' : '#e67e22';

        listHtml += '<div class="history-item" style="border-left:4px solid ' + statusColor + ';">';
        listHtml += '<b>🏬 ' + escape(cs.name || 'ไม่ระบุชื่อ') + '</b>';
        listHtml += ' | 📦 ' + r.boxCount + ' ลัง';
        listHtml += '<br>สถานะ: <span style="color:' + statusColor + '; font-weight:bold;">' + statusText + '</span>';
        if (cs.shipping) listHtml += ' | 🚚 ' + escape(cs.shipping);
        if (r.isDuplicate) listHtml += '<br><span style="color:#e67e22; font-size:12px;">⚠️ รายการซ้ำ</span>';
        listHtml += '</div>';
      });
      container.innerHTML = listHtml;
    });
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.foamStaffUI = {
    showFoamStaffView: showFoamStaffView,
    foamLoadCustomerList: foamLoadCustomerList,
    foamSearchCustomers: foamSearchCustomers,
    foamSelectCustomer: foamSelectCustomer,
    foamSubmitDelivery: foamSubmitDelivery,
    showFoamNewCustomerForm: showFoamNewCustomerForm,
    foamSubmitNewCustomer: foamSubmitNewCustomer,
    showFoamMyTodayRequests: showFoamMyTodayRequests
  };

  window.showFoamStaffView = showFoamStaffView;
  window.foamSearchCustomers = foamSearchCustomers;
  window.foamSelectCustomer = foamSelectCustomer;
  window.foamSubmitDelivery = foamSubmitDelivery;
  window.showFoamNewCustomerForm = showFoamNewCustomerForm;
  window.foamSubmitNewCustomer = foamSubmitNewCustomer;
  window.showFoamMyTodayRequests = showFoamMyTodayRequests;
})();
