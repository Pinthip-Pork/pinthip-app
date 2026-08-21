(function () {
  function setTextById(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = String(value ?? '');
  }

  function setHtmlById(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = String(value ?? '');
  }

  // ================= Async UI helpers (loading / error / retry) =================
  // Shared by both admin views (modules/admin-dashboard.js, modules/admin-operations.js)
  // and employee views (scripts/employee-ui.js), so every async screen gets a
  // consistent "loading..." state and a friendly error + retry UI on failure.

  const retryRegistry = {};
  let retrySeq = 0;

  // Shows a simple loading placeholder inside a container.
  function showLoading(containerId, loadingText) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = String(loadingText || '⏳ กำลังโหลด...');
  }

  // Renders an error box with an optional "🔄 ลองใหม่" retry button.
  // options: { message, detail, retryFn, showDetail, onError }
  function showAsyncError(containerId, options) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const opts = options || {};
    const message = opts.message || 'ไม่สามารถโหลดข้อมูลได้';
    const detail = opts.detail || 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วกดลองใหม่';
    const retryFn = opts.retryFn || null;
    const showDetail = opts.showDetail !== false;

    let html = '<div style="text-align:center; padding:20px; margin:12px 0; background:#fee2e2; border:1px solid #fecaca; border-radius:10px; color:#b91c1c;">';
    html += '<div style="font-size:15px; font-weight:700;">⚠️ ' + String(message) + '</div>';
    if (showDetail) {
      html += '<div style="font-size:12px; color:#7f1d1d; margin-top:4px;">' + String(detail) + '</div>';
    }
    if (typeof retryFn === 'function') {
      const retryId = 'ui_retry_' + (++retrySeq);
      retryRegistry[retryId] = retryFn;
      html += '<button class="btn-admin btn-admin-outline" style="margin-top:10px; width:auto;" onclick="window.PinThipSafe.ui.runRetry(\'' + retryId + '\')">🔄 ลองใหม่</button>';
    }
    html += '</div>';
    el.innerHTML = html;

    if (opts.onError) {
      try {
        opts.onError();
      } catch (e) {
        console.warn('showAsyncError onError failed:', e);
      }
    }
  }

  // Runs a retry callback registered by showAsyncError.
  function runRetry(id) {
    const fn = retryRegistry[id];
    if (typeof fn === 'function') {
      delete retryRegistry[id];
      try {
        fn();
      } catch (e) {
        console.warn('runRetry failed:', e);
      }
    }
  }

  // ================= Tabbed pages (Leave / Fuel request + history) =================
  // These render a two-tab layout (form | history) inside #mainContent for the
  // employee-facing request pages. The history tab content is lazy-loaded by
  // switchTab() calling loadLeaveHistoryInto / loadFuelHistoryInto (defined in
  // scripts/employee-ui.js) the first time the history tab is opened.

  function renderLeaveTabs(t) {
    const i18n = window.PinThipSafe && window.PinThipSafe.i18n ? window.PinThipSafe.i18n : null;
    const lang = window.currentLang || 'TH';
    const tt = (i18n && i18n[lang]) || t || {};
    const user = window.currentUser || {};
    const today = window.PinThipSafe && window.PinThipSafe.utils && window.PinThipSafe.utils.getLocalDateTimeString
      ? window.PinThipSafe.utils.getLocalDateTimeString()
      : new Date().toISOString().slice(0, 10);

    const esc = (v) => (window.PinThipSafe && window.PinThipSafe.escapeHtml)
      ? window.PinThipSafe.escapeHtml(v)
      : String(v == null ? '' : v);

    const tabLabelForm = tt.tabLeaveForm || '🌴 ขอลา';
    const tabLabelHistory = tt.tabHistory || '📜 ประวัติ';

    const formHtml =
      '<div class="user-banner">👤 ' + esc(user.empName) + ' (' + esc(user.empId) + ')</div>' +
      '<div style="text-align:left; font-size:13px; color:#555; margin:8px 0 4px 0;"><b>🌴 ประเภทการลา:</b></div>' +
      '<select id="leaveType" style="margin-bottom:8px;">' +
        '<option value="' + esc(tt.optSick || 'ลาป่วย') + '">' + esc(tt.optSick || 'ลาป่วย') + '</option>' +
        '<option value="' + esc(tt.optPersonal || 'ลากิจ') + '">' + esc(tt.optPersonal || 'ลากิจ') + '</option>' +
        '<option value="' + esc(tt.optVacation || 'ลาพักร้อน / ลาหยุด') + '">' + esc(tt.optVacation || 'ลาพักร้อน / ลาหยุด') + '</option>' +
      '</select>' +
      '<div style="text-align:left; font-size:13px; color:#555; margin:4px 0 2px 0;"><b>📅 ' + esc(tt.startDate || 'เริ่มลานวันที่') + ':</b></div>' +
      '<input type="date" id="startDate" value="' + esc(today) + '" style="width:100%; margin-bottom:8px;">' +
      '<div style="text-align:left; font-size:13px; color:#555; margin:4px 0 2px 0;"><b>📅 ' + esc(tt.endDate || 'ถึงวันที่') + ':</b></div>' +
      '<input type="date" id="endDate" value="' + esc(today) + '" style="width:100%; margin-bottom:8px;">' +
      '<div style="text-align:left; font-size:13px; color:#555; margin:4px 0;"><b>💬 ' + esc(tt.phReason || 'เหตุผลการลา') + ':</b></div>' +
      '<textarea id="leaveReason" rows="3" placeholder="' + esc(tt.phReason || 'เหตุผลการลา') + '" style="margin-bottom:8px;"></textarea>' +
      '<button class="btn-leave" onclick="handleLeaveSubmit()">📤 ' + esc(tt.btnSubmitLeave || 'ส่งใบลา') + '</button>' +
      '<button class="btn-back" onclick="showDashboard()" style="margin-left:6px;">' + esc(tt.btnBack || '⬅️ กลับหน้าหลัก') + '</button>';

    const html =
      '<div class="tab-container">' +
        '<button class="tab-btn active" data-target="leaveFormTab" onclick="switchTab(this)">' + esc(tabLabelForm) + '</button>' +
        '<button class="tab-btn" data-target="leaveHistoryTab" onclick="switchTab(this)">' + esc(tabLabelHistory) + '</button>' +
      '</div>' +
      '<div id="leaveFormTab" class="tab-content active">' + formHtml + '</div>' +
      '<div id="leaveHistoryTab" class="tab-content"></div>';

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
  }

  function renderFuelTabs(t) {
    const i18n = window.PinThipSafe && window.PinThipSafe.i18n ? window.PinThipSafe.i18n : null;
    const lang = window.currentLang || 'TH';
    const tt = (i18n && i18n[lang]) || t || {};
    const user = window.currentUser || {};

    const esc = (v) => (window.PinThipSafe && window.PinThipSafe.escapeHtml)
      ? window.PinThipSafe.escapeHtml(v)
      : String(v == null ? '' : v);

    const tabLabelForm = tt.tabRequest || '📝 ขอเบิก';
    const tabLabelHistory = tt.tabHistory || '📜 ประวัติ';

    const tabShell =
      '<div class="tab-container">' +
        '<button class="tab-btn active" data-target="fuelFormTab" onclick="switchTab(this)">' + esc(tabLabelForm) + '</button>' +
        '<button class="tab-btn" data-target="fuelHistoryTab" onclick="switchTab(this)">' + esc(tabLabelHistory) + '</button>' +
      '</div>' +
      '<div id="fuelFormTab" class="tab-content active"></div>' +
      '<div id="fuelHistoryTab" class="tab-content"></div>';

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = tabShell;

    // Load the plates added by the admin, then render the form inside the form tab.
    // Note: firebase.rules.json allows any authenticated user to read car_plates
    // (write stays admin-only), so employees/drivers can select from this list.
    if (!window.db) return;
    window.db.ref('car_plates').once('value', (snapshot) => {
      const formTab = document.getElementById('fuelFormTab');
      if (!formTab) return;
      try {
        const platesObj = snapshot.val() || {};
        const platesList = Object.keys(platesObj)
          .map((k) => platesObj[k])
          .filter((entry) => entry && entry.plate)
          .map((entry) => entry.plate);

        let optionsHtml = '<option value="">-- เลือกทะเบียนรถ --</option>';
        if (platesList.length === 0) {
          optionsHtml += '<option value="รถส่วนกลาง">รถส่วนกลาง</option>';
        } else {
          platesList.forEach((p) => {
            const safePlate = esc(p);
            optionsHtml += '<option value="' + safePlate + '">' + safePlate + '</option>';
          });
        }

        const formHtml =
          '<div class="user-banner">' + esc(user.empName) + ' (' + esc(user.empId) + ')</div>' +
          '<div style="text-align:left; font-size:13px; color:#555; margin-bottom:5px;"><b>📌 ประเภทการเบิก:</b></div>' +
          '<select id="requestType" style="margin-bottom:8px;" onchange="toggleFuelAmountField()">' +
            '<option value="⛽ เบิกค่าน้ำมัน">⛽ เบิกค่าน้ำมันรถส่งของ</option>' +
            '<option value="🔧 เบิกค่าซ่อมรถ">🔧 เบิกค่าซ่อมรถ / ค่าอะไหล่</option>' +
          '</select>' +
          '<div style="text-align:left; font-size:13px; color:#555; margin-bottom:3px;"><b>🚗 เลือกทะเบียนรถ:</b></div>' +
          '<select id="carPlateSelect" style="margin-bottom:8px;">' + optionsHtml + '</select>' +
          '<div style="text-align:left; font-size:13px; color:#555; margin-bottom:3px;"><b>📍 รายละเอียด / เส้นทาง / รายการซ่อม:</b></div>' +
          '<textarea id="fuelRoute" rows="3" placeholder="เช่น ไปส่งหมูตลาดสุพรรณ หรือ เปลี่ยนยางนอกล้อหลัง"></textarea>' +
          '<div id="fuelAmountField" style="display:none; text-align:left; font-size:13px; color:#555; margin-bottom:3px;">' +
            '<b>💵 จำนวนเงินที่ต้องการเบิก (บาท):</b>' +
            '<input type="number" id="fuelAmountInput" placeholder="ระบุจำนวนเงินที่ต้องการเบิก" style="margin-bottom:8px;">' +
          '</div>' +
          '<div id="fuelDefaultHint" style="text-align:left; font-size:12px; color:#888; margin-bottom:8px;">💡 เบิกค่าน้ำมันเริ่มต้น 1,000 บาท (แอดมินสามารถปรับยอดได้)</div>' +
          '<button class="btn-fuel" onclick="handleFuelSubmit()">💾 ส่งคำขอเบิกจ่าย</button>' +
          '<button class="btn-back" onclick="showDashboard()" style="margin-left:6px;">' + esc(tt.btnBack || '⬅️ กลับหน้าหลัก') + '</button>';
        formTab.innerHTML = formHtml;
      } catch (innerErr) {
        console.error('[renderFuelTabs] error inside car_plates callback:', innerErr);
        formTab.innerHTML = '<div style="color:#dc3545;">⚠️ โหลดข้อมูลทะเบียนรถไม่สำเร็จ: ' + (innerErr && innerErr.message ? innerErr.message : '') + '</div><button class="btn-back" onclick="showDashboard()">⬅️ กลับ</button>';
      }
    }, (dbErr) => {
      console.error('[renderFuelTabs] car_plates read failed:', dbErr);
      const formTab = document.getElementById('fuelFormTab');
      if (formTab) formTab.innerHTML = '<div style="color:#dc3545;">⚠️ อ่านข้อมูลทะเบียนรถไม่ได้: ' + (dbErr && dbErr.message ? dbErr.message : '') + '</div><button class="btn-back" onclick="showDashboard()">⬅️ กลับ</button>';
    });
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.ui = {
    setTextById,
    setHtmlById,
    showLoading,
    showAsyncError,
    runRetry,
    renderLeaveTabs,
    renderFuelTabs
  };
})();