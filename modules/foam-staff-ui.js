/**
 * foam-staff-ui.js — Staff view for foam label delivery
 * Dependencies: window.PinThipSafe.foamCustomerRepo, window.PinThipSafe.foamDeliveryRepo
 */
(function () {
  'use strict';

  function escape(value) {
    return window.PinThipSafe && window.PinThipSafe.escapeHtml
      ? window.PinThipSafe.escapeHtml(value)
      : String(value || '').replace(/&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;').replace(/>/g, '&' + 'gt;').replace(/"/g, '&' + 'quot;').replace(/'/g, '&#39;');
  }

  function getRepo() {
    return window.PinThipSafe.foamCustomerRepo;
  }

  function getDeliveryRepo() {
    return window.PinThipSafe.foamDeliveryRepo;
  }

  // ===== Cache Management =====
  var customerCache = null;
  var cacheTimestamp = 0;
  var CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  var searchTimeout = null;
  var recentCustomers = []; // Store recent customer IDs

  function clearCustomerCache() {
    customerCache = null;
    cacheTimestamp = 0;
  }

  function addToRecentCustomers(customerId) {
    // Add to beginning, remove duplicates, keep only 5
    recentCustomers = [customerId, ...recentCustomers.filter(function(id) { return id !== customerId; })].slice(0, 5);
    // Save to localStorage
    try {
      localStorage.setItem('foamRecentCustomers', JSON.stringify(recentCustomers));
    } catch (e) {
      console.warn('Failed to save recent customers:', e);
    }
  }

  function loadRecentCustomers() {
    try {
      var stored = localStorage.getItem('foamRecentCustomers');
      if (stored) {
        recentCustomers = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load recent customers:', e);
    }
  }

  // ===== Main Staff View =====
  function showFoamStaffView() {
    if (!window.PinThipSafe || !window.PinThipSafe.requireFirebaseAuth || !window.PinThipSafe.requireFirebaseAuth()) {
      return;
    }

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

    html += '<button class="btn-history" onclick="showFoamMyTodayRequests()" style="width:100%; margin-bottom:12px; padding:10px;">📋 รายการส่งลังโฟมของฉันวันนี้</button>';

    html += '<div id="foamCustomerList" style="max-height:400px; overflow-y:auto; margin-bottom:12px;">';
    html += (typeof createLoadingHTML === 'function') ? createLoadingHTML('กำลังโหลดรายชื่อลูกค้า...') : '<div style="color:#888; text-align:center; padding:20px;">กำลังโหลดรายชื่อลูกค้า...</div>';
    html += '</div>';

    html += '<button class="btn-back" onclick="showDashboard()">⬅️ กลับหน้าหลัก</button>';

    document.getElementById('mainContent').innerHTML = html;
    foamLoadCustomerList('');
  }

  // ===== Search Customers (with debounce) =====
  function foamSearchCustomers() {
    // #1: Debounce - รอ 300ms หลังจาก user หยุดพิมพ์
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() {
      var input = document.getElementById('foamSearchInput');
      if (!input) return;
      var query = input.value.trim().toLowerCase();
      foamLoadCustomerList(query);
    }, 300);
  }

  // ===== Load Customer List (with cache) =====
  function foamLoadCustomerList(query) {
    var container = document.getElementById('foamCustomerList');
    if (!container) return;

    // #8: Check cache first
    var now = Date.now();
    if (customerCache && (now - cacheTimestamp) < CACHE_TTL) {
      filterAndDisplayCustomers(customerCache, query, container);
      return;
    }

    // No cache or expired - load from server
    container.innerHTML = (typeof createLoadingHTML === 'function') 
      ? createLoadingHTML('กำลังโหลดรายชื่อลูกค้า...') 
      : '<div style="color:#888; text-align:center; padding:20px;">กำลังโหลดรายชื่อลูกค้า...</div>';

    getRepo().searchCustomers('').then(function (allCustomers) {
      // Update cache
      customerCache = allCustomers;
      cacheTimestamp = now;
      filterAndDisplayCustomers(allCustomers, query, container);
    }).catch(function (err) {
      console.warn('Load customers failed:', err);
      container.innerHTML = '<div style="color:#d9534f; text-align:center; padding:20px;">โหลดข้อมูลไม่สำเร็จ</div>';
    });
  }

  function filterAndDisplayCustomers(allCustomers, query, container) {
    // Filter by query
    var customers = query 
      ? allCustomers.filter(function(c) {
          var searchText = (c.name + ' ' + (c.phone || '') + ' ' + (c.address || '')).toLowerCase();
          return searchText.indexOf(query) !== -1;
        })
      : allCustomers;

    // #2: แสดง "ไม่พบลูกค้า" พร้อมปุ่มเพิ่มใหม่
    if (customers.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:30px 20px;">' +
        '<div style="font-size:48px; margin-bottom:12px;">🔍</div>' +
        '<div style="color:#6b7280; margin-bottom:8px; font-size:15px;">ไม่พบลูกค้า' + 
        (query ? ' "' + escape(query) + '"' : '') + '</div>' +
        '<div style="color:#9ca3af; font-size:13px; margin-bottom:16px;">ลองค้นหาด้วยชื่อ เบอร์โทร หรือที่อยู่</div>' +
        '<button class="btn-blue" onclick="showFoamNewCustomerForm(\'' + escape(query) + '\')" style="max-width:200px; margin:0 auto;">' +
        '➕ เพิ่มลูกค้าใหม่</button></div>';
      return;
    }

    customers.sort(function (a, b) {
      return String(a.name || '').localeCompare(String(b.name || ''), 'th');
    });

    // #2: แสดงจำนวนผลลัพธ์
    var html = '<div style="color:#6b7280; padding:8px 12px; font-size:13px; background:#f8f9fa; border-radius:8px; margin-bottom:8px;">' +
      '🔍 พบ <b>' + customers.length + '</b> รายการ' + 
      (query ? ' จากการค้นหา "' + escape(query) + '"' : '') + '</div>';

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
      // #6: Add to recent customers
      addToRecentCustomers(customerKey);
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

    // #3: จำนวนลังที่ใหญ่ขึ้น พร้อม +/- buttons
    html += '<div style="margin-bottom:12px;">';
    html += '<label style="display:block; font-weight:bold; margin-bottom:6px;">จำนวนลัง</label>';
    html += '<div style="display:flex; align-items:center; gap:8px; justify-content:center;">';
    html += '<button type="button" onclick="var inp=document.getElementById(\'foamBoxCount\'); inp.value=Math.max(1, parseInt(inp.value||1)-1);" style="width:48px; height:48px; font-size:24px; padding:0;">−</button>';
    html += '<input type="number" id="foamBoxCount" value="1" min="1" max="999" style="width:100px; text-align:center; font-size:24px; font-weight:bold; height:48px; border:2px solid #3b82f6; border-radius:8px;">';
    html += '<button type="button" onclick="var inp=document.getElementById(\'foamBoxCount\'); inp.value=Math.min(999, parseInt(inp.value||1)+1);" style="width:48px; height:48px; font-size:24px; padding:0;">+</button>';
    html += '</div>';
    html += '</div>';

    html += '<label style="display:block; text-align:left; font-weight:bold; margin-top:10px; margin-bottom:4px;">🚚 ขนส่ง:</label>';
    html += '<input type="text" id="foamShipping" value="' + escape(customer.shipping || '') + '" placeholder="ระบุขนส่ง (เช่น Kerry, Flash)">';

    html += '<label style="display:block; text-align:left; font-weight:bold; margin-top:10px; margin-bottom:4px;">📝 หมายเหตุ:</label>';
    html += '<textarea id="foamNote" rows="2" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>';

    html += '<button class="btn-fuel" onclick="foamSubmitDelivery(\'' + escape(customer.key) + '\')" style="margin-top:12px; font-size:16px; padding:14px;">✅ ยืนยันส่งลังโฟมวันนี้</button>';
    html += '<button class="btn-back" onclick="showFoamStaffView()">⬅️ กลับ</button>';

    document.getElementById('mainContent').innerHTML = html;
    
    // #3: Auto-focus on box count input
    setTimeout(function() {
      var boxInput = document.getElementById('foamBoxCount');
      if (boxInput) {
        boxInput.focus();
        boxInput.select();
      }
    }, 100);
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
          lineName: customer.lineName || '',
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
  function showFoamNewCustomerForm(prefillName) {
    var html = '<div class="user-banner">➕ ลูกค้าใหม่</div>';

    // #5: คำแนะนำลดฟิลด์บังคับ
    html += '<div style="background:#fef3c7; border:1px solid #fbbf24; border-radius:8px; padding:12px; margin-bottom:12px; text-align:left;">';
    html += '💡 <b>เคล็ดลับ:</b> กรอกแค่ชื่อกับเบอร์โทรก็ส่งได้แล้ว<br>';
    html += '<span style="font-size:13px; color:#92400e;">แอดมินจะเติมที่อยู่ให้ครบถ้วนภายหลัง</span>';
    html += '</div>';

    html += '<input type="text" id="foamNewName" placeholder="ชื่อลูกค้า *" value="' + escape(prefillName || '') + '" style="font-weight:bold; border:2px solid #3b82f6;">';
    html += '<input type="tel" id="foamNewPhone" placeholder="เบอร์โทรศัพท์ *" style="border:2px solid #3b82f6;">';
    
    html += '<details style="margin:12px 0; border:1px solid #e5e7eb; border-radius:8px; padding:8px;">';
    html += '<summary style="cursor:pointer; color:#3b82f6; font-weight:bold; padding:4px;">➕ เพิ่มรายละเอียด (ถ้ารู้)</summary>';
    html += '<div style="margin-top:8px;">';
    html += '<textarea id="foamNewAddress" rows="2" placeholder="ที่อยู่ (เท่าที่ทราบ)" style="margin-top:8px;"></textarea>';
    html += '<input type="text" id="foamNewShipping" placeholder="🚚 ขนส่ง (ถ้าทราบ)">';
    html += '<textarea id="foamNewNote" rows="2" placeholder="หมายเหตุ (ถ้ามี)"></textarea>';
    html += '</div>';
    html += '</details>';

    // จำนวนลังแบบใหม่
    html += '<div style="margin:12px 0;">';
    html += '<label style="display:block; font-weight:bold; margin-bottom:6px;">จำนวนลัง</label>';
    html += '<div style="display:flex; align-items:center; gap:8px; justify-content:center;">';
    html += '<button type="button" onclick="var inp=document.getElementById(\'foamNewBoxCount\'); inp.value=Math.max(1, parseInt(inp.value||1)-1);" style="width:48px; height:48px; font-size:24px; padding:0;">−</button>';
    html += '<input type="number" id="foamNewBoxCount" value="1" min="1" max="999" style="width:100px; text-align:center; font-size:24px; font-weight:bold; height:48px; border:2px solid #3b82f6; border-radius:8px;">';
    html += '<button type="button" onclick="var inp=document.getElementById(\'foamNewBoxCount\'); inp.value=Math.min(999, parseInt(inp.value||1)+1);" style="width:48px; height:48px; font-size:24px; padding:0;">+</button>';
    html += '</div>';
    html += '</div>';

    html += '<button class="btn-fuel" onclick="foamSubmitNewCustomer()" style="margin-top:12px; font-size:16px; padding:14px;">📤 ส่งให้แอดมินตรวจสอบ</button>';
    html += '<button class="btn-back" onclick="showFoamStaffView()">⬅️ กลับ</button>';

    document.getElementById('mainContent').innerHTML = html;
  }

  function foamSubmitNewCustomer() {
    console.log('[foam-staff-ui] foamSubmitNewCustomer called');
    var name = document.getElementById('foamNewName')?.value.trim();
    var phone = document.getElementById('foamNewPhone')?.value.trim();
    var address = document.getElementById('foamNewAddress')?.value.trim();
    var shipping = document.getElementById('foamNewShipping')?.value.trim();
    var boxCount = Number(document.getElementById('foamNewBoxCount')?.value) || 1;
    var note = document.getElementById('foamNewNote')?.value.trim();

    console.log('[foam-staff-ui] Form data:', { name, phone, address, shipping, boxCount, note });
    console.log('[foam-staff-ui] Current user:', window.currentUser);

    // #5: Validation - บังคับเฉพาะชื่อ + เบอร์โทร
    if (!name) {
      window.alert('⚠️ กรุณากรอกชื่อลูกค้า');
      return;
    }

    if (!phone) {
      window.alert('⚠️ กรุณากรอกเบอร์โทรศัพท์\n\nเบอร์โทรจำเป็นสำหรับการติดต่อลูกค้า');
      return;
    }

    if (!window.currentUser || !window.currentUser.empId) {
      window.alert('ข้อผิดพลาด: ไม่พบข้อมูลพนักงาน กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    var repo = getRepo();
    var deliveryRepo = getDeliveryRepo();
    
    if (!repo || !deliveryRepo) {
      window.alert('ระบบยังไม่พร้อมใช้งาน กรุณารีเฟรชหน้า');
      return;
    }

    console.log('[foam-staff-ui] Adding customer...');
    repo.addCustomer({
      name: name,
      phone: phone,
      address: address,
      shipping: shipping,
      note: 'ลูกค้าใหม่ - รอแอดมินตรวจสอบที่อยู่'
    }, window.currentUser.empId).then(function (result) {
      console.log('[foam-staff-ui] Customer added, key:', result.key);
      console.log('[foam-staff-ui] Submitting delivery request...');
      return deliveryRepo.submitRequest({
        customerId: result.key,
        customerSnapshot: {
          name: name,
          phone: phone,
          lineName: '',
          address: address,
          shipping: shipping,
          note: note
        },
        employeeId: window.currentUser.empId,
        employeeName: window.currentUser.empName,
        boxCount: boxCount,
        shipping: shipping,
        note: 'ลูกค้าใหม่ - ' + (note || '')
      });
    }).then(function () {
      console.log('[foam-staff-ui] Delivery request submitted successfully');
      window.showModal('🎉 สำเร็จ', 'ส่งข้อมูลลูกค้าใหม่เรียบร้อย\nแอดมินจะตรวจสอบและเติมที่อยู่ให้ครบถ้วน',
        '<button class="btn-ok" onclick="closeModal(); showFoamStaffView();">ตกลง</button>');
    }).catch(function (err) {
      console.error('[foam-staff-ui] Operation failed:', err);
      var errMsg = (err && err.message) ? err.message : 'ส่งข้อมูลไม่สำเร็จ';
      window.alert(errMsg + '\n\nตรวจสอบคอนโซล (F12) สำหรับรายละเอียด');
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
    html += '<div id="foamMyTodayList">' + ((typeof createLoadingHTML === 'function') ? createLoadingHTML() : '<div style="color:#888; text-align:center; padding:20px;">กำลังโหลด...</div>') + '</div>';
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

      // #4: แสดงจำนวนรายการ
      var listHtml = '<div style="color:#6b7280; padding:8px 12px; font-size:13px; background:#f8f9fa; border-radius:8px; margin-bottom:12px;">';
      listHtml += '📋 ส่งไปแล้ว <b>' + myList.length + '</b> รายการวันนี้';
      listHtml += '</div>';

      myList.forEach(function (r) {
        var cs = r.customerSnapshot || {};
        var statusText = getDeliveryRepo().statusLabel(r.status);
        var statusColor = r.status === 'approved' || r.status === 'printed' || r.status === 'completed' ? '#10b981' :
                          r.status === 'cancelled' ? '#dc3545' : '#f59e0b';
        var canEdit = r.status === 'pending_review' || r.status === 'pending_duplicate_approval';

        // #4: Format timestamp
        var timeStr = '';
        if (r.createdAt || r.timestamp) {
          try {
            var date = new Date(r.createdAt || r.timestamp);
            timeStr = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
          } catch (e) {
            timeStr = '';
          }
        }

        listHtml += '<div class="history-item" style="border-left:4px solid ' + statusColor + ';">';
        listHtml += '<div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">';
        listHtml += '<div style="flex:1;">';
        listHtml += '<b>🏬 ' + escape(cs.name || 'ไม่ระบุชื่อ') + '</b>';
        listHtml += '</div>';
        
        // #4: Status badge
        listHtml += '<span style="background:' + statusColor + '; color:white; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:bold; white-space:nowrap;">';
        listHtml += statusText;
        listHtml += '</span>';
        listHtml += '</div>';

        listHtml += '<div style="font-size:14px; color:#374151; margin-bottom:6px;">';
        listHtml += '📦 ' + r.boxCount + ' ลัง';
        if (cs.shipping) listHtml += ' | 🚚 ' + escape(cs.shipping);
        // #4: Show time
        if (timeStr) listHtml += ' | 🕐 ' + timeStr;
        listHtml += '</div>';

        if (r.isDuplicate) listHtml += '<div style="color:#f59e0b; font-size:12px; margin-bottom:4px;">⚠️ รายการซ้ำ</div>';
        if (r.note) listHtml += '<div style="font-size:12px; color:#6b7280; margin-bottom:8px;">📝 ' + escape(r.note) + '</div>';

        // #7: Action buttons (แก้ไข + ลบ)
        if (canEdit) {
          listHtml += '<div style="display:flex; gap:8px; margin-top:8px;">';
          listHtml += '<button class="btn-blue" onclick="foamEditMyRequest(\'' + escape(r.key) + '\')" style="flex:1; margin:0; padding:8px 12px; font-size:13px;">✏️ แก้ไข</button>';
          listHtml += '<button class="btn-danger" onclick="foamDeleteMyRequest(\'' + escape(r.key) + '\')" style="flex:1; margin:0; padding:8px 12px; font-size:13px;">🗑️ ลบ</button>';
          listHtml += '</div>';
        }
        
        listHtml += '</div>';
      });
      container.innerHTML = listHtml;
    });
  }

  // ===== Edit My Request =====
  function foamEditMyRequest(requestKey) {
    getDeliveryRepo().fetchRequestsByDate().then(function (list) {
      var req = list.find(function (r) { return r.key === requestKey; });
      if (!req) {
        window.alert('ไม่พบรายการนี้');
        return;
      }

      var cs = req.customerSnapshot || {};

      var html = '<div class="user-banner">✏️ แก้ไขรายการส่งลังโฟม</div>';

      html += '<div style="background:#f8f9fa; border-radius:10px; padding:14px; margin-bottom:12px; text-align:left;">';
      html += '<b>🏬 เดิม: ' + escape(cs.name || 'ไม่ระบุชื่อ') + '</b><br>';
      html += '📦 ' + req.boxCount + ' ลัง | 🚚 ' + escape(cs.shipping || '-') + '<br>';
      html += 'สถานะ: ' + getDeliveryRepo().statusLabel(req.status);
      html += '</div>';

      html += '<label style="display:block; text-align:left; font-weight:bold; margin-bottom:4px;">🔍 ค้นหาลูกค้าใหม่:</label>';
      html += '<input type="text" id="foamEditSearchInput" placeholder="🔍 ค้นหาชื่อหรือเบอร์โทร..." style="margin-bottom:8px;" oninput="foamEditSearchCustomers()">';
      html += '<div id="foamEditCustomerList" style="max-height:200px; overflow-y:auto; margin-bottom:12px; border:1px solid #dee2e6; border-radius:8px;">';
      html += '<div style="color:#888; text-align:center; padding:10px;">พิมพ์เพื่อค้นหาลูกค้า...</div>';
      html += '</div>';

      html += '<label style="display:block; text-align:left; font-weight:bold; margin-bottom:4px;">จำนวนลัง:</label>';
      html += '<select id="foamEditBoxCount" style="font-weight:bold;">';
      for (var i = 1; i <= 10; i++) {
        html += '<option value="' + i + '"' + (i === req.boxCount ? ' selected' : '') + '>' + i + ' ลัง</option>';
      }
      html += '</select>';

      html += '<label style="display:block; text-align:left; font-weight:bold; margin-top:10px; margin-bottom:4px;">🚚 ขนส่ง:</label>';
      html += '<input type="text" id="foamEditShipping" value="' + escape(cs.shipping || '') + '" placeholder="ระบุขนส่ง">';

      html += '<label style="display:block; text-align:left; font-weight:bold; margin-top:10px; margin-bottom:4px;">📝 หมายเหตุ:</label>';
      html += '<textarea id="foamEditNote" rows="2" placeholder="หมายเหตุเพิ่มเติม">' + escape(req.note || '') + '</textarea>';

      html += '<input type="hidden" id="foamEditRequestKey" value="' + escape(requestKey) + '">';
      html += '<input type="hidden" id="foamEditCustomerId" value="' + escape(req.customerId || '') + '">';
      html += '<input type="hidden" id="foamEditCustomerName" value="' + escape(cs.name || '') + '">';

      html += '<button class="btn-fuel" onclick="foamSaveEditRequest()" style="margin-top:12px; font-size:16px; padding:14px;">💾 บันทึกการแก้ไข</button>';
      html += '<button class="btn-back" onclick="showFoamMyTodayRequests()">⬅️ กลับ</button>';

      document.getElementById('mainContent').innerHTML = html;
    });
  }

  function foamEditSearchCustomers() {
    var input = document.getElementById('foamEditSearchInput');
    var query = input ? input.value : '';
    var container = document.getElementById('foamEditCustomerList');
    if (!container) return;

    if (!query) {
      container.innerHTML = '<div style="color:#888; text-align:center; padding:10px;">พิมพ์เพื่อค้นหาลูกค้า...</div>';
      return;
    }

    getRepo().searchCustomers(query).then(function (customers) {
      if (customers.length === 0) {
        container.innerHTML = '<div style="color:#888; text-align:center; padding:10px;">ไม่พบลูกค้า</div>';
        return;
      }

      customers.sort(function (a, b) {
        return String(a.name || '').localeCompare(String(b.name || ''), 'th');
      });

      var listHtml = '';
      customers.forEach(function (c) {
        var addr = [c.address, c.subdistrict, c.district, c.province, c.postalCode]
          .filter(Boolean).join(' ');
        listHtml += '<div class="history-item" style="cursor:pointer; border-left:4px solid #0d6efd; padding:8px 12px;" onclick="foamEditSelectCustomer(\'' + escape(c.key) + '\', \'' + escape(c.name || '') + '\')">';
        listHtml += '<b>🏬 ' + escape(c.name) + '</b>';
        if (c.phone) listHtml += ' | 📞 ' + escape(c.phone);
        if (addr) listHtml += '<br><span style="font-size:11px; color:#555;">📍 ' + escape(addr) + '</span>';
        listHtml += '</div>';
      });
      container.innerHTML = listHtml;
    });
  }

  function foamEditSelectCustomer(customerKey, customerName) {
    document.getElementById('foamEditCustomerId').value = customerKey;
    document.getElementById('foamEditCustomerName').value = customerName;
    document.getElementById('foamEditSearchInput').value = customerName;
    document.getElementById('foamEditCustomerList').innerHTML = '<div style="color:#28a745; text-align:center; padding:10px; font-weight:bold;">✅ เลือก: ' + escape(customerName) + '</div>';
  }

  function foamSaveEditRequest() {
    var requestKey = document.getElementById('foamEditRequestKey')?.value;
    var customerId = document.getElementById('foamEditCustomerId')?.value;
    var customerName = document.getElementById('foamEditCustomerName')?.value;
    var boxCount = Number(document.getElementById('foamEditBoxCount')?.value) || 1;
    var shipping = document.getElementById('foamEditShipping')?.value.trim() || '';
    var note = document.getElementById('foamEditNote')?.value.trim() || '';

    if (!requestKey) {
      window.alert('ไม่พบรหัสรายการ');
      return;
    }

    var dateStr = (window.PinThipSafe && window.PinThipSafe.utils && window.PinThipSafe.utils.getLocalDateTimeString)
      ? window.PinThipSafe.utils.getLocalDateTimeString()
      : new Date().toISOString().slice(0, 10);

    // Fetch customer snapshot if customer changed
    var updatePromise;
    if (customerId) {
      updatePromise = getRepo().getCustomer(customerId).then(function (customer) {
        var cs = customer ? {
          name: customer.name || customerName,
          phone: customer.phone || '',
          lineName: customer.lineName || '',
          address: customer.address || '',
          province: customer.province || '',
          district: customer.district || '',
          subdistrict: customer.subdistrict || '',
          postalCode: customer.postalCode || '',
          shipping: shipping || customer.shipping || '',
          note: note
        } : {
          name: customerName,
          phone: '',
          lineName: '',
          address: '',
          shipping: shipping,
          note: note
        };
        return getDeliveryRepo().updateRequest(dateStr, requestKey, {
          customerId: customerId,
          customerSnapshot: cs,
          boxCount: boxCount,
          shipping: shipping,
          note: note
        });
      });
    } else {
      updatePromise = getDeliveryRepo().updateRequest(dateStr, requestKey, {
        boxCount: boxCount,
        shipping: shipping,
        note: note
      });
    }

    updatePromise.then(function () {
      window.showModal('✅ สำเร็จ', 'แก้ไขรายการเรียบร้อย',
        '<button class="btn-ok" onclick="closeModal(); showFoamMyTodayRequests();">ตกลง</button>');
    }).catch(function (err) {
      console.warn('Edit request failed:', err);
      window.alert('แก้ไขไม่สำเร็จ กรุณาลองใหม่');
    });
  }

  // #7: Delete Request Function
  function foamDeleteMyRequest(requestKey) {
    if (!window.confirm('⚠️ ต้องการลบรายการนี้ใช่หรือไม่?\n\nการลบไม่สามารถย้อนกลับได้')) {
      return;
    }

    var dateStr = (window.PinThipSafe && window.PinThipSafe.utils && window.PinThipSafe.utils.getLocalDateTimeString)
      ? window.PinThipSafe.utils.getLocalDateTimeString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    getDeliveryRepo().deleteRequest(dateStr, requestKey).then(function() {
      window.showModal('✅ สำเร็จ', 'ลบรายการเรียบร้อย',
        '<button class="btn-ok" onclick="closeModal(); showFoamMyTodayRequests();">ตกลง</button>');
    }).catch(function(err) {
      console.warn('Delete request failed:', err);
      window.alert('ลบไม่สำเร็จ กรุณาลองใหม่');
    });
  }

  // Initialize recent customers on module load
  loadRecentCustomers();

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.foamStaffUI = {
    showFoamStaffView: showFoamStaffView,
    foamLoadCustomerList: foamLoadCustomerList,
    foamSearchCustomers: foamSearchCustomers,
    foamSelectCustomer: foamSelectCustomer,
    foamSubmitDelivery: foamSubmitDelivery,
    showFoamNewCustomerForm: showFoamNewCustomerForm,
    foamSubmitNewCustomer: foamSubmitNewCustomer,
    showFoamMyTodayRequests: showFoamMyTodayRequests,
    foamEditMyRequest: foamEditMyRequest,
    foamEditSearchCustomers: foamEditSearchCustomers,
    foamEditSelectCustomer: foamEditSelectCustomer,
    foamSaveEditRequest: foamSaveEditRequest,
    foamDeleteMyRequest: foamDeleteMyRequest
  };

  window.showFoamStaffView = showFoamStaffView;
  window.foamSearchCustomers = foamSearchCustomers;
  window.foamSelectCustomer = foamSelectCustomer;
  window.foamSubmitDelivery = foamSubmitDelivery;
  window.showFoamNewCustomerForm = showFoamNewCustomerForm;
  window.foamSubmitNewCustomer = foamSubmitNewCustomer;
  window.showFoamMyTodayRequests = showFoamMyTodayRequests;
  window.foamEditMyRequest = foamEditMyRequest;
  window.foamEditSearchCustomers = foamEditSearchCustomers;
  window.foamEditSelectCustomer = foamEditSelectCustomer;
  window.foamSaveEditRequest = foamSaveEditRequest;
  window.foamDeleteMyRequest = foamDeleteMyRequest;
})();
