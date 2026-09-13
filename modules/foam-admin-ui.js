/**
 * foam-admin-ui.js — Admin review + print queue for foam label delivery
 * Dependencies: window.PinThipSafe.foamCustomerRepo, window.PinThipSafe.foamDeliveryRepo, window.PinThipSafe.foamPrint
 */
(function () {
  'use strict';

  function escape(value) {
    return window.PinThipSafe && window.PinThipSafe.escapeHtml
      ? window.PinThipSafe.escapeHtml(value)
      : String(value || '').replace(/&/g, '&' + 'amp;').replace(/</g, '&' + 'lt;').replace(/>/g, '&' + 'gt;').replace(/"/g, '&' + 'quot;').replace(/'/g, '&#39;');
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
    if (status === 'pending_review' || status === 'pending_duplicate_approval') return '#f59e0b';
    if (status === 'approved') return '#3b82f6';
    if (status === 'printed') return '#10b981';
    if (status === 'completed') return '#10b981';
    if (status === 'cancelled') return '#ef4444';
    return '#6b7280';
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
      
      // Toolbar
      '<div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap;">' +
        '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; flex:1;">' +
          '<label style="display:flex; align-items:center; gap:6px; font-size:14px; font-weight:600; color:#495057;">📅 <input type="date" id="foamDatePicker" style="padding:8px 10px; border:1px solid #ced4da; border-radius:6px; font-size:14px;"></label>' +
          '<input type="text" id="foamSearchBox" placeholder="🔍 ค้นหาชื่อ/พนักงาน/ขนส่ง..." style="flex:1; min-width:200px; padding:8px 12px; border:1px solid #ced4da; border-radius:6px; font-size:14px;">' +
        '</div>' +
        '<button class="btn-blue" onclick="showFoamCustomerManager()" style="margin:0; padding:8px 14px; font-size:13px; white-space:nowrap;">👥 ลูกค้า</button>' +
      '</div>' +
      
      // Summary Cards
      '<div id="foamSummaryCards" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-bottom:16px;"></div>' +
      
      // Filter Tabs
      '<div id="foamFilterTabs" style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px; padding-bottom:8px;"></div>' +
      
      // Bulk Actions Bar - Sticky Header Style
      '<div id="foamBulkActions" style="display:none; background:#ffffff; border:1px solid #e5e7eb; border-radius:8px; padding:12px 16px; margin-bottom:12px; align-items:center; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">' +
        '<input type="checkbox" id="foamSelectAllCheckbox" style="width:20px; height:20px; cursor:pointer; accent-color:#10b981;">' +
        '<span id="foamBulkCount" style="font-size:14px; font-weight:600; color:#1f2937; flex:1;">เลือก 0 รายการ</span>' +
        '<button id="foamBulkPrintBtn" style="padding:8px 16px; background:#10b981; color:white; border:none; border-radius:6px; font-size:14px; cursor:pointer; font-weight:600; transition:all 0.2s;" onmouseover="this.style.background=\'#059669\'" onmouseout="this.style.background=\'#10b981\'">🖨️ พิมพ์</button>' +
        '<button id="foamBulkClearBtn" style="padding:8px 16px; background:#6b7280; color:white; border:none; border-radius:6px; font-size:14px; cursor:pointer; font-weight:600; transition:all 0.2s;" onmouseover="this.style.background=\'#4b5563\'" onmouseout="this.style.background=\'#6b7280\'">✖️ ยกเลิก</button>' +
      '</div>' +
      
      // Main Layout
      '<div id="foamAdminLayout" style="display:grid; grid-template-columns: 1.1fr 1fr; gap:16px; align-items:start;">' +
        '<div style="min-width:0;">' +
          '<div id="foamAdminQueue" style="min-width:0;">' +
            '<div style="color:#666; text-align:center; padding:18px;">กำลังโหลดรายการแจ้งเตือน...</div>' +
          '</div>' +
        '</div>' +
        '<div id="foamAdminDetail" style="min-width:0; position:sticky; top:20px; max-height:calc(100vh - 40px); overflow-y:auto;">' +
          '<div style="color:#666; text-align:center; padding:18px;">เลือกรายการจากซ้ายเพื่อดูรายละเอียด</div>' +
        '</div>' +
      '</div>' +
      '<button class="btn-back" onclick="showAdminDashboard()" style="margin-top:16px;">⬅️ กลับหน้าแอดมิน</button>';

    var mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;

    // Initialize state
    window.__FOAM_FILTER_STATUS__ = 'all';
    window.__FOAM_SEARCH_TERM__ = '';
    window.__FOAM_SELECTED_DATE__ = getTodayStr();
    window.__FOAM_BULK_SELECTED__ = [];

    // Set up event listeners
    var datePicker = document.getElementById('foamDatePicker');
    if (datePicker) {
      datePicker.value = getTodayStr();
      datePicker.addEventListener('change', function() {
        window.__FOAM_SELECTED_DATE__ = this.value || getTodayStr();
        loadFoamAdminQueue();
      });
    }

    var searchBox = document.getElementById('foamSearchBox');
    if (searchBox) {
      searchBox.addEventListener('input', function() {
        clearTimeout(window.__FOAM_SEARCH_TIMER__);
        window.__FOAM_SEARCH_TIMER__ = setTimeout(function() {
          window.__FOAM_SEARCH_TERM__ = searchBox.value.toLowerCase().trim();
          renderFoamFilteredQueue();
        }, 300);
      });
    }

    // Bind bulk action buttons
    var selectAllCheckbox = document.getElementById('foamSelectAllCheckbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('click', foamBulkSelectAll);
    }
    
    var printBtn = document.getElementById('foamBulkPrintBtn');
    if (printBtn) {
      printBtn.addEventListener('click', foamBulkPrint);
    }
    
    var clearBtn = document.getElementById('foamBulkClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', foamBulkClearSelection);
    }

    loadFoamAdminQueue();
  }

  function loadFoamAdminQueue() {
    var repo = getDeliveryRepo();
    if (!repo) {
      var queue = document.getElementById('foamAdminQueue');
      if (queue) queue.innerHTML = '<div style="color:#d9534f; padding:18px;">โหลดระบบส่งลังโฟมไม่สำเร็จ</div>';
      return;
    }

    var selectedDate = window.__FOAM_SELECTED_DATE__ || getTodayStr();

    repo.fetchRequestsByDate(selectedDate).then(function (requests) {
      window.__FOAM_ALL_REQUESTS__ = requests || [];
      renderFoamSummaryCards();
      renderFoamFilterTabs();
      renderFoamFilteredQueue();
    }).catch(function (err) {
      console.warn('loadFoamAdminQueue failed:', err);
      var queue = document.getElementById('foamAdminQueue');
      if (queue) queue.innerHTML = '<div style="color:#d9534f; padding:18px;">โหลดรายการไม่สำเร็จ กรุณารีเฟรช</div>';
    });
  }

  function renderFoamSummaryCards() {
    var container = document.getElementById('foamSummaryCards');
    if (!container) return;

    var requests = window.__FOAM_ALL_REQUESTS__ || [];
    
    var totalCount = requests.length;
    var totalBoxes = requests.reduce(function(sum, r) { return sum + (Number(r.boxCount) || 1); }, 0);
    var pendingCount = requests.filter(function(r) { 
      return r.status === 'pending_review' || r.status === 'pending_duplicate_approval'; 
    }).length;
    var printedCount = requests.filter(function(r) { return r.status === 'printed'; }).length;
    var duplicateCount = requests.filter(function(r) { return r.isDuplicate; }).length;

    var cards = [
      { icon: '📋', label: 'ทั้งหมด', value: totalCount + ' รายการ', color: '#6c757d' },
      { icon: '📦', label: 'ลังทั้งหมด', value: totalBoxes + ' ลัง', color: '#0d6efd' },
      { icon: '⏳', label: 'รอตรวจสอบ', value: pendingCount, color: '#e67e22' },
      { icon: '✅', label: 'พิมพ์แล้ว', value: printedCount, color: '#28a745' },
      { icon: '⚠️', label: 'ซ้ำ', value: duplicateCount, color: '#dc3545' }
    ];

    var html = '';
    cards.forEach(function(card) {
      html += '<div style="background:linear-gradient(135deg, ' + card.color + '15, #ffffff); border:1px solid ' + card.color + '40; border-left:4px solid ' + card.color + '; border-radius:8px; padding:10px 12px; text-align:center;">';
      html += '<div style="font-size:20px; margin-bottom:2px;">' + card.icon + '</div>';
      html += '<div style="font-size:11px; color:#6c757d; margin-bottom:4px;">' + card.label + '</div>';
      html += '<div style="font-size:18px; font-weight:700; color:' + card.color + ';">' + card.value + '</div>';
      html += '</div>';
    });

    container.innerHTML = html;
  }

  function renderFoamFilterTabs() {
    var container = document.getElementById('foamFilterTabs');
    if (!container) return;

    var requests = window.__FOAM_ALL_REQUESTS__ || [];
    
    var counts = {
      all: requests.length,
      pending_review: requests.filter(function(r) { return r.status === 'pending_review' || r.status === 'pending_duplicate_approval'; }).length,
      approved: requests.filter(function(r) { return r.status === 'approved'; }).length,
      printed: requests.filter(function(r) { return r.status === 'printed'; }).length,
      completed: requests.filter(function(r) { return r.status === 'completed'; }).length,
      cancelled: requests.filter(function(r) { return r.status === 'cancelled'; }).length
    };

    var tabs = [
      { key: 'all', label: 'ทั้งหมด', icon: '📋', color: '#6b7280' },
      { key: 'pending_review', label: 'รอพิมพ์', icon: '⏳', color: '#f59e0b' },
      { key: 'printed', label: 'พิมพ์แล้ว', icon: '🖨️', color: '#10b981' },
      { key: 'cancelled', label: 'ยกเลิก', icon: '❌', color: '#ef4444' }
    ];

    var currentFilter = window.__FOAM_FILTER_STATUS__ || 'all';
    var html = '';
    
    tabs.forEach(function(tab) {
      var isActive = currentFilter === tab.key;
      var count = counts[tab.key] || 0;
      
      html += '<button onclick="foamSetFilterStatus(\'' + tab.key + '\')" style="';
      html += 'padding:10px 16px; border:none; border-radius:8px; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.2s; ';
      html += 'width:auto; ';
      html += 'background:' + (isActive ? tab.color : '#f9fafb') + '; ';
      html += 'color:' + (isActive ? 'white' : '#6b7280') + '; ';
      html += 'box-shadow:' + (isActive ? '0 2px 6px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.05)') + '; ';
      html += 'white-space:nowrap;';
      html += '"';
      if (!isActive) {
        html += ' onmouseover="this.style.background=\'#f3f4f6\'" onmouseout="this.style.background=\'#f9fafb\'"';
      }
      html += '>' + tab.icon + ' ' + tab.label;
      if (count > 0) html += ' <span style="background:' + (isActive ? 'rgba(255,255,255,0.25)' : '#e5e7eb') + '; padding:2px 8px; border-radius:999px; font-size:12px; margin-left:6px;">' + count + '</span>';
      html += '</button>';
    });

    container.innerHTML = html;
  }

  function foamSetFilterStatus(status) {
    window.__FOAM_FILTER_STATUS__ = status;
    renderFoamFilterTabs();
    renderFoamFilteredQueue();
  }

  function renderFoamFilteredQueue() {
    var queue = document.getElementById('foamAdminQueue');
    if (!queue) return;

    var requests = window.__FOAM_ALL_REQUESTS__ || [];
    var filterStatus = window.__FOAM_FILTER_STATUS__ || 'all';
    var searchTerm = window.__FOAM_SEARCH_TERM__ || '';

    // Filter by status
    var filtered = requests;
    if (filterStatus !== 'all') {
      filtered = filtered.filter(function(r) {
        if (filterStatus === 'pending_review') {
          return r.status === 'pending_review' || r.status === 'pending_duplicate_approval';
        }
        return r.status === filterStatus;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(function(r) {
        var snapshot = r.customerSnapshot || {};
        var name = (snapshot.name || '').toLowerCase();
        var shipping = (snapshot.shipping || '').toLowerCase();
        var empName = (r.employeeName || '').toLowerCase();
        return name.indexOf(searchTerm) >= 0 || shipping.indexOf(searchTerm) >= 0 || empName.indexOf(searchTerm) >= 0;
      });
    }

    // Sort by createdAt desc
    filtered.sort(function (a, b) {
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });

    if (!filtered.length) {
      queue.innerHTML = '<div style="color:#888; text-align:center; padding:18px;">ไม่พบรายการที่ตรงกับเงื่อนไข</div>';
      return;
    }

    var html = '';
    filtered.forEach(function (request) {
      var snapshot = request.customerSnapshot || {};
      var name = snapshot.name || 'ลูกค้าใหม่';
      var status = statusLabel(request.status);
      var badgeColor = statusBadgeClass(request.status);
      var isSelected = request.key === (window.__FOAM_SELECTED_KEY__ || '');
      var isBulkSelected = (window.__FOAM_BULK_SELECTED__ || []).indexOf(request.key) >= 0;

      // Calculate time
      var timeStr = '';
      if (request.createdAt) {
        var date = new Date(request.createdAt);
        timeStr = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
      }

      // Check duplicate frequency
      var duplicateNote = '';
      if (request.isDuplicate && request.duplicateCount > 1) {
        duplicateNote = ' (ส่งครั้งที่ ' + request.duplicateCount + ' ในสัปดาห์นี้)';
      }

      html += '<div class="foam-card" style="position:relative; cursor:pointer; border:2px solid ' + (isSelected ? '#10b981' : '#e5e7eb') + '; padding:20px; background:' + (isSelected ? '#f0fdf4' : 'white') + '; border-radius:12px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,0.06); transition:all 0.2s;" data-request-key="' + escape(request.key || '') + '" data-date="' + escape(window.__FOAM_SELECTED_DATE__ || getTodayStr()) + '" onclick="foamAdminSelectRequest(this.dataset.requestKey, this.dataset.date)" onmouseover="if(!' + isSelected + ') this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.1)\'" onmouseout="if(!' + isSelected + ') this.style.boxShadow=\'0 1px 3px rgba(0,0,0,0.06)\'">';
      
      // Checkbox (top-left absolute)
      html += '<input type="checkbox" ' + (isBulkSelected ? 'checked' : '') + ' onclick="event.stopPropagation(); foamToggleBulkSelect(\'' + escape(request.key || '') + '\')" style="position:absolute; top:20px; left:20px; width:22px; height:22px; cursor:pointer; accent-color:#10b981;">';
      
      // Main content with left padding for checkbox
      html += '<div style="padding-left:36px;">';
      
      // Top row: name, time, status badge
      html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">';
      html += '<h3 style="font-size:18px; font-weight:700; color:#111827; margin:0;">' + escape(name) + '</h3>';
      html += '<div style="display:flex; align-items:center; gap:10px;">';
      html += '<span style="font-size:13px; color:#6b7280; font-weight:500;">' + timeStr + '</span>';
      html += '<span style="font-size:13px; color:white; font-weight:600; background:' + badgeColor + '; padding:6px 12px; border-radius:999px; white-space:nowrap;">' + escape(status) + '</span>';
      html += '</div>';
      html += '</div>';
      
      // Middle row: box count, shipping, duplicate warning
      html += '<div style="display:flex; align-items:center; gap:18px; font-size:14px; color:#4b5563; margin-bottom:10px; flex-wrap:wrap;">';
      html += '<div style="display:flex; align-items:center; gap:8px;"><span style="font-size:18px;">📦</span><span style="font-weight:600; color:#1f2937;">' + (request.boxCount || 1) + ' ลัง</span></div>';
      if (snapshot.shipping) {
        html += '<div style="display:flex; align-items:center; gap:8px;"><span style="font-size:18px;">🚚</span><span style="color:#6b7280;">' + escape(snapshot.shipping) + '</span></div>';
      }
      if (request.isDuplicate) {
        html += '<div style="display:flex; align-items:center; gap:8px; color:#dc2626; font-weight:600; background:#fef2f2; padding:4px 10px; border-radius:6px;"><span style="font-size:16px;">⚠️</span><span>ซ้ำ' + duplicateNote + '</span></div>';
      }
      html += '</div>';
      
      // Bottom row: employee name
      html += '<div style="display:flex; align-items:center; gap:8px; font-size:13px; color:#9ca3af;">';
      html += '<span style="font-size:16px;">👤</span><span>' + escape(request.employeeName || '-') + '</span>';
      html += '</div>';
      
      html += '</div>'; // end padding-left wrapper
      html += '</div>'; // end foam-card
    });

    queue.innerHTML = html;

    // Auto-select first if none selected
    if (!window.__FOAM_SELECTED_KEY__ && filtered.length > 0) {
      window.__FOAM_SELECTED_KEY__ = filtered[0].key;
      foamAdminSelectRequest(filtered[0].key, window.__FOAM_SELECTED_DATE__ || getTodayStr());
    }
  }

  function foamToggleBulkSelect(requestKey) {
    window.__FOAM_BULK_SELECTED__ = window.__FOAM_BULK_SELECTED__ || [];
    var idx = window.__FOAM_BULK_SELECTED__.indexOf(requestKey);
    
    if (idx >= 0) {
      window.__FOAM_BULK_SELECTED__.splice(idx, 1);
    } else {
      window.__FOAM_BULK_SELECTED__.push(requestKey);
    }

    // Update bulk action bar
    var bulkBar = document.getElementById('foamBulkActions');
    var bulkCount = document.getElementById('foamBulkCount');
    
    if (window.__FOAM_BULK_SELECTED__.length > 0) {
      if (bulkBar) bulkBar.style.display = 'flex';
      if (bulkCount) bulkCount.innerText = 'เลือก ' + window.__FOAM_BULK_SELECTED__.length + ' รายการ';
    } else {
      if (bulkBar) bulkBar.style.display = 'none';
    }
  }

  function foamBulkClearSelection() {
    window.__FOAM_BULK_SELECTED__ = [];
    var bulkBar = document.getElementById('foamBulkActions');
    if (bulkBar) bulkBar.style.display = 'none';
    renderFoamFilteredQueue();
  }

  function foamBulkSelectAll() {
    var currentFilter = window.__FOAM_FILTER_STATUS__ || 'all';
    var allRequests = window.__FOAM_ALL_REQUESTS__ || [];
    
    // Check if all are currently selected
    var filteredRequests = allRequests.filter(function(req) {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'pending_review') {
        return req.status === 'pending_review' || req.status === 'pending_duplicate_approval';
      }
      return req.status === currentFilter;
    });
    
    var allSelected = filteredRequests.length > 0 && filteredRequests.every(function(req) {
      return (window.__FOAM_BULK_SELECTED__ || []).indexOf(req.key) >= 0;
    });
    
    if (allSelected) {
      // Deselect all
      window.__FOAM_BULK_SELECTED__ = [];
    } else {
      // Select all filtered requests
      window.__FOAM_BULK_SELECTED__ = filteredRequests.map(function(req) { return req.key; });
    }
    
    // Update checkbox state
    var selectAllCheckbox = document.getElementById('foamSelectAllCheckbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = !allSelected;
    }
    
    // Update bulk action bar
    var bulkBar = document.getElementById('foamBulkActions');
    var bulkCount = document.getElementById('foamBulkCount');
    
    if (window.__FOAM_BULK_SELECTED__.length > 0) {
      if (bulkBar) bulkBar.style.display = 'flex';
      if (bulkCount) bulkCount.innerText = 'เลือก ' + window.__FOAM_BULK_SELECTED__.length + ' รายการ';
    } else {
      if (bulkBar) bulkBar.style.display = 'none';
    }
    
    // Re-render to update checkboxes
    renderFoamFilteredQueue();
  }

  function foamBulkPrint() {
    var selected = window.__FOAM_BULK_SELECTED__ || [];
    if (selected.length === 0) return;

    if (!confirm('ต้องการพิมพ์ ' + selected.length + ' รายการใช่หรือไม่?')) return;

    var db = window.db;
    if (!db) return;

    var selectedDate = window.__FOAM_SELECTED_DATE__ || getTodayStr();
    var printApi = getPrintApi();
    if (!printApi) {
      PinThipSafe.modal.warning('ระบบพิมพ์ป้ายยังไม่พร้อมใช้งาน');
      return;
    }

    var promises = selected.map(function(key) {
      return db.ref('foam_delivery_requests/' + selectedDate + '/' + key).once('value');
    });

    Promise.all(promises).then(function(snapshots) {
      snapshots.forEach(function(snapshot) {
        var request = snapshot.val();
        if (!request) return;

        var data = request.customerSnapshot || {};
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
      });

      var repo = getDeliveryRepo();
      if (repo) {
        var updatePromises = selected.map(function(key) {
          return repo.updateStatus(selectedDate, key, 'printed', 'admin');
        });

        Promise.all(updatePromises).then(function() {
          PinThipSafe.modal.success('พิมพ์ ' + selected.length + ' รายการเรียบร้อย');
          foamBulkClearSelection();
          loadFoamAdminQueue();
        }).catch(function() {
          loadFoamAdminQueue();
        });
      }
    }).catch(function(err) {
      console.warn('Bulk print failed:', err);
      PinThipSafe.modal.error('พิมพ์ไม่สำเร็จ');
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
      PinThipSafe.modal.error('ระบบฐานข้อมูลลูกค้าไม่พร้อมใช้งาน');
      return;
    }

    var isExcel = /\.(xlsx|xls)$/i.test(file.name || '');
    var isCsv = /\.csv$/i.test(file.name || '');

    function finishRows(rows) {
      var records = Array.isArray(rows) ? rows : [];
      if (!records.length) {
        PinThipSafe.modal.warning('ไม่พบข้อมูลลูกค้าในไฟล์ที่เลือก');
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
        bustFoamCustomerCache();
        window.showModal('📥 สำเร็จ', 'นำเข้าสู่ฐานข้อมูลลูกค้าแล้ว ' + created + ' รายการ', '<button class="btn-ok" onclick="closeModal(); showFoamCustomerManager();">ตกลง</button>');
      }).catch(function (err) {
        console.warn('Import foam customers failed:', err);
        PinThipSafe.modal.error('นำเข้าข้อมูลไม่สำเร็จ กรุณาตรวจสอบรูปแบบไฟล์');
      });
    }

    if (isCsv || !isExcel) {
      file.text().then(function (text) {
        finishRows(parseFoamCsvText(text));
      }).catch(function (err) {
        console.warn('Read CSV failed:', err);
        PinThipSafe.modal.error('อ่านไฟล์ไม่สำเร็จ');
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
          PinThipSafe.modal.error('ไม่สามารถอ่านไฟล์ Excel ได้ กรุณาใช้ไฟล์ CSV หรือไฟล์ Excel ที่มีข้อมูลแบบตาราง');
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    PinThipSafe.modal.warning('โปรดอัปโหลดไฟล์ CSV หรือใช้ Excel ที่เปิดโดยมี XLSX.js ในหน้าเว็บ');
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
        ((typeof createLoadingHTML === 'function') ? createLoadingHTML('กำลังโหลดรายชื่อลูกค้า...') : '<div style="color:#888; text-align:center; padding:20px;">กำลังโหลดรายชื่อลูกค้า...</div>') +
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

    // OPTIMIZATION: debounce the Firebase fetch + reuse a cached customer list so
    // each keystroke doesn't re-download the entire customer tree. The cache is
    // invalidated whenever a customer is added/edited/deleted (see bustFoamCustomerCache).
    if (foamCustomerSearchTimer) {
      clearTimeout(foamCustomerSearchTimer);
      foamCustomerSearchTimer = null;
    }
    foamCustomerSearchTimer = setTimeout(function () {
      foamCustomerSearchTimer = null;
      var q = String(query || '').trim().toLowerCase();

      function renderFrom(customers) {
        customers.sort(function (a, b) {
          return String(a.name || '').localeCompare(String(b.name || ''), 'th');
        });
        var html = '';
        customers.forEach(function (customer) {
          // (existing per-row markup kept unchanged below)
          html += '' +
            '<div class="history-item" style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap;">' +
              '<div style="flex:1; min-width:200px;">' +
                '<b style="font-size:15px;">👤 ' + escape(customer.name || '') + '</b>' +
                (customer.phone ? '<br><span style="font-size:13px; color:#555;">📞 ' + escape(customer.phone) + '</span>' : '') +
                (customer.lineName ? '<br><span style="font-size:12px; color:#6f42c1;">💬 LINE: ' + escape(customer.lineName) + '</span>' : '') +
                (customer.address ? '<br><span style="font-size:12px; color:#666;">📍 ' + escape(customer.address) + '</span>' : '') +
                ((customer.district || customer.province) ? '<br><span style="font-size:12px; color:#666;">' + escape([customer.subdistrict, customer.district, customer.province, customer.postalCode].filter(Boolean).join(' ')) + '</span>' : '') +
                (customer.shipping ? '<br><span style="font-size:12px; color:#0d6efd;">🚚 ' + escape(customer.shipping) + '</span>' : '') +
              '</div>' +
              '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
                '<button class="btn-fuel" onclick="foamEditCustomerFromManager(\'' + escape(customer.key || '') + '\')" style="flex:1; min-width:120px;">✏️ แก้ไขข้อมูล</button>' +
                '<button class="btn-blue" onclick="foamUseCustomerForPrint(\'' + escape(customer.key || '') + '\')" style="flex:1; min-width:120px;">🖨️ พิมพ์ป้าย</button>' +
              '</div>' +
            '</div>';
        });
        list.innerHTML = html;
      }

      var cached = window.PinThipSafe.foamCustomerRepo.__cachedList;
      if (cached) {
        var filtered = q
          ? cached.filter(function (c) {
              return (String(c.name || '').toLowerCase().indexOf(q) !== -1) ||
                     (String(c.phone || '').toLowerCase().indexOf(q) !== -1);
            })
          : cached.slice();
        renderFrom(filtered);
        return;
      }

      list.innerHTML = (typeof createLoadingHTML === 'function') ? createLoadingHTML('กำลังโหลดรายชื่อลูกค้า...') : '<div style="color:#888; text-align:center; padding:20px;">กำลังโหลดรายชื่อลูกค้า...</div>';
      repo.fetchAllCustomers().then(function (customers) {
        window.PinThipSafe.foamCustomerRepo.__cachedList = customers;
        var filtered = q
          ? customers.filter(function (c) {
              return (String(c.name || '').toLowerCase().indexOf(q) !== -1) ||
                     (String(c.phone || '').toLowerCase().indexOf(q) !== -1);
            })
          : customers.slice();
        renderFrom(filtered);
      }).catch(function (err) {
        console.warn('foamCustomerManagerSearch failed:', err);
        list.innerHTML = '<div style="color:#d9534f; text-align:center; padding:25px;">โหลดข้อมูลลูกค้าไม่สำเร็จ</div>';
      });
    }, 250);
  }

  // Bump the customer cache version so the next search refetches from Firebase.
  function bustFoamCustomerCache() {
    if (window.PinThipSafe && window.PinThipSafe.foamCustomerRepo) {
      window.PinThipSafe.foamCustomerRepo.__cachedList = null;
    }
  }

  var foamCustomerSearchTimer = null;

  function foamSubmitManualCustomer() {
    var repo = getCustomerRepo();
    if (!repo) {
      PinThipSafe.modal.error('ระบบฐานข้อมูลลูกค้าไม่พร้อมใช้งาน');
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

    if (!payload.name) {
      PinThipSafe.modal.warning('กรุณากรอกชื่อลูกค้า');
      return;
    }

    repo.addCustomer(payload, 'admin').then(function () {
      bustFoamCustomerCache();
      window.showModal('✅ สำเร็จ', 'เพิ่มลูกค้าลังโฟมเรียบร้อยแล้ว', '<button class="btn-ok" onclick="closeModal(); showFoamCustomerManager();">ตกลง</button>');
    }).catch(function (err) {
      console.error('[foam-admin] Add foam customer failed:', err);
      var errMsg = (err && err.message) ? err.message : 'เพิ่มลูกค้าไม่สำเร็จ';
      PinThipSafe.modal.error(errMsg + '\n\nตรวจสอบคอนโซล (F12) สำหรับรายละเอียด');
    });
  }

  function foamDeleteCustomerFromManager(customerKey) {
    if (!customerKey || !window.confirm('ต้องการลบลูกค้ารายนี้ใช่หรือไม่?')) return;
    var repo = getCustomerRepo();
    if (!repo) return;

    repo.deleteCustomer(customerKey).then(function () {
      bustFoamCustomerCache();
      foamCustomerManagerSearch();
    }).catch(function (err) {
      console.warn('Delete foam customer failed:', err);
      PinThipSafe.modal.error('ลบลูกค้าไม่สำเร็จ');
    });
  }

  function foamEditCustomerFromManager(customerKey) {
    var repo = getCustomerRepo();
    if (!repo || !customerKey) return;

    repo.getCustomer(customerKey).then(function (customer) {
      if (!customer) {
        PinThipSafe.modal.warning('ไม่พบข้อมูลลูกค้า');
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
      PinThipSafe.modal.error('โหลดข้อมูลลูกค้าไม่สำเร็จ');
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
      PinThipSafe.modal.warning('กรุณากรอกชื่อลูกค้า');
      return;
    }

    repo.updateCustomer(customerKey, data).then(function () {
      bustFoamCustomerCache();
      window.closeModal();
      foamCustomerManagerSearch();
      window.showModal('✅ สำเร็จ', 'บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว', '', '<button class="btn-ok" onclick="closeModal()">ตกลง</button>');
    }).catch(function (err) {
      console.warn('Update foam customer failed:', err);
      PinThipSafe.modal.error('บันทึกข้อมูลลูกค้าไม่สำเร็จ กรุณาลองใหม่');
    });
  }

  function foamUseCustomerForPrint(customerKey) {
    var repo = getCustomerRepo();
    if (!repo) return;

    repo.getCustomer(customerKey).then(function (customer) {
      if (!customer) {
        PinThipSafe.modal.warning('ไม่พบข้อมูลลูกค้า');
        return;
      }

      var printApi = getPrintApi();
      if (!printApi) {
        PinThipSafe.modal.warning('ระบบพิมพ์ป้ายยังไม่พร้อมใช้งาน');
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
            '<span id="foamAdminSelectedLineName" style="display:' + (snapshotData.lineName ? 'inline' : 'none') + '; color:#16803c;">💬 LINE: ' + escape(snapshotData.lineName || '') + '<br></span>' +
            (snapshotData.shipping ? '🚚 ' + escape(snapshotData.shipping) + '<br>' : '') +
            '📦 จำนวนลัง: <b>' + (request.boxCount || 1) + '</b><br>' +
            '👤 ผู้ส่ง: ' + escape(request.employeeName || '-') + '<br>' +
            '🕒 วันที่: ' + escape(dateStr) + '<br>' +
            (request.note ? '📝 หมายเหตุ: ' + escape(request.note) : '') +
          '</div>' +
        '</div>' +
        '<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:14px;">' +
          '<button class="btn-fuel" onclick="foamAdminEditSelected(' + escape(JSON.stringify(requestKey)) + ', ' + escape(JSON.stringify(dateStr)) + ')" style="flex:1; min-width:120px;">✏️ แก้ไขข้อมูล</button>' +
          '<button class="btn-danger" onclick="foamAdminRejectSelected(' + escape(JSON.stringify(requestKey)) + ', ' + escape(JSON.stringify(dateStr)) + ')" style="flex:1; min-width:120px;">❌ ยกเลิก</button>' +
          '<button class="btn-purple" onclick="foamAdminPrintSelected(' + escape(JSON.stringify(requestKey)) + ', ' + escape(JSON.stringify(dateStr)) + ')" style="flex:1; min-width:120px;">🖨️ พิมพ์ป้าย</button>' +
          '<button class="btn-danger" onclick="foamAdminDeleteSelected(' + escape(JSON.stringify(requestKey)) + ', ' + escape(JSON.stringify(dateStr)) + ')" style="flex:1; min-width:120px; background:#6c757d;">🗑️ ลบรายการ</button>' +
        '</div>';

      detail.innerHTML = html;

      if (request.customerId && getCustomerRepo()) {
        getCustomerRepo().getCustomer(request.customerId).then(function (customer) {
          if (window.__FOAM_SELECTED_KEY__ !== requestKey) return;
          var lineEl = document.getElementById('foamAdminSelectedLineName');
          if (!lineEl || !customer || !customer.lineName) return;
          lineEl.textContent = '💬 LINE: ' + customer.lineName;
          lineEl.style.display = 'inline';
        }).catch(function (err) {
          console.warn('Load customer LINE name failed:', err);
        });
      }
    }).catch(function (err) {
      console.warn('foamAdminSelectRequest failed:', err);
    });
  }

  function foamAdminEditSelected(requestKey, dateStr) {
    var db = window.db;
    if (!db) return;

    db.ref('foam_delivery_requests/' + dateStr + '/' + requestKey).once('value').then(function (snapshot) {
      var request = snapshot.val();
      if (!request) {
        PinThipSafe.modal.warning('ไม่พบรายการที่ต้องการแก้ไข');
        return;
      }

      var data = request.customerSnapshot || {};
      var fields = [
        ['foamEditCustName', 'ชื่อลูกค้า *', data.name],
        ['foamEditCustPhone', 'เบอร์โทรศัพท์', data.phone],
        ['foamEditCustAddress', 'ที่อยู่', data.address],
        ['foamEditCustSubdistrict', 'แขวง/ตำบล', data.subdistrict],
        ['foamEditCustDistrict', 'เขต/อำเภอ', data.district],
        ['foamEditCustProvince', 'จังหวัด', data.province],
        ['foamEditCustPostal', 'รหัสไปรษณีย์', data.postalCode],
        ['foamEditCustShipping', 'ขนส่ง', data.shipping]
      ];
      var formHtml = '<div style="display:grid; gap:10px; text-align:left;">';
      fields.forEach(function (f) {
        formHtml += '<label style="font-weight:bold; font-size:14px;">' + f[1] + '<input id="' + f[0] + '" type="text" value="' + escape(f[2] || '') + '" style="width:100%; margin-top:4px; padding:8px 10px; border:1px solid #d0d5dd; border-radius:6px; font-size:14px; box-sizing:border-box;"></label>';
      });
      formHtml += '<label style="font-weight:bold; font-size:14px;">หมายเหตุ<textarea id="foamEditCustNote" rows="2" style="width:100%; margin-top:4px; padding:8px 10px; border:1px solid #d0d5dd; border-radius:6px; font-size:14px; box-sizing:border-box; resize:vertical;">' + escape(data.note || request.note || '') + '</textarea></label>';
      formHtml += '<label style="font-weight:bold; font-size:14px;">จำนวนลัง<select id="foamEditCustBoxCount" style="width:100%; margin-top:4px; padding:8px 10px; border:1px solid #d0d5dd; border-radius:6px; font-size:14px; box-sizing:border-box; font-weight:bold;">' +
        '<option value="1"' + ((request.boxCount || 1) === 1 ? ' selected' : '') + '>1 ลัง</option>' +
        '<option value="2"' + ((request.boxCount || 1) === 2 ? ' selected' : '') + '>2 ลัง</option>' +
        '<option value="3"' + ((request.boxCount || 1) === 3 ? ' selected' : '') + '>3 ลัง</option>' +
      '</select></label>';
      formHtml += '</div>';

      window.openWideModal('✏️ แก้ไขข้อมูลรายการส่งลังโฟม', formHtml,
        '<button class="btn-back" onclick="closeModal()">ยกเลิก</button>' +
        '<button class="btn-ok" onclick="foamAdminSaveEdited(' + escape(JSON.stringify(requestKey)) + ', ' + escape(JSON.stringify(dateStr)) + ')">💾 บันทึก</button>');
    }).catch(function (err) {
      console.warn('foamAdminEditSelected failed:', err);
      PinThipSafe.modal.error('โหลดข้อมูลไม่สำเร็จ');
    });
  }

  function foamAdminSaveEdited(requestKey, dateStr) {
    var repository = getDeliveryRepo();
    var customerRepo = getCustomerRepo();
    if (!repository || !customerRepo) return;

    var db = window.db;
    if (!db) return;

    db.ref('foam_delivery_requests/' + dateStr + '/' + requestKey).once('value').then(function (snapshot) {
      var selected = snapshot.val() || {};
      var data = {
        name: document.getElementById('foamEditCustName')?.value.trim() || '',
        phone: document.getElementById('foamEditCustPhone')?.value.trim() || '',
        address: document.getElementById('foamEditCustAddress')?.value.trim() || '',
        subdistrict: document.getElementById('foamEditCustSubdistrict')?.value.trim() || '',
        district: document.getElementById('foamEditCustDistrict')?.value.trim() || '',
        province: document.getElementById('foamEditCustProvince')?.value.trim() || '',
        postalCode: document.getElementById('foamEditCustPostal')?.value.trim() || '',
        shipping: document.getElementById('foamEditCustShipping')?.value.trim() || '',
        note: document.getElementById('foamEditCustNote')?.value.trim() || '',
        boxCount: Number(document.getElementById('foamEditCustBoxCount')?.value || 1)
      };

      if (!data.name) {
        PinThipSafe.modal.warning('กรุณากรอกชื่อลูกค้า');
        return;
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
          if (selected.status !== 'cancelled' && selected.status !== 'completed') {
            return repository.updateStatus(dateStr, requestKey, targetStatus, 'admin');
          }
        });
      });
    }).then(function () {
      window.closeModal();
      window.showModal('✅ สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว', '<button class="btn-ok" onclick="closeModal(); foamAdminSelectRequest(\'' + requestKey + '\', \'' + dateStr + '\');">ตกลง</button>');
      loadFoamAdminQueue();
    }).catch(function (err) {
      console.warn('Save edited foam request failed:', err);
      PinThipSafe.modal.error('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่');
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
      PinThipSafe.modal.error('ยกเลิกรายการไม่สำเร็จ');
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
      PinThipSafe.modal.error('ลบรายการไม่สำเร็จ กรุณาลองใหม่');
    });
  }

  function foamAdminPrintSelected(requestKey, dateStr) {
    var db = window.db;
    if (!db) return;

    db.ref('foam_delivery_requests/' + dateStr + '/' + requestKey).once('value').then(function (snapshot) {
      var request = snapshot.val();
      if (!request) {
        PinThipSafe.modal.warning('ไม่พบรายการที่ต้องการพิมพ์');
        return;
      }

      var data = request.customerSnapshot || {};
      var printApi = getPrintApi();
      if (!printApi) {
        PinThipSafe.modal.warning('ระบบพิมพ์ป้ายยังไม่พร้อมใช้งาน');
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
    foamAdminEditSelected: foamAdminEditSelected,
    foamAdminSaveEdited: foamAdminSaveEdited,
    foamAdminRejectSelected: foamAdminRejectSelected,
    foamAdminDeleteSelected: foamAdminDeleteSelected,
    foamAdminPrintSelected: foamAdminPrintSelected
  };

  window.showFoamAdminView = showFoamAdminView;
  window.loadFoamAdminQueue = loadFoamAdminQueue;
  window.showFoamCustomerManager = showFoamCustomerManager;
  window.foamCustomerManagerSearch = foamCustomerManagerSearch;
  window.bustFoamCustomerCache = bustFoamCustomerCache;
  window.foamHandleImportFile = foamHandleImportFile;
  window.foamSubmitManualCustomer = foamSubmitManualCustomer;
  window.foamDeleteCustomerFromManager = foamDeleteCustomerFromManager;
  window.foamEditCustomerFromManager = foamEditCustomerFromManager;
  window.foamSaveEditedCustomer = foamSaveEditedCustomer;
  window.foamUseCustomerForPrint = foamUseCustomerForPrint;
  window.foamAdminSelectRequest = foamAdminSelectRequest;
  window.foamAdminEditSelected = foamAdminEditSelected;
  window.foamAdminSaveEdited = foamAdminSaveEdited;
  window.foamAdminRejectSelected = foamAdminRejectSelected;
  window.foamAdminDeleteSelected = foamAdminDeleteSelected;
  window.foamAdminPrintSelected = foamAdminPrintSelected;
  window.foamSetFilterStatus = foamSetFilterStatus;
  window.foamToggleBulkSelect = foamToggleBulkSelect;
  window.foamBulkClearSelection = foamBulkClearSelection;
  window.foamBulkSelectAll = foamBulkSelectAll;
  window.foamBulkPrint = foamBulkPrint;
})();
