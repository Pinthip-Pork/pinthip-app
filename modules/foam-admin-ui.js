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
    if (!window.PinThipSafe || !window.PinThipSafe.requireFirebaseAuth || !window.PinThipSafe.requireFirebaseAuth()) {
      return;
    }

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
      '<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:16px;">' +
        '<button class="btn-blue" onclick="showFoamCustomerManager()" style="flex:1; min-width:180px;">👥 จัดการลูกค้า</button>' +
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

  function normalizeFoamCustomerRecord(raw) {
    var value = raw || {};
    return {
      name: String(value.name || value.customer || value.customer_name || value['ชื่อลูกค้า'] || '').trim(),
      phone: String(value.phone || value.tel || value.mobile || value.telephone || value['เบอร์โทร'] || value['โทรศัพท์'] || value['เบอร์โทรศัพท์'] || '').trim(),
      lineName: String(value.lineName || value.line || value.line_id || value['ชื่อไลน์'] || value['LINE'] || value['Line'] || '').trim(),
      address: String(value.address || value['ที่อยู่'] || '').trim(),
      subdistrict: String(value.subdistrict || value['ตำบล'] || value['แขวง/ตำบล'] || '').trim(),
      district: String(value.district || value['อำเภอ'] || value['เขต/อำเภอ'] || '').trim(),
      province: String(value.province || value['จังหวัด'] || '').trim(),
      postalCode: String(value.postalCode || value.postalcode || value['รหัสไปรษณีย์'] || '').trim(),
      shipping: String(value.shipping || value['ขนส่ง'] || '').trim(),
      note: String(value.note || value['หมายเหตุ'] || '').trim()
    };
  }

  function parseFoamCsvText(text) {
    var rows = []; var line = []; var current = ''; var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        line.push(current);
        current = '';
      } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        line.push(current);
        if (line.some(function (cell) { return String(cell).trim() !== ''; })) {
          rows.push(line);
        }
        line = [];
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.length > 0 || line.length > 0) {
      line.push(current);
      if (line.some(function (cell) { return String(cell).trim() !== ''; })) rows.push(line);
    }
    if (!rows.length) return [];

    var header = rows[0].map(function (h) { return String(h || '').trim(); });
    var dataRows = rows.slice(1);
    return dataRows.map(function (row) {
      var obj = {};
      var maxLen = Math.max(header.length, row.length);
      for (var j = 0; j < maxLen; j++) {
        var key = header[j] || 'column_' + j;
        obj[key] = row[j] || '';
      }
      return normalizeFoamCustomerRecord(obj);
    }).filter(function (row) { return String(row.name || '').trim(); });
  }

  function foamHandleImportFile(file) {
    if (!file) return;

    var repo = getCustomerRepo();
    if (!repo) {
      window.alert('ระบบฐานข้อมูลลูกค้าไม่พร้อมใช้งาน');
      return;
    }

    var isExcel = /\.(xlsx|xls)$/i.test(file.name || '');
    var isCsv = /\.csv$/i.test(file.name || '');

    function finishRows(rows) {
      var records = Array.isArray(rows) ? rows : [];
      if (!records.length) {
        window.alert('ไม่พบข้อมูลลูกค้าในไฟล์ที่เลือก');
        return;
      }

      var importer = Promise.resolve();
      var created = 0;
      records.forEach(function (record) {
        importer = importer.then(function () {
          return repo.addCustomer(record, 'admin').then(function () {
            created += 1;
          });
        });
      });

      importer.then(function () {
        window.showModal('📥 สำเร็จ', 'นำเข้าสู่ฐานข้อมูลลูกค้าแล้ว ' + created + ' รายการ', '<button class="btn-ok" onclick="closeModal(); showFoamCustomerManager();">ตกลง</button>');
      }).catch(function (err) {
        console.warn('Import foam customers failed:', err);
        window.alert('นำเข้าข้อมูลไม่สำเร็จ กรุณาตรวจสอบรูปแบบไฟล์');
      });
    }

    if (isCsv || !isExcel) {
      file.text().then(function (text) {
        finishRows(parseFoamCsvText(text));
      }).catch(function (err) {
        console.warn('Read CSV failed:', err);
        window.alert('อ่านไฟล์ไม่สำเร็จ');
      });
      return;
    }

    if (window.XLSX && typeof window.XLSX.read === 'function') {
      var reader = new FileReader();
      reader.onload = function (event) {
        try {
          var workbook = window.XLSX.read(event.target.result, { type: 'array' });
          var sheet = workbook.Sheets[workbook.SheetNames[0]];
          var jsonRows = window.XLSX.utils.sheet_to_json(sheet, { defval: '' });
          finishRows(jsonRows.map(function (row) { return normalizeFoamCustomerRecord(row); }).filter(function (row) { return String(row.name || '').trim(); }));
        } catch (err) {
          console.warn('Excel parse failed:', err);
          window.alert('ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาใช้ไฟล์ CSV หรือไฟล์ Excel ที่มีข้อมูลแบบตาราง');
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    window.alert('โปรดอัปโหลดไฟล์ CSV หรือใช้ Excel ที่เปิดโดยมี XLSX.js ในหน้าเว็บ');
  }

  function showFoamCustomerManager() {
    var html = '' +
      '<div class="user-banner">👥 จัดการลูกค้าลังโฟม</div>' +
      '<div style="display:grid; gap:12px; margin-bottom:16px;">' +
        '<div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">' +
          '<input id="foamCustomerManagerSearch" type="text" placeholder="ค้นหาชื่อหรือเบอร์ลูกค้า" style="flex:1; min-width:180px;" oninput="foamCustomerManagerSearch()">' +
          '<button class="btn-blue" onclick="foamCustomerManagerSearch()">🔍 ค้นหา</button>' +
        '</div>' +
        '<div style="display:flex; flex-wrap:wrap; gap:8px;">' +
          '<input id="foamImportCustomerFile" type="file" accept=".csv,.xlsx,.xls" onchange="foamHandleImportFile(this.files && this.files[0])" style="flex:1; min-width:220px;">' +
        '</div>' +
      '</div>' +
      '<div id="foamCustomerManagerList" style="max-height:420px; overflow-y:auto; border:1px solid #e9ecef; border-radius:12px; padding:8px; background:#fff; margin-bottom:12px;">' +
        '<div style="color:#888; text-align:center; padding:20px;">กำลังโหลดรายชื่อลูกค้า...</div>' +
      '</div>' +
      '<div style="background:#f8f9fa; border:1px solid #e9ecef; border-radius:12px; padding:12px; margin-bottom:12px; text-align:left;">' +
        '<div style="font-weight:bold; margin-bottom:10px;">➕ เพิ่มลูกค้าใหม่</div>' +
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">' +
          '<input id="foamManualName" type="text" placeholder="ชื่อลูกค้า *">' +
          '<input id="foamManualPhone" type="text" placeholder="เบอร์โทรศัพท์">' +
        '</div>' +
        '<input id="foamManualLineName" type="text" placeholder="ชื่อ LINE ลูกค้า (ไม่พิมพ์ลงป้าย)" style="margin-top:8px;">' +
        '<textarea id="foamManualAddress" rows="2" placeholder="ที่อยู่"></textarea>' +
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">' +
          '<input id="foamManualSubdistrict" type="text" placeholder="แขวง/ตำบล">' +
          '<input id="foamManualDistrict" type="text" placeholder="เขต/อำเภอ">' +
        '</div>' +
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">' +
          '<input id="foamManualProvince" type="text" placeholder="จังหวัด">' +
          '<input id="foamManualPostal" type="text" placeholder="รหัสไปรษณีย์">' +
        '</div>' +
        '<input id="foamManualShipping" type="text" placeholder="ขนส่ง" style="margin-top:8px;">' +
        '<textarea id="foamManualNote" rows="2" placeholder="หมายเหตุ" style="margin-top:8px;"></textarea>' +
        '<button class="btn-fuel" onclick="foamSubmitManualCustomer()" style="margin-top:12px; width:100%;">💾 บันทึกลูกค้า</button>' +
      '</div>' +
      '<button class="btn-back" onclick="showFoamAdminView()" style="margin-top:16px;">⬅️ กลับ</button>';

    var mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
    foamCustomerManagerSearch();
  }

  function foamCustomerManagerSearch() {
    var query = document.getElementById('foamCustomerManagerSearch') ? document.getElementById('foamCustomerManagerSearch').value : '';
    var repo = getCustomerRepo();
    var list = document.getElementById('foamCustomerManagerList');
    if (!repo || !list) return;

    repo.searchCustomers(query).then(function (customers) {
      customers.sort(function (a, b) {
        return String(a.name || '').localeCompare(String(b.name || ''), 'th');
      });

      if (!customers.length) {
        list.innerHTML = '<div style="color:#888; text-align:center; padding:25px;">ไม่พบลูกค้า</div>';
        return;
      }

      var html = '';
      customers.forEach(function (customer) {
        var addr = [customer.address, customer.subdistrict, customer.district, customer.province, customer.postalCode].filter(Boolean).join(' ');
        html += '<div class="history-item" style="display:flex; flex-direction:column; gap:9px; padding:14px;">' +
          '<div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">' +
            '<div style="font-size:18px; line-height:1.4;"><b>' + escape(customer.name || '-') + '</b>' + (customer.phone ? '<span style="font-size:15px; font-weight:normal; white-space:nowrap;"> | 📞 ' + escape(customer.phone) + '</span>' : '') + '</div>' +
            '<button class="btn-danger" onclick="foamDeleteCustomerFromManager(\'' + escape(customer.key || '') + '\')" aria-label="ลบลูกค้า ' + escape(customer.name || '') + '" title="ลบลูกค้า" style="width:auto; min-width:0; margin:0; padding:4px 8px; font-size:11px; line-height:1.2; border-radius:999px; box-shadow:none;">🗑️ ลบ</button>' +
          '</div>' +
          (addr ? '<div style="font-size:15px; line-height:1.5; color:#444;">📍 ' + escape(addr) + '</div>' : '') +
          (customer.lineName ? '<div style="font-size:14px; line-height:1.4; color:#16803c;">💬 LINE: ' + escape(customer.lineName) + '</div>' : '') +
          (customer.shipping ? '<div style="font-size:14px; line-height:1.4; color:#555;">🚚 ' + escape(customer.shipping) + '</div>' : '') +
          '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
            '<button class="btn-fuel" onclick="foamEditCustomerFromManager(\'' + escape(customer.key || '') + '\')" style="flex:1; min-width:120px;">✏️ แก้ไขข้อมูล</button>' +
            '<button class="btn-blue" onclick="foamUseCustomerForPrint(\'' + escape(customer.key || '') + '\')" style="flex:1; min-width:120px;">🖨️ พิมพ์ป้าย</button>' +
          '</div>' +
        '</div>';
      });
      list.innerHTML = html;
    }).catch(function (err) {
      console.warn('foamCustomerManagerSearch failed:', err);
      list.innerHTML = '<div style="color:#d9534f; text-align:center; padding:25px;">โหลดข้อมูลลูกค้าไม่สำเร็จ</div>';
    });
  }

  function foamSubmitManualCustomer() {
    console.log('[foam-admin] foamSubmitManualCustomer called');
    var repo = getCustomerRepo();
    if (!repo) {
      window.alert('ระบบฐานข้อมูลลูกค้าไม่พร้อมใช้งาน');
      return;
    }

    var payload = {
      name: document.getElementById('foamManualName') ? document.getElementById('foamManualName').value.trim() : '',
      phone: document.getElementById('foamManualPhone') ? document.getElementById('foamManualPhone').value.trim() : '',
      lineName: document.getElementById('foamManualLineName') ? document.getElementById('foamManualLineName').value.trim() : '',
      address: document.getElementById('foamManualAddress') ? document.getElementById('foamManualAddress').value.trim() : '',
      subdistrict: document.getElementById('foamManualSubdistrict') ? document.getElementById('foamManualSubdistrict').value.trim() : '',
      district: document.getElementById('foamManualDistrict') ? document.getElementById('foamManualDistrict').value.trim() : '',
      province: document.getElementById('foamManualProvince') ? document.getElementById('foamManualProvince').value.trim() : '',
      postalCode: document.getElementById('foamManualPostal') ? document.getElementById('foamManualPostal').value.trim() : '',
      shipping: document.getElementById('foamManualShipping') ? document.getElementById('foamManualShipping').value.trim() : '',
      note: document.getElementById('foamManualNote') ? document.getElementById('foamManualNote').value.trim() : ''
    };

    console.log('[foam-admin] Payload:', payload);
    console.log('[foam-admin] Current user:', window.currentUser);

    if (!payload.name) {
      window.alert('กรุณากรอกชื่อลูกค้า');
      return;
    }

    console.log('[foam-admin] Adding customer with createdBy: admin');
    repo.addCustomer(payload, 'admin').then(function () {
      console.log('[foam-admin] Customer added successfully');
      window.showModal('✅ สำเร็จ', 'เพิ่มลูกค้าลังโฟมเรียบร้อยแล้ว', '<button class="btn-ok" onclick="closeModal(); showFoamCustomerManager();">ตกลง</button>');
    }).catch(function (err) {
      console.error('[foam-admin] Add foam customer failed:', err);
      var errMsg = (err && err.message) ? err.message : 'เพิ่มลูกค้าไม่สำเร็จ';
      window.alert(errMsg + '\n\nตรวจสอบคอนโซล (F12) สำหรับรายละเอียด');
    });
  }

  function foamDeleteCustomerFromManager(customerKey) {
    if (!customerKey || !window.confirm('ต้องการลบลูกค้ารายนี้ใช่หรือไม่?')) return;
    var repo = getCustomerRepo();
    if (!repo) return;

    repo.deleteCustomer(customerKey).then(function () {
      foamCustomerManagerSearch();
    }).catch(function (err) {
      console.warn('Delete foam customer failed:', err);
      window.alert('ลบลูกค้าไม่สำเร็จ');
    });
  }

  function foamEditCustomerFromManager(customerKey) {
    var repo = getCustomerRepo();
    if (!repo || !customerKey) return;

    repo.getCustomer(customerKey).then(function (customer) {
      if (!customer) {
        window.alert('ไม่พบข้อมูลลูกค้า');
        return;
      }

      var fields = [
        ['foamEditCustomerName', 'ชื่อลูกค้า *', customer.name],
        ['foamEditCustomerPhone', 'เบอร์โทรศัพท์', customer.phone],
        ['foamEditCustomerLineName', 'ชื่อ LINE ลูกค้า (ไม่พิมพ์ลงป้าย)', customer.lineName],
        ['foamEditCustomerAddress', 'ที่อยู่', customer.address],
        ['foamEditCustomerSubdistrict', 'แขวง/ตำบล', customer.subdistrict],
        ['foamEditCustomerDistrict', 'เขต/อำเภอ', customer.district],
        ['foamEditCustomerProvince', 'จังหวัด', customer.province],
        ['foamEditCustomerPostalCode', 'รหัสไปรษณีย์', customer.postalCode],
        ['foamEditCustomerShipping', 'ขนส่ง', customer.shipping]
      ];
      var formHtml = '<div style="display:grid; gap:10px; text-align:left;">';
      fields.forEach(function (field) {
        formHtml += '<label style="font-weight:bold;">' + field[1] + '<input id="' + field[0] + '" type="text" value="' + escape(field[2] || '') + '" style="margin-top:4px;"></label>';
      });
      formHtml += '<label style="font-weight:bold;">หมายเหตุ<textarea id="foamEditCustomerNote" rows="3" style="margin-top:4px;">' + escape(customer.note || '') + '</textarea></label>';
      formHtml += '</div>';

      window.openWideModal('✏️ แก้ไขข้อมูลลูกค้า', formHtml,
        '<button class="btn-back" onclick="closeModal()">ยกเลิก</button>' +
        '<button class="btn-ok" onclick="foamSaveEditedCustomer(' + escape(JSON.stringify(customerKey)) + ')">💾 บันทึก</button>');
    }).catch(function (err) {
      console.warn('Load foam customer for edit failed:', err);
      window.alert('โหลดข้อมูลลูกค้าไม่สำเร็จ');
    });
  }

  function foamSaveEditedCustomer(customerKey) {
    var repo = getCustomerRepo();
    if (!repo || !customerKey) return;

    var data = {
      name: document.getElementById('foamEditCustomerName')?.value.trim() || '',
      phone: document.getElementById('foamEditCustomerPhone')?.value.trim() || '',
      lineName: document.getElementById('foamEditCustomerLineName')?.value.trim() || '',
      address: document.getElementById('foamEditCustomerAddress')?.value.trim() || '',
      subdistrict: document.getElementById('foamEditCustomerSubdistrict')?.value.trim() || '',
      district: document.getElementById('foamEditCustomerDistrict')?.value.trim() || '',
      province: document.getElementById('foamEditCustomerProvince')?.value.trim() || '',
      postalCode: document.getElementById('foamEditCustomerPostalCode')?.value.trim() || '',
      shipping: document.getElementById('foamEditCustomerShipping')?.value.trim() || '',
      note: document.getElementById('foamEditCustomerNote')?.value.trim() || ''
    };
    if (!data.name) {
      window.alert('กรุณากรอกชื่อลูกค้า');
      return;
    }

    repo.updateCustomer(customerKey, data).then(function () {
      window.closeModal();
      foamCustomerManagerSearch();
      window.showModal('✅ สำเร็จ', 'บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว', '', '<button class="btn-ok" onclick="closeModal()">ตกลง</button>');
    }).catch(function (err) {
      console.warn('Update foam customer failed:', err);
      window.alert('บันทึกข้อมูลลูกค้าไม่สำเร็จ กรุณาลองใหม่');
    });
  }

  function foamUseCustomerForPrint(customerKey) {
    var repo = getCustomerRepo();
    if (!repo) return;

    repo.getCustomer(customerKey).then(function (customer) {
      if (!customer) {
        window.alert('ไม่พบข้อมูลลูกค้า');
        return;
      }

      var printApi = getPrintApi();
      if (!printApi) {
        window.alert('ระบบพิมพ์ป้ายยังไม่พร้อมใช้งาน');
        return;
      }

      printApi.printMultipleLabels({
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        subdistrict: customer.subdistrict,
        district: customer.district,
        province: customer.province,
        postalCode: customer.postalCode,
        shipping: customer.shipping
      }, 1);
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
          '<button class="btn-blue" onclick="foamAdminSaveSelected(' + escape(JSON.stringify(requestKey)) + ', ' + escape(JSON.stringify(dateStr)) + ')" style="flex:1; min-width:120px;">💾 บันทึกข้อมูล</button>' +
          (canApprove ? '<button class="btn-fuel" onclick="foamAdminApproveSelected(' + escape(JSON.stringify(requestKey)) + ', ' + escape(JSON.stringify(dateStr)) + ')" style="flex:1; min-width:120px;">✅ อนุมัติ</button>' : '') +
          '<button class="btn-danger" onclick="foamAdminRejectSelected(' + escape(JSON.stringify(requestKey)) + ', ' + escape(JSON.stringify(dateStr)) + ')" style="flex:1; min-width:120px;">❌ ยกเลิก</button>' +
          '<button class="btn-purple" onclick="foamAdminPrintSelected(' + escape(JSON.stringify(requestKey)) + ', ' + escape(JSON.stringify(dateStr)) + ')" style="flex:1; min-width:120px;">🖨️ พิมพ์ป้าย</button>' +
          '<button class="btn-danger" onclick="foamAdminDeleteSelected(' + escape(JSON.stringify(requestKey)) + ', ' + escape(JSON.stringify(dateStr)) + ')" style="flex:1; min-width:120px; background:#6c757d;">🗑️ ลบรายการ</button>' +
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

  function foamAdminDeleteSelected(requestKey, dateStr) {
    var repo = getDeliveryRepo();
    if (!repo) return;

    if (!window.confirm('ต้องการลบรายการส่งลังโฟมนี้ใช่หรือไม่?\n\nการลบจะไม่กระทบข้อมูลลูกค้า และไม่สามารถกู้คืนรายการนี้ได้')) return;

    repo.deleteRequest(dateStr, requestKey).then(function () {
      window.__FOAM_SELECTED_KEY__ = null;
      var detail = document.getElementById('foamAdminDetail');
      if (detail) detail.innerHTML = '<div style="color:#198754; text-align:center; padding:18px;">ลบรายการเรียบร้อยแล้ว</div>';
      loadFoamAdminQueue();
    }).catch(function (err) {
      console.warn('Delete foam request failed:', err);
      window.alert('ลบรายการไม่สำเร็จ กรุณาลองใหม่');
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
    showFoamCustomerManager: showFoamCustomerManager,
    foamCustomerManagerSearch: foamCustomerManagerSearch,
    foamHandleImportFile: foamHandleImportFile,
    foamSubmitManualCustomer: foamSubmitManualCustomer,
    foamDeleteCustomerFromManager: foamDeleteCustomerFromManager,
    foamEditCustomerFromManager: foamEditCustomerFromManager,
    foamSaveEditedCustomer: foamSaveEditedCustomer,
    foamUseCustomerForPrint: foamUseCustomerForPrint,
    foamAdminSelectRequest: foamAdminSelectRequest,
    foamAdminSaveSelected: foamAdminSaveSelected,
    foamAdminApproveSelected: foamAdminApproveSelected,
    foamAdminRejectSelected: foamAdminRejectSelected,
    foamAdminDeleteSelected: foamAdminDeleteSelected,
    foamAdminPrintSelected: foamAdminPrintSelected
  };

  window.showFoamAdminView = showFoamAdminView;
  window.loadFoamAdminQueue = loadFoamAdminQueue;
  window.showFoamCustomerManager = showFoamCustomerManager;
  window.foamCustomerManagerSearch = foamCustomerManagerSearch;
  window.foamHandleImportFile = foamHandleImportFile;
  window.foamSubmitManualCustomer = foamSubmitManualCustomer;
  window.foamDeleteCustomerFromManager = foamDeleteCustomerFromManager;
  window.foamEditCustomerFromManager = foamEditCustomerFromManager;
  window.foamSaveEditedCustomer = foamSaveEditedCustomer;
  window.foamUseCustomerForPrint = foamUseCustomerForPrint;
  window.foamAdminSelectRequest = foamAdminSelectRequest;
  window.foamAdminSaveSelected = foamAdminSaveSelected;
  window.foamAdminApproveSelected = foamAdminApproveSelected;
  window.foamAdminRejectSelected = foamAdminRejectSelected;
  window.foamAdminDeleteSelected = foamAdminDeleteSelected;
  window.foamAdminPrintSelected = foamAdminPrintSelected;
})();
