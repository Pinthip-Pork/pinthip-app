(function () {
  // ===== Lazy-loaded Attendance Module =====
  function showAdminAttendanceSummaryReport() {
    PinThipSafe.lazyLoad.loadModule('admin-attendance').then(() => {
      window.AdminAttendance.show();
    }).catch(err => {
      PinThipSafe.modal.error('ไม่สามารถโหลดโมดูลสถิติการทำงานได้');
      console.error('Failed to load admin-attendance:', err);
    });
  }

  function renderAttendanceSummaryList() {
    if (window.AdminAttendance) {
      window.AdminAttendance.render();
    } else {
      showAdminAttendanceSummaryReport();
    }
  }

  function setAttendanceDateToday() {
    if (window.AdminAttendance) {
      window.AdminAttendance.setToday();
    }
  }

  function exportAttendanceSummaryExcel() {
    if (window.AdminAttendance) {
      window.AdminAttendance.exportExcel();
    }
  }

  function showLocationManagement() {
    window.isAdmin = true;
    const mainCard = document.getElementById('mainCard');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bellBtn = document.getElementById('bellBtn');
    const pageTitle = document.getElementById('pageTitle');
    const listBox = document.getElementById('listBox');
    const status = document.getElementById('status');

    if (mainCard) mainCard.classList.add('admin-wide');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';
    if (bellBtn) bellBtn.style.display = 'block';
    if (pageTitle) pageTitle.innerText = '📍 จัดการพิกัด GPS และรัศมีเช็กอิน';
    if (listBox) listBox.style.display = 'none';
    if (status) status.innerHTML = (typeof createLoadingHTML === 'function') ? createLoadingHTML() : 'กำลังโหลด...';

    window.db.ref('locations').once('value', (snapshot) => {
      if (status) status.innerHTML = '';
      const locObj = snapshot.val() || {};
      const locList = Object.keys(locObj).map((k) => ({ key: k, ...locObj[k] }));

      let html = `
        <h2>📍 กำหนดจุดพิกัดร้าน/โรงงาน สำหรับเช็กอิน</h2>
        <div style="background:#eef2f5; padding:12px; border-radius:10px; margin-bottom:15px; text-align:left;">
          <b>➕ เพิ่มจุดเช็กอินใหม่:</b>
          <input type="text" id="locName" placeholder="ชื่อสถานที่ (เช่น หน้าร้านปิ่นทิพย์, คลังสินค้า)">
          <input type="text" id="locLat" placeholder="ละติจูด (Lat) เช่น 13.813105">
          <input type="text" id="locLng" placeholder="ลองจิจูด (Lng) เช่น 100.067600">
          <input type="number" id="locRadius" placeholder="รัศมีที่อนุญาต (เมตร) เช่น 100" value="100">
          <button class="btn-blue" onclick="addNewLocation()" style="margin-top:8px;">💾 บันทึกจุดเช็กอินใหม่</button>
        </div>

        <h3>📋 รายการจุดเช็กอินที่มีอยู่ทั้งหมด:</h3>
      `;

      if (locList.length === 0) {
        html += '<div style="color:#888; margin-bottom:15px;">ยังไม่มีการตั้งค่าพิกัดในระบบ</div>';
      } else {
        locList.forEach((loc) => {
          html += `
            <div class="history-item">
              <b>📍 ${loc.name}</b><br>
              ละติจูด: ${loc.lat} | ลองจิจูด: ${loc.lng}<br>
              📏 รัศมีอนุญาต: <b style="color:#28a745; font-size:15px;">${loc.radius || 100} เมตร</b><br>
              <div style="margin-top:8px; display:flex; gap:6px;">
                <button class="btn-blue" style="width:auto; margin:0; padding:6px 12px; font-size:12px;" onclick="showEditLocationModal('${loc.key}', '${loc.name}', ${loc.lat}, ${loc.lng}, ${loc.radius || 100})">✏️ แก้ไข</button>
                <button class="btn-danger" style="width:auto; margin:0; padding:6px 12px; font-size:12px;" onclick="deleteLocation('${loc.key}')">🗑️ ลบ</button>
              </div>
            </div>
          `;
        });
      }

      html += '<button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดสบอร์ด</button>';
      const mainContent = document.getElementById('mainContent');
      if (mainContent) mainContent.innerHTML = html;
    }).catch((err) => {
      if (status) status.innerHTML = '';
      if (window.PinThipSafe?.ui?.showAsyncError) {
        window.PinThipSafe.ui.showAsyncError('mainContent', {
          message: 'ไม่สามารถโหลดข้อมูลพิกัด GPS ได้',
          detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
          retryFn: showLocationManagement
        });
      }
      console.error('Location management load failed:', err);
    });
  }

  function addNewLocation() {
    const name = document.getElementById('locName')?.value.trim();
    const lat = document.getElementById('locLat')?.value.trim();
    const lng = document.getElementById('locLng')?.value.trim();
    const radius = document.getElementById('locRadius')?.value.trim();

    if (!name || !lat || !lng || !radius) {
      PinThipSafe.modal.warning('กรุณากรอกข้อมูลสถานที่ให้ครบถ้วน');
      return;
    }

    window.db.ref('locations').push().set({
      name,
      lat: Number(lat),
      lng: Number(lng),
      radius: Number(radius)
    }, (err) => {
      if (!err) {
        window.showModal('🎉 สำเร็จ', 'เพิ่มพิกัดจุดเช็กอินเรียบร้อย', '<button class="btn-ok" onclick="closeModal(); showLocationManagement();">ตกลง</button>');
      }
    });
  }

  function showEditLocationModal(key, name, lat, lng, radius) {
    const html = `
      <div class="user-banner">✏️ แก้ไขจุดเช็กอิน: ${name}</div>
      <input type="hidden" id="editLocKey" value="${key}">
      <div style="text-align:left; font-size:13px; color:#555;">ชื่อสถานที่:</div>
      <input type="text" id="editLocName" value="${name}">
      <div style="text-align:left; font-size:13px; color:#555; margin-top:5px;">ละติจูด (Lat):</div>
      <input type="text" id="editLocLat" value="${lat}">
      <div style="text-align:left; font-size:13px; color:#555; margin-top:5px;">ลองจิจูด (Lng):</div>
      <input type="text" id="editLocLng" value="${lng}">
      <div style="text-align:left; font-size:13px; color:#555; margin-top:5px;">รัศมี (เมตร):</div>
      <input type="number" id="editLocRadius" value="${radius}">
      <button class="btn-blue" onclick="submitEditLocation()">💾 บันทึกการแก้ไข</button>
      <button class="btn-back" onclick="showLocationManagement()">⬅️ ย้อนกลับ</button>
    `;
    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
  }

  function submitEditLocation() {
    const key = document.getElementById('editLocKey')?.value;
    const name = document.getElementById('editLocName')?.value.trim();
    const lat = document.getElementById('editLocLat')?.value.trim();
    const lng = document.getElementById('editLocLng')?.value.trim();
    const radius = document.getElementById('editLocRadius')?.value.trim();

    if (!key || !name || !lat || !lng || !radius) {
      PinThipSafe.modal.warning('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    window.db.ref('locations/' + key).update({
      name,
      lat: Number(lat),
      lng: Number(lng),
      radius: Number(radius)
    }, (err) => {
      if (!err) {
        window.showModal('🎉 สำเร็จ', 'แก้ไขพิกัดจุดเช็กอินเรียบร้อย', '<button class="btn-ok" onclick="closeModal(); showLocationManagement();">ตกลง</button>');
      }
    });
  }

  function deleteLocation(key) {
    window.showModal('❓ ยืนยันการลบ', 'ต้องการลบจุดเช็กอินนี้ใช่หรือไม่?',
      `<button class="btn-yes" onclick="executeDeleteLocation('${key}')">ใช่, ลบ</button><button class="btn-no" onclick="closeModal()">ยกเลิก</button>`
    );
  }

  function executeDeleteLocation(key) {
    window.db.ref('locations/' + key).remove((_err) => {
      window.closeModal();
      window.showLocationManagement();
    });
  }

  function showFuelRequestForm() {
    try {
      const t = (window.i18n && window.i18n[window.currentLang]) || { pageTitleFuel: 'Fuel', btnBack: 'Back' };
      const pageTitle = document.getElementById('pageTitle');
      const listBox = document.getElementById('listBox');
      const status = document.getElementById('status');

      if (pageTitle) pageTitle.innerText = t.pageTitleFuel || 'แบบฟอร์มขอเบิก';
      if (listBox) listBox.style.display = 'none';
      if (status) status.innerHTML = '';

      // Render a two-tab layout (ขอเบิก | ประวัติ). The actual form + history
      // markup is produced by helpers in employee-ui.js so the same tab UI
      // is shared by the leave page.
      if (window.PinThipSafe && window.PinThipSafe.ui && window.PinThipSafe.ui.renderFuelTabs) {
        window.PinThipSafe.ui.renderFuelTabs(t);
      } else {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) mainContent.innerHTML = '<div style="color:#dc3545;">⚠️ Tab UI ยังไม่พร้อม</div>';
      }
    } catch (outerErr) {
      console.error('[showFuelRequestForm] outer error:', outerErr);
      PinThipSafe.modal.error('เปิดฟอร์มเบิกไม่ได้: ' + (outerErr && outerErr.message ? outerErr.message : outerErr));
    }
  }

  function toggleFuelAmountField() {
    const reqType = document.getElementById('requestType')?.value;
    const amountField = document.getElementById('fuelAmountField');
    const defaultHint = document.getElementById('fuelDefaultHint');
    if (!amountField || !defaultHint) return;

    if (reqType && reqType.includes('ซ่อม')) {
      amountField.style.display = 'block';
      defaultHint.style.display = 'none';
    } else {
      amountField.style.display = 'none';
      defaultHint.style.display = 'block';
    }
  }

  function handleFuelSubmit() {
    const reqType = document.getElementById('requestType')?.value;
    const carPlate = document.getElementById('carPlateSelect')?.value;
    const route = document.getElementById('fuelRoute')?.value.trim();
    const amountInput = document.getElementById('fuelAmountInput')?.value.trim();

    if (!carPlate) {
      PinThipSafe.modal.warning('กรุณาเลือกทะเบียนรถ');
      return;
    }

    // ค่าเริ่มต้น: เบิกค่าน้ำมัน = 1000 บาท, เบิกค่าซ่อม = พนักงานกรอกเอง
    let defaultAmount = 0;
    if (reqType && reqType.includes('น้ำมัน')) {
      defaultAmount = 1000;
    } else if (reqType && reqType.includes('ซ่อม')) {
      if (!amountInput || Number(amountInput) <= 0) {
        PinThipSafe.modal.warning('กรุณากรอกจำนวนเงินที่ต้องการเบิกค่าซ่อม');
        return;
      }
      defaultAmount = Number(amountInput);
    }

    const newRef = window.db.ref('fuel_requests').push();
    newRef.set({
      empId: window.currentUser.empId,
      empName: window.currentUser.empName,
      requestType: reqType,
      carPlate,
      route: route || '-',
      amount: defaultAmount,
      date: window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10),
      status: 'รออนุมัติ ⏳',
      applyDate: new Date().toLocaleDateString()
    }, (err) => {
      if (!err) {
        window.showModal('🎉 สำเร็จ', 'ส่งคำขอเบิกค่าใช้จ่ายเรียบร้อย (รอแอดมินพิจารณายอดเงิน)', '<button class="btn-ok" onclick="closeModal(); showDashboard();">ตกลง</button>');
      }
    });
  }

  function showAdminFuelRequests() {
    window.isAdmin = true;
    const mainCard = document.getElementById('mainCard');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bellBtn = document.getElementById('bellBtn');
    const pageTitle = document.getElementById('pageTitle');
    const listBox = document.getElementById('listBox');
    const status = document.getElementById('status');

    if (mainCard) mainCard.classList.add('admin-wide');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';
    if (bellBtn) bellBtn.style.display = 'block';
    if (pageTitle) pageTitle.innerText = '⛽/🔧 อนุมัติเบิกค่าน้ำมัน / ค่าซ่อมรถ';
    if (listBox) listBox.style.display = 'none';
    if (status) status.innerHTML = (typeof createLoadingHTML === 'function') ? createLoadingHTML() : 'กำลังโหลด...';

    window.db.ref('fuel_requests').once('value', (snapshot) => {
      if (status) status.innerHTML = '';
      const fuelObj = snapshot.val() || {};
      const list = Object.keys(fuelObj).map((k) => ({ key: k, ...fuelObj[k] }));

      let html = '<h2>⛽/🔧 รายการคำขอเบิกจ่าย (รออนุมัติ & กำหนดเงิน)</h2>';
      const pendingList = list.filter((item) => String(item.status || '').includes('รออนุมัติ'));

      if (pendingList.length === 0) {
        html += '<div style="color:#888; margin:20px 0;">ไม่มีรายการเบิกจ่ายที่รออนุมัติในขณะนี้</div>';
      } else {
        pendingList.reverse().forEach((item) => {
          const badgeType = window.PinThipSafe.safeText(item.requestType || '⛽ เบิกค่าน้ำมัน');
          const safeEmpName = window.PinThipSafe.safeText(item.empName);
          const safeEmpId = window.PinThipSafe.safeText(item.empId);
          const safeCarPlate = window.PinThipSafe.safeText(item.carPlate);
          const safeRoute = window.PinThipSafe.safeText(item.route || '-');
          const plateText = item.carPlate ? `🚗 ทะเบียน: <b>${safeCarPlate}</b>` : '';
          html += `
            <div class="history-item">
              <b>👤 ${safeEmpName} (${safeEmpId})</b> [${badgeType}] ⏳<br>
              ${plateText}<br>
              📍 รายละเอียด: <b>${safeRoute}</b><br>
              📅 วันที่ขอ: ${window.PinThipSafe.safeText(item.date)} <br><br>
              <div style="text-align:left; font-size:13px; font-weight:bold; margin-bottom:3px;">💵 กำหนดจำนวนเงินอนุมัติ (บาท):</div>
              <input type="number" id="fuelAmount_${item.key}" value="${item.amount || ''}" placeholder="ระบุยอดเงินที่ให้เบิก" style="margin-bottom:8px;">
              <div style="display:flex; gap:8px; align-items:center;">
                <select id="fuelStatus_${item.key}" style="margin:0; padding:8px; font-size:13px; font-weight:bold;">
                  <option value="อนุมัติแล้ว 🟢">🟢 อนุมัติ</option>
                  <option value="ไม่อนุมัติ 🔴">🔴 ไม่อนุมัติ</option>
                </select>
                <button onclick="updateFuelStatusWithAmount('${item.key}')" style="width:auto; margin:0; padding:8px 12px; font-size:13px; background:#0d6efd;">บันทึกยอด & สถานะ</button>
              </div>
            </div>
          `;
        });
      }
      html += '<button class="btn-back" onclick="showAdminDashboard()">⬅️ กลับหน้าแดสบอร์ด</button>';
      const mainContent = document.getElementById('mainContent');
      if (mainContent) mainContent.innerHTML = html;
    }, (err) => {
      console.error('Admin fuel requests load failed:', err);
      if (status) status.innerHTML = '';
      if (window.PinThipSafe?.ui?.showAsyncError) {
        window.PinThipSafe.ui.showAsyncError('mainContent', {
          message: 'ไม่สามารถโหลดรายการขอเบิกจ่ายได้',
          detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
          retryFn: showAdminFuelRequests
        });
      }
    });
  }

  function updateFuelStatusWithAmount(key) {
    const newStatus = document.getElementById(`fuelStatus_${key}`)?.value;
    const amountVal = document.getElementById(`fuelAmount_${key}`)?.value.trim();

    if (newStatus && newStatus.includes('อนุมัติแล้ว') && (!amountVal || Number(amountVal) <= 0)) {
      PinThipSafe.modal.warning('กรุณากรอกจำนวนเงินอนุมัติให้ถูกต้อง');
      return;
    }

    window.db.ref('fuel_requests/' + key).update({
      status: newStatus,
      amount: Number(amountVal || 0)
    }, (err) => {
      if (!err) {
        window.showModal('🎉 สำเร็จ', 'บันทึกข้อมูลการอนุมัติและจำนวนเงินเรียบร้อย', '<button class="btn-ok" onclick="closeModal(); showAdminFuelRequests();">ตกลง</button>');
      }
    });
  }

  function showAdminFuelHistory() {
    window.isAdmin = true;
    const mainCard = document.getElementById('mainCard');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bellBtn = document.getElementById('bellBtn');
    const pageTitle = document.getElementById('pageTitle');
    const listBox = document.getElementById('listBox');

    if (mainCard) mainCard.classList.add('admin-wide');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';
    if (bellBtn) bellBtn.style.display = 'block';
    if (pageTitle) pageTitle.innerText = '📜 ประวัติ & จัดการเบิกจ่ายทั้งหมด (แยกน้ำมัน/ค่าซ่อม)';
    if (listBox) listBox.style.display = 'none';

    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);

    const html = `
      <h2>📜 ประวัติรายการเบิกจ่ายค่าน้ำมัน & ค่าซ่อมรถ</h2>
      <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border: 2px dashed #e67e22; padding: 15px; border-radius: 12px; margin-bottom: 20px; text-align: left;">
        <b>🚗 จัดการทะเบียนรถในระบบ:</b>
        <div style="display: flex; gap: 8px; margin-top: 8px;">
          <input type="text" id="newCarPlateInput" placeholder="เพิ่มทะเบียนรถใหม่ (เช่น 3กฐ 1234)" style="margin:0; font-weight:bold;">
          <button class="btn-fuel" onclick="addCarPlate()" style="width: auto; margin: 0; padding: 10px 15px;">➕ เพิ่มทะเบียน</button>
        </div>
        <div id="carPlatesListContainer" style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px;"></div>
      </div>
      <div style="background:#eef2f5; padding:12px; border-radius:10px; margin-bottom:15px; text-align:left;">
        <b>📅 เลือกช่วงเวลาตรวจสอบประวัติการเบิก:</b>
        <div style="display:flex; gap:10px; margin-top:5px;">
          <div style="flex:1;">
            <span style="font-size:12px; color:#555;">จากวันที่:</span>
            <input type="date" id="fuelStartDate" value="${todayStr}" onchange="renderFuelHistoryList()" style="font-weight:bold; margin:2px 0 0 0;">
          </div>
          <div style="flex:1;">
            <span style="font-size:12px; color:#555;">ถึงวันที่:</span>
            <input type="date" id="fuelEndDate" value="${todayStr}" onchange="renderFuelHistoryList()" style="font-weight:bold; margin:2px 0 0 0;">
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn-blue" onclick="setFuelDateToday()" style="margin:0; padding:8px; font-size:13px; flex:1;">📌 ดูเฉพาะวันนี้</button>
          <button class="btn-excel" onclick="exportFuelHistoryExcel()" style="margin:0; padding:8px; font-size:13px; flex:1;">📥 ส่งออกข้อมูลเป็น Excel</button>
        </div>
      </div>
      <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 15px; margin-bottom: 15px; text-align: left;">
        <div style="font-size: 14px; font-weight: bold; color: #2c3e50; margin-bottom: 10px; border-bottom: 1px solid #dee2e6; padding-bottom: 6px;">
          📊 สรุปยอดแยกตามทะเบียนรถ (ค่าน้ำมัน vs ค่าซ่อมรถ)
        </div>
        <div id="carExpenseChartContainer"></div>
      </div>
      <div id="fuelHistoryContainer"></div>
      <button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดสบอร์ด</button>
    `;

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
    window.loadCarPlatesManagementList();
    window.renderFuelHistoryList();
  }

  function loadCarPlatesManagementList() {
    const container = document.getElementById('carPlatesListContainer');
    if (!container) return;

    window.db.ref('car_plates').once('value', (snapshot) => {
      const obj = snapshot.val() || {};
      const list = Object.keys(obj).map((k) => ({ key: k, ...obj[k] }));

      if (list.length === 0) {
        container.innerHTML = '<span style="color:#888; font-size:13px; font-style:italic;">ยังไม่มีทะเบียนรถในระบบ</span>';
        return;
      }

      let html = '';
      list.forEach((item) => {
        const safePlate = window.PinThipSafe.safeText(item.plate);
        html += `
          <span style="background: white; border: 1px solid #ced4da; padding: 4px 10px; border-radius: 6px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; font-weight: bold;">
            🚗 ${safePlate}
            <span onclick="deleteCarPlate('${window.PinThipSafe.safeText(item.key)}')" style="cursor: pointer; color: #dc3545; font-weight: bold; font-size: 15px;" title="ลบ">&times;</span>
          </span>
        `;
      });
      container.innerHTML = html;
    }, (err) => {
      console.error('Car plates management load failed:', err);
      container.innerHTML = '';
      if (window.PinThipSafe?.ui?.showAsyncError) {
        window.PinThipSafe.ui.showAsyncError('carPlatesListContainer', {
          message: 'ไม่สามารถโหลดทะเบียนรถได้',
          detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
          retryFn: loadCarPlatesManagementList
        });
      }
    });
  }

  function addCarPlate() {
    const val = document.getElementById('newCarPlateInput')?.value.trim();
    if (!val) {
      PinThipSafe.modal.warning('กรุณากรอกเลขทะเบียนรถ');
      return;
    }

    window.db.ref('car_plates').push().set({ plate: val }, (err) => {
      if (!err) {
        const input = document.getElementById('newCarPlateInput');
        if (input) input.value = '';
        window.loadCarPlatesManagementList();
      }
    });
  }

  function deleteCarPlate(key) {
    window.db.ref('car_plates/' + key).remove((err) => {
      if (!err) {
        window.loadCarPlatesManagementList();
      }
    });
  }

  function setFuelDateToday() {
    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);
    const startDate = document.getElementById('fuelStartDate');
    const endDate = document.getElementById('fuelEndDate');
    if (startDate) startDate.value = todayStr;
    if (endDate) endDate.value = todayStr;
    window.renderFuelHistoryList();
  }

  let currentFuelFilteredList = [];

  function renderFuelHistoryList() {
    const startDate = document.getElementById('fuelStartDate')?.value;
    const endDate = document.getElementById('fuelEndDate')?.value;
    const container = document.getElementById('fuelHistoryContainer');
    if (!container || !startDate || !endDate) return;

    container.innerHTML = (typeof createLoadingHTML === 'function') ? createLoadingHTML() : 'กำลังโหลด...';

    window.db.ref('fuel_requests').once('value', (snapshot) => {
      try {
        const fuelObj = snapshot.val() || {};
        const list = Object.keys(fuelObj).map((k) => ({ key: k, ...fuelObj[k] }));

        currentFuelFilteredList = list.filter((item) => item.date && item.date >= startDate && item.date <= endDate);

        let totalFuelOnly = 0;
        let totalRepairOnly = 0;

        currentFuelFilteredList.forEach((item) => {
          const statusStr = String(item.status || '');
          const reqType = item.requestType || 'เบิกค่าน้ำมัน';
          if (statusStr.includes('อนุมัติแล้ว')) {
            const amt = Number(item.amount || 0);
            if (reqType.includes('ซ่อม')) {
              totalRepairOnly += amt;
            } else {
              totalFuelOnly += amt;
            }
          }
        });

        const grandTotalApproved = totalFuelOnly + totalRepairOnly;

        let html = `
          <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-left: 4px solid #e67e22; color: #333; padding: 12px 15px; border-radius: 10px; margin-bottom: 15px; text-align: left; font-size: 14px;">
            <b>📊 สรุปยอดเบิกจ่ายช่วงวันที่ ${startDate} ถึง ${endDate}:</b><br>
            • ⛽ ค่าน้ำมันรวม: <b style="color: #e67e22;">${totalFuelOnly.toLocaleString()} บาท</b><br>
            • 🔧 ค่าซ่อมรถรวม: <b style="color: #d9534f;">${totalRepairOnly.toLocaleString()} บาท</b><br>
            💰 รวมยอดอนุมัติจ่ายทั้งหมด: <b style="color: #2c3e50; font-size: 16px;">${grandTotalApproved.toLocaleString()} บาท</b> (${currentFuelFilteredList.length} รายการ)
          </div>
        `;

        if (currentFuelFilteredList.length === 0) {
          html += '<div style="color:#888; margin:20px 0;">ไม่มีรายการเบิกจ่ายในช่วงเวลาดังกล่าว</div>';
        } else {
          currentFuelFilteredList.slice().reverse().forEach((item) => {
            const statusBadge = String(item.status || '').includes('อนุมัติแล้ว') ? '🟢 อนุมัติแล้ว' : (String(item.status || '').includes('ไม่อนุมัติ') ? '🔴 ไม่อนุมัติ' : '⏳ รออนุมัติ');
            const isApproved = String(item.status || '').includes('อนุมัติแล้ว');
            const isPaid = item.paid === true;
            const paidBadge = isApproved
              ? (isPaid ? '<span style=\"color:#2e7d32; font-weight:bold;\">💰 ได้รับเงินแล้ว</span>' + (item.paidDate ? ' (' + window.PinThipSafe.safeText(item.paidDate) + ')' : '') : '<span style=\"color:#e67e22; font-weight:bold;\">❓ ยังไม่ได้รับเงิน</span>')
              : '';
            const badgeType = window.PinThipSafe.safeText(item.requestType || '⛽ เบิกค่าน้ำมัน');
            const safeEmpName = window.PinThipSafe.safeText(item.empName);
            const safeEmpId = window.PinThipSafe.safeText(item.empId);
            const safeCarPlate = window.PinThipSafe.safeText(item.carPlate || '');
            const safeRoute = window.PinThipSafe.safeText(item.route || '-');
            const plateText = item.carPlate ? `🚗 ทะเบียน: ${safeCarPlate} | ` : '';
            const typeColor = badgeType.includes('ซ่อม') ? '#d9534f' : '#e67e22';

            html += `
              <div class="history-item">
                <b>👤 ${safeEmpName} (${safeEmpId})</b> [<span style="color:${typeColor}; font-weight:bold;">${badgeType}</span>] | สถานะ: <b>${statusBadge}</b>${isApproved ? ' | ' + paidBadge : ''}<br>
                ${plateText}📍 รายละเอียด: ${safeRoute} | 💵 ยอด: <b style="color:${typeColor}; font-size:15px;">${Number(item.amount || 0).toLocaleString()} บาท</b><br>
                📅 วันที่: ${window.PinThipSafe.safeText(item.date)}<br>
                <div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">
                  <button class="btn-blue" style="width:auto; margin:0; padding:6px 12px; font-size:12px;" onclick="showEditFuelModal('${window.PinThipSafe.safeText(item.key)}', '${safeCarPlate}', '${safeRoute}', ${item.amount || 0}, '${badgeType}')">✏️ แก้ไขข้อมูล</button>
                  <button class="btn-danger" style="width:auto; margin:0; padding:6px 12px; font-size:12px;" onclick="confirmDeleteFuel('${window.PinThipSafe.safeText(item.key)}', '${safeEmpName}')">🗑️ ลบ</button>
                  ${isApproved ? (isPaid
                    ? `<button class="btn-back" style="width:auto; margin:0; padding:6px 12px; font-size:12px;" onclick="toggleFuelPaid('${window.PinThipSafe.safeText(item.key)}', false)">↩️ ยกเลิกได้รับเงิน</button>`
                    : `<button style="width:auto; margin:0; padding:6px 12px; font-size:12px; background:#28a745; color:#fff; border:none; border-radius:6px;" onclick="toggleFuelPaid('${window.PinThipSafe.safeText(item.key)}', true)">💰 ทำเครื่องหมายได้รับเงินแล้ว</button>`) : ''}
                </div>
              </div>
            `;
          });
        }
        container.innerHTML = html;
        window.renderCarExpenseChart();
      } catch (innerErr) {
        console.error('Fuel history load failed:', innerErr);
        if (container) container.innerHTML = '';
        if (window.PinThipSafe?.ui?.showAsyncError) {
          window.PinThipSafe.ui.showAsyncError('fuelHistoryContainer', {
            message: 'ไม่สามารถโหลดข้อมูลประวัติการเบิกจ่ายได้',
            detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
            retryFn: renderFuelHistoryList
          });
        }
      }
    }, (dbErr) => {
      console.error('Fuel history read failed:', dbErr);
      if (container) container.innerHTML = '';
      if (window.PinThipSafe?.ui?.showAsyncError) {
        window.PinThipSafe.ui.showAsyncError('fuelHistoryContainer', {
          message: 'ไม่สามารถโหลดข้อมูลประวัติการเบิกจ่ายได้',
          detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
          retryFn: renderFuelHistoryList
        });
      }
    });
  }

  function renderCarExpenseChart() {
    const chartContainer = document.getElementById('carExpenseChartContainer');
    if (!chartContainer) return;

    const carData = {};
    let maxAmount = 1;

    currentFuelFilteredList.forEach((item) => {
      const plate = item.carPlate || 'ไม่ระบุทะเบียน';
      const statusStr = String(item.status || '');
      const reqType = item.requestType || 'เบิกค่าน้ำมัน';
      if (statusStr.includes('อนุมัติแล้ว')) {
        const amt = Number(item.amount || 0);
        if (!carData[plate]) carData[plate] = { fuel: 0, repair: 0 };

        if (reqType.includes('ซ่อม')) {
          carData[plate].repair += amt;
        } else {
          carData[plate].fuel += amt;
        }

        const totalForPlate = carData[plate].fuel + carData[plate].repair;
        if (totalForPlate > maxAmount) maxAmount = totalForPlate;
      }
    });

    const plates = Object.keys(carData);
    if (plates.length === 0) {
      chartContainer.innerHTML = '<div style="color: #888; font-size: 13px; text-align: center; padding: 10px;">ไม่มีข้อมูลยอดเงินที่อนุมัติในช่วงเวลานี้</div>';
      return;
    }

    let chartHtml = '';
    plates.forEach((plate) => {
      const safePlate = window.PinThipSafe.safeText(plate);
      const fAmt = carData[plate].fuel;
      const rAmt = carData[plate].repair;
      const total = fAmt + rAmt;

      chartHtml += `
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px; color: #495057;">
            <span>🚗 <b>${safePlate}</b> (⛽ ค่าน้ำมัน: <b style="color:#e67e22;">${fAmt.toLocaleString()} ฿</b> | 🔧 ค่าซ่อม: <b style="color:#d9534f;">${rAmt.toLocaleString()} ฿</b>)</span>
            <span style="font-weight: bold; color: #2c3e50;">รวม ${total.toLocaleString()} บาท</span>
          </div>
          <div style="background: #e9ecef; border-radius: 6px; height: 10px; width: 100%; overflow: hidden; display: flex;">
            <div style="background: #e67e22; width: ${Math.round((fAmt / total) * 100 || 0)}%; height: 100%;" title="ค่าน้ำมัน"></div>
            <div style="background: #d9534f; width: ${Math.round((rAmt / total) * 100 || 0)}%; height: 100%;" title="ค่าซ่อม"></div>
          </div>
        </div>
      `;
    });

    chartContainer.innerHTML = chartHtml;
  }

  function exportFuelHistoryExcel() {
    if (!currentFuelFilteredList || currentFuelFilteredList.length === 0) {
      PinThipSafe.modal.warning('ไม่มีข้อมูลสำหรับส่งออกเป็น Excel');
      return;
    }
    const startDate = document.getElementById('fuelStartDate')?.value;
    const endDate = document.getElementById('fuelEndDate')?.value;

    const rows = [
      ['รหัสพนักงาน', 'ชื่อพนักงาน', 'ประเภทการเบิก', 'ทะเบียนรถ', 'รายละเอียดเส้นทาง/การซ่อม', 'จำนวนเงินที่อนุมัติ (บาท)', 'สถานะ', 'วันที่ขอ']
    ];

    currentFuelFilteredList.forEach((item) => {
      rows.push([
        item.empId,
        item.empName,
        item.requestType || 'เบิกค่าน้ำมัน',
        item.carPlate || '-',
        item.route || '-',
        item.amount || 0,
        item.status || '',
        item.date || ''
      ]);
    });

    window.downloadCSV(`Fuel_Repair_Requests_${startDate}_to_${endDate}.csv`, rows);
  }

  function showEditFuelModal(key, carPlate, route, amount, reqType) {
    window.db.ref('car_plates').once('value', (snapshot) => {
      const platesObj = snapshot.val() || {};
      const platesList = Object.keys(platesObj).map((k) => platesObj[k].plate);

      let optionsHtml = '<option value="">-- เลือกทะเบียนรถ --</option>';
      if (platesList.length === 0) {
        optionsHtml += `<option value="${carPlate || 'รถส่วนกลาง'}">${carPlate || 'รถส่วนกลาง'}</option>`;
      } else {
        platesList.forEach((p) => {
          const selected = (p === carPlate) ? 'selected' : '';
          optionsHtml += `<option value="${p}" ${selected}>${p}</option>`;
        });
      }

      const html = `
        <div class="user-banner">✏️ แก้ไขข้อมูลการเบิกจ่าย</div>
        <input type="hidden" id="editFuelKey" value="${key}">
        <div style="text-align:left; font-size:13px; color:#555;">ประเภทการเบิก:</div>
        <select id="editFuelType" style="margin-bottom:8px;">
          <option value="⛽ เบิกค่าน้ำมัน" ${reqType.includes('น้ำมัน') ? 'selected' : ''}>⛽ เบิกค่าน้ำมันรถส่งของ</option>
          <option value="🔧 เบิกค่าซ่อมรถ" ${reqType.includes('ซ่อม') ? 'selected' : ''}>🔧 เบิกค่าซ่อมรถ / ค่าอะไหล่</option>
        </select>
        <div style="text-align:left; font-size:13px; color:#555;">ทะเบียนรถ:</div>
        <select id="editCarPlateSelect" style="margin-bottom:8px;">
          ${optionsHtml}
        </select>
        <div style="text-align:left; font-size:13px; color:#555; margin-top:5px;">รายละเอียด / เส้นทาง:</div>
        <input type="text" id="editFuelRoute" value="${route}">
        <div style="text-align:left; font-size:13px; color:#555; margin-top:5px;">จำนวนเงินอนุมัติ (บาท):</div>
        <input type="number" id="editFuelAmount" value="${amount}">
        <button class="btn-blue" onclick="submitEditFuel()">💾 บันทึกการแก้ไข</button>
        <button class="btn-back" onclick="showAdminFuelHistory()">⬅️ ย้อนกลับ</button>
      `;
      const mainContent = document.getElementById('mainContent');
      if (mainContent) mainContent.innerHTML = html;
    }, (err) => {
      console.error('Edit fuel modal plates load failed:', err);
      PinThipSafe.modal.error('โหลดรายการทะเบียนรถไม่สำเร็จ กรุณาลองอีกครั้ง');
      window.showAdminFuelHistory();
    });
  }

  function submitEditFuel() {
    const key = document.getElementById('editFuelKey')?.value;
    const reqType = document.getElementById('editFuelType')?.value;
    const carPlate = document.getElementById('editCarPlateSelect')?.value;
    const route = document.getElementById('editFuelRoute')?.value.trim();
    const amount = document.getElementById('editFuelAmount')?.value.trim();

    if (!carPlate || !amount) {
      PinThipSafe.modal.warning('กรุณาเลือกทะเบียนรถและกรอกจำนวนเงินให้ครบถ้วน');
      return;
    }

    window.db.ref('fuel_requests/' + key).update({
      requestType: reqType,
      carPlate,
      route: route || '-',
      amount: Number(amount)
    }, (err) => {
      if (!err) {
        window.showModal('🎉 สำเร็จ', 'แก้ไขข้อมูลเรียบร้อย', '<button class="btn-ok" onclick="closeModal(); showAdminFuelHistory();">ตกลง</button>');
      }
    });
  }

  function confirmDeleteFuel(key, empName) {
    window.showModal('❓ ยืนยันการลบ', `ต้องการลบรายการเบิกจ่ายของ (${empName}) ใช่หรือไม่?`,
      `<button class="btn-yes" onclick="executeDeleteFuel('${key}')">ใช่, ลบ</button><button class="btn-no" onclick="closeModal()">ยกเลิก</button>`
    );
  }

  function executeDeleteFuel(key) {
    window.db.ref('fuel_requests/' + key).remove((_err) => {
      window.closeModal();
      window.showAdminFuelHistory();
    });
  }

  // ===== Fuel Payment Status (paid / not paid) =====
  // Admin marks a fuel/repair request as "ได้รับเงินแล้ว" (paid: true) so the
  // employee is informed the money has been handed over. When toggled back to
  // false the paidDate is cleared. Only applies to already-approved requests.
  function toggleFuelPaid(key, paid) {
    if (!key) return;
    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString
      ? window.PinThipSafe.utils.getLocalDateTimeString()
      : new Date().toISOString().slice(0, 10);

    const update = paid
      ? { paid: true, paidDate: todayStr }
      : { paid: false, paidDate: null };

    window.db.ref('fuel_requests/' + key).update(update, (err) => {
      if (err) {
        console.error('Update paid status failed:', err);
        PinThipSafe.modal.error('บันทึกสถานะการรับเงินไม่สำเร็จ กรุณาลองอีกครั้ง');
        return;
      }
      // Refresh the history list so the badge + button reflect the new state.
      window.renderFuelHistoryList();
    });
  }

  function showAdminLeaves() {
    window.isAdmin = true;
    const mainCard = document.getElementById('mainCard');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bellBtn = document.getElementById('bellBtn');
    const pageTitle = document.getElementById('pageTitle');
    const listBox = document.getElementById('listBox');

    if (mainCard) mainCard.classList.add('admin-wide');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';
    if (bellBtn) bellBtn.style.display = 'block';
    if (pageTitle) pageTitle.innerText = '🌴 อนุมัติคำขอลา (รออนุมัติ)';
    if (listBox) listBox.style.display = 'none';

    window.db.ref('leaves').once('value', (snapshot) => {
      const leavesObj = snapshot.val() || {};
      const pendingList = [];

      Object.keys(leavesObj).forEach((k) => {
        const item = leavesObj[k];
        const statusStr = String(item.status || '');
        if (statusStr.includes('รออนุมัติ') || statusStr === '') {
          pendingList.push({ key: k, ...item });
        }
      });

      let html = '<h2>🌴 รายการขอลางานที่รอการพิจารณา</h2>';
      if (pendingList.length === 0) {
        html += '<div style="color:#888; margin:20px 0;">ไม่มีรายการใบลาที่รออนุมัติในขณะนี้</div>';
      } else {
        pendingList.reverse().forEach((item) => {
          const safeEmpName = window.PinThipSafe.safeText(item.empName);
          const safeLeaveType = window.PinThipSafe.safeText(item.leaveType);
          const safeReason = window.PinThipSafe.safeText(item.reason);
          html += `
            <div class="history-item" style="background:#fff3cd;">
              <b>👤 ${safeEmpName}</b> (${safeLeaveType}) ⏳<br>
              📅 ${window.PinThipSafe.safeText(item.startDate)} ถึง ${window.PinThipSafe.safeText(item.endDate)}<br>
              💬 เหตุผล: ${safeReason}<br><br>
              <div style="display:flex; gap:8px;">
                <select id="leaveStatus_${item.key}" style="margin:0; padding:8px; font-weight:bold;">
                  <option value="อนุมัติแล้ว 🟢">🟢 อนุมัติ</option>
                  <option value="ไม่อนุมัติ 🔴">🔴 ไม่อนุมัติ</option>
                </select>
                <button onclick="updateLeaveStatusAndHide('${item.key}')" style="width:auto; margin:0; padding:8px 12px; background:#0d6efd;">บันทึกผลการพิจารณา</button>
              </div>
            </div>`;
        });
      }
      html += '<button class="btn-back" onclick="showAdminDashboard()">⬅️ กลับหน้าแดสบอร์ด</button>';
      const mainContent = document.getElementById('mainContent');
      if (mainContent) mainContent.innerHTML = html;
    }, (err) => {
      console.error('Admin leaves load failed:', err);
      if (window.PinThipSafe?.ui?.showAsyncError) {
        window.PinThipSafe.ui.showAsyncError('mainContent', {
          message: 'ไม่สามารถโหลดรายการขอลาได้',
          detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
          retryFn: showAdminLeaves
        });
      }
    });
  }

  function updateLeaveStatusAndHide(key) {
    const status = document.getElementById(`leaveStatus_${key}`)?.value;
    window.db.ref('leaves/' + key).update({ status }, () => {
      window.showModal('🎉 สำเร็จ', 'บันทึกผลการพิจารณาและย้ายไปหน้าประวัติเรียบร้อย', '<button class="btn-ok" onclick="closeModal(); showAdminLeaves();">ตกลง</button>');
    });
  }

  function showAdminLeaveHistory() {
    window.isAdmin = true;
    const mainCard = document.getElementById('mainCard');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bellBtn = document.getElementById('bellBtn');
    const pageTitle = document.getElementById('pageTitle');
    const listBox = document.getElementById('listBox');

    if (mainCard) mainCard.classList.add('admin-wide');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';
    if (bellBtn) bellBtn.style.display = 'block';
    if (pageTitle) pageTitle.innerText = '📜 ประวัติการขอลางานทั้งหมด';
    if (listBox) listBox.style.display = 'none';

    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);

    const html = `
      <h2>📜 ประวัติการขอลางาน & จัดการย้อนหลัง</h2>
      <div style="background:#eef2f5; padding:12px; border-radius:10px; margin-bottom:15px; text-align:left;">
        <b>📅 เลือกช่วงเวลาตรวจสอบ (อิงตามวันเริ่มลา):</b>
        <div style="display:flex; gap:10px; margin-top:5px;">
          <div style="flex:1;">
            <span style="font-size:12px; color:#555;">จากวันที่:</span>
            <input type="date" id="leaveStartDate" value="${todayStr}" onchange="renderLeaveHistoryList()" style="font-weight:bold; margin:2px 0 0 0;">
          </div>
          <div style="flex:1;">
            <span style="font-size:12px; color:#555;">ถึงวันที่:</span>
            <input type="date" id="leaveEndDate" value="${todayStr}" onchange="renderLeaveHistoryList()" style="font-weight:bold; margin:2px 0 0 0;">
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn-blue" onclick="setLeaveDateToday()" style="margin:0; padding:8px; font-size:13px; flex:1;">📌 ดูเฉพาะวันนี้</button>
          <button class="btn-excel" onclick="exportLeaveHistoryExcel()" style="margin:0; padding:8px; font-size:13px; flex:1;">📥 ส่งออกข้อมูลเป็น Excel</button>
        </div>
      </div>
      <div id="leaveHistoryContainer"></div>
      <button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดสบอร์ด</button>
    `;

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
    window.renderLeaveHistoryList();
  }

  function setLeaveDateToday() {
    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);
    const startDate = document.getElementById('leaveStartDate');
    const endDate = document.getElementById('leaveEndDate');
    if (startDate) startDate.value = todayStr;
    if (endDate) endDate.value = todayStr;
    window.renderLeaveHistoryList();
  }

  let currentLeaveFilteredList = [];

  function renderLeaveHistoryList() {
    const startDate = document.getElementById('leaveStartDate')?.value;
    const endDate = document.getElementById('leaveEndDate')?.value;
    const container = document.getElementById('leaveHistoryContainer');
    if (!container || !startDate || !endDate) return;

    container.innerHTML = (typeof createLoadingHTML === 'function') ? createLoadingHTML() : 'กำลังโหลด...';

    window.db.ref('leaves').once('value', (snapshot) => {
      const leavesObj = snapshot.val() || {};
      const list = Object.keys(leavesObj).map((k) => ({ key: k, ...leavesObj[k] }));

      currentLeaveFilteredList = list.filter((item) => item.startDate && item.startDate >= startDate && item.startDate <= endDate);

      let html = `
        <div style="background: linear-gradient(135deg, #fd7e14, #ffc107); color: white; padding: 12px; border-radius: 10px; margin-bottom: 15px; text-align: left; font-size: 14px;">
          <b>📊 สรุปประวัติการลาช่วงวันที่ ${startDate} ถึง ${endDate}:</b><br>
          📋 พบทั้งหมด: <b>${currentLeaveFilteredList.length} รายการ</b>
        </div>
      `;

      if (currentLeaveFilteredList.length === 0) {
        html += '<div style="color:#888; margin:20px 0;">ไม่มีรายการลาในช่วงเวลาดังกล่าว</div>';
      } else {
        currentLeaveFilteredList.slice().reverse().forEach((item) => {
          const statusStr = item.status || 'รออนุมัติ ⏳';
          const safeEmpName = window.PinThipSafe.safeText(item.empName);
          const safeEmpId = window.PinThipSafe.safeText(item.empId);
          const safeLeaveType = window.PinThipSafe.safeText(item.leaveType);
          const safeReason = window.PinThipSafe.safeText(item.reason);
          html += `
            <div class="history-item">
              <b>👤 ${safeEmpName} (${safeEmpId})</b> | ประเภท: <b>${safeLeaveType}</b><br>
              📅 วันที่ลา: ${window.PinThipSafe.safeText(item.startDate)} ถึง ${window.PinThipSafe.safeText(item.endDate)}<br>
              💬 เหตุผล: ${safeReason}<br><br>
              <div style="display:flex; gap:8px; align-items:center;">
                <select id="editLeaveStatus_${item.key}" style="margin:0; padding:6px; font-size:13px; font-weight:bold;">
                  <option value="อนุมัติแล้ว 🟢" ${statusStr.includes('อนุมัติแล้ว') ? 'selected' : ''}>🟢 อนุมัติแล้ว</option>
                  <option value="ไม่อนุมัติ 🔴" ${statusStr.includes('ไม่อนุมัติ') ? 'selected' : ''}>🔴 ไม่อนุมัติ</option>
                  <option value="รออนุมัติ ⏳" ${statusStr.includes('รออนุมัติ') ? 'selected' : ''}>⏳ รออนุมัติ</option>
                </select>
                <button onclick="adminUpdateLeaveStatus('${item.key}')" style="width:auto; margin:0; padding:6px 10px; font-size:12px; background:#0d6efd;">อัปเดต</button>
                <button onclick="adminDeleteLeave('${item.key}', '${item.empName}')" style="width:auto; margin:0; padding:6px 10px; font-size:12px; background:#dc3545;">ลบ</button>
              </div>
            </div>
          `;
        });
      }
      container.innerHTML = html;
    }, (err) => {
      console.error('Leave history load failed:', err);
      container.innerHTML = '';
      if (window.PinThipSafe?.ui?.showAsyncError) {
        window.PinThipSafe.ui.showAsyncError('leaveHistoryContainer', {
          message: 'ไม่สามารถโหลดประวัติการลาได้',
          detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
          retryFn: renderLeaveHistoryList
        });
      }
    });
  }

  function exportLeaveHistoryExcel() {
    if (!currentLeaveFilteredList || currentLeaveFilteredList.length === 0) {
      PinThipSafe.modal.warning('ไม่มีข้อมูลสำหรับส่งออกเป็น Excel');
      return;
    }
    const startDate = document.getElementById('leaveStartDate')?.value;
    const endDate = document.getElementById('leaveEndDate')?.value;

    const rows = [
      ['รหัสพนักงาน', 'ชื่อพนักงาน', 'ประเภทการลา', 'วันเริ่มต้น', 'วันสิ้นสุด', 'เหตุผล', 'สถานะการลา', 'วันที่ยื่นใบลา']
    ];

    currentLeaveFilteredList.forEach((item) => {
      rows.push([
        item.empId,
        item.empName,
        item.leaveType,
        item.startDate,
        item.endDate,
        item.reason,
        item.status || 'รออนุมัติ',
        item.applyDate || ''
      ]);
    });

    window.downloadCSV(`Leave_History_${startDate}_to_${endDate}.csv`, rows);
  }

  function adminUpdateLeaveStatus(key) {
    const newStatus = document.getElementById(`editLeaveStatus_${key}`)?.value;
    window.db.ref('leaves/' + key).update({ status: newStatus }, (err) => {
      if (!err) {
        window.showModal('🎉 สำเร็จ', 'อัปเดตสถานะใบลาเรียบร้อย', '<button class="btn-ok" onclick="closeModal(); renderLeaveHistoryList();">ตกลง</button>');
      }
    });
  }

  function adminDeleteLeave(key, empName) {
    window.showModal('❓ ยืนยันการลบ', `ต้องการลบใบลาของ (${empName}) ใช่หรือไม่?`,
      `<button class="btn-yes" onclick="executeAdminDeleteLeave('${key}')">ใช่, ลบ</button><button class="btn-no" onclick="closeModal()">ยกเลิก</button>`
    );
  }

  function executeAdminDeleteLeave(key) {
    window.db.ref('leaves/' + key).remove((_err) => {
      window.closeModal();
      window.renderLeaveHistoryList();
    });
  }

  function showAdminLogsHistory() {
    window.isAdmin = true;
    const mainCard = document.getElementById('mainCard');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bellBtn = document.getElementById('bellBtn');
    const pageTitle = document.getElementById('pageTitle');
    const listBox = document.getElementById('listBox');

    if (mainCard) mainCard.classList.add('admin-wide');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';
    if (bellBtn) bellBtn.style.display = 'block';
    if (pageTitle) pageTitle.innerText = '📜 ดูการลงเวลาทำงานย้อนหลัง';
    if (listBox) listBox.style.display = 'none';

    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);

    const html = `
      <h2>📜 รายการลงเวลางานย้อนหลัง</h2>
      <div style="background:#eef2f5; padding:12px; border-radius:10px; margin-bottom:15px; text-align:left;">
        <b>📅 เลือกช่วงเวลาตรวจสอบ:</b>
        <div style="display:flex; gap:10px; margin-top:5px;">
          <div style="flex:1;">
            <span style="font-size:12px; color:#555;">จากวันที่:</span>
            <input type="date" id="logStartDate" value="${todayStr}" onchange="renderLogHistoryList()" style="font-weight:bold; margin:2px 0 0 0;">
          </div>
          <div style="flex:1;">
            <span style="font-size:12px; color:#555;">ถึงวันที่:</span>
            <input type="date" id="logEndDate" value="${todayStr}" onchange="renderLogHistoryList()" style="font-weight:bold; margin:2px 0 0 0;">
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn-blue" onclick="setLogDateToday()" style="margin:0; padding:8px; font-size:13px; flex:1;">📌 ดูเฉพาะวันนี้</button>
          <button class="btn-excel" onclick="exportLogHistoryExcel()" style="margin:0; padding:8px; font-size:13px; flex:1;">📥 ส่งออกข้อมูลเป็น Excel</button>
        </div>
      </div>
      <div id="logHistoryContainer"></div>
      <button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดสบอร์ด</button>
    `;

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
    window.renderLogHistoryList();
  }

  function setLogDateToday() {
    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);
    const startDate = document.getElementById('logStartDate');
    const endDate = document.getElementById('logEndDate');
    if (startDate) startDate.value = todayStr;
    if (endDate) endDate.value = todayStr;
    window.renderLogHistoryList();
  }

  let currentLogFilteredList = [];

  function renderLogHistoryList() {
    const startDate = document.getElementById('logStartDate')?.value;
    const endDate = document.getElementById('logEndDate')?.value;
    const container = document.getElementById('logHistoryContainer');
    if (!container || !startDate || !endDate) return;

    container.innerHTML = (typeof createLoadingHTML === 'function') ? createLoadingHTML() : 'กำลังโหลด...';

    window.PinThipSafe.logsRepo.fetchLogsForRange(window.db, startDate, endDate).then((logsObj) => {
      const list = Object.keys(logsObj).map((k) => logsObj[k]);

      currentLogFilteredList = list.filter((item) => item.date && item.date >= startDate && item.date <= endDate);

      let html = `
        <div style="background: linear-gradient(135deg, #0dcaf0, #0d6efd); color: white; padding: 12px; border-radius: 10px; margin-bottom: 15px; text-align: left; font-size: 14px;">
          <b>📊 สรุปประวัติการลงเวลาช่วงวันที่ ${startDate} ถึง ${endDate}:</b><br>
          📋 พบทั้งหมด: <b>${currentLogFilteredList.length} รายการ</b>
        </div>
      `;

      if (currentLogFilteredList.length === 0) {
        html += '<div style="color:#888; margin:20px 0;">ไม่มีประวัติการลงเวลาในช่วงเวลาดังกล่าว</div>';
      } else {
        currentLogFilteredList.slice().reverse().forEach((item) => {
          html += `
            <div class="history-item">
              📅 วันที่: ${window.PinThipSafe.safeText(item.date)} | ⏰ เวลา: ${window.PinThipSafe.safeText(item.time)} น.<br>
              <b>👤 ${window.PinThipSafe.safeText(item.empName)} (${window.PinThipSafe.safeText(item.empId)})</b> (${window.PinThipSafe.safeText(item.type)})<br>
              📍 สถานที่: ${window.PinThipSafe.safeText(item.nearestLocation || '-')}
            </div>
          `;
        });
      }
      container.innerHTML = html;
    }).catch((err) => {
      console.error('Log history load failed:', err);
      container.innerHTML = '';
      if (window.PinThipSafe?.ui?.showAsyncError) {
        window.PinThipSafe.ui.showAsyncError('logHistoryContainer', {
          message: 'ไม่สามารถโหลดประวัติการลงเวลาได้',
          detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
          retryFn: renderLogHistoryList
        });
      }
    });
  }

  function exportLogHistoryExcel() {
    if (!currentLogFilteredList || currentLogFilteredList.length === 0) {
      PinThipSafe.modal.warning('ไม่มีข้อมูลสำหรับส่งออกเป็น Excel');
      return;
    }
    const startDate = document.getElementById('logStartDate')?.value;
    const endDate = document.getElementById('logEndDate')?.value;

    const rows = [
      ['รหัสพนักงาน', 'ชื่อพนักงาน', 'ประเภท', 'วันที่', 'เวลา', 'สถานที่เช็กอิน', 'ระยะทาง (ม.)']
    ];

    currentLogFilteredList.forEach((item) => {
      rows.push([
        item.empId,
        item.empName,
        item.type,
        item.date,
        item.time,
        item.nearestLocation || '-',
        item.distance || 0
      ]);
    });

    window.downloadCSV(`Checkin_History_${startDate}_to_${endDate}.csv`, rows);
  }

  function showDailyPayroll() {
    window.isAdmin = true;
    const mainCard = document.getElementById('mainCard');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bellBtn = document.getElementById('bellBtn');
    const pageTitle = document.getElementById('pageTitle');
    const listBox = document.getElementById('listBox');

    if (mainCard) mainCard.classList.add('admin-wide');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';
    if (bellBtn) bellBtn.style.display = 'block';
    if (pageTitle) pageTitle.innerText = '💵 สรุปค่าแรง & ค่าใช้จ่ายรายบุคคล';
    if (listBox) listBox.style.display = 'none';

    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);

    const html = `
      <div style="background:#eef2f5; padding:12px; border-radius:10px; margin-bottom:15px; text-align:left;">
        <b>📅 เลือกช่วงเวลาตรวจสอบ:</b>
        <div style="display:flex; gap:10px; margin-top:5px;">
          <div style="flex:1;">
            <span style="font-size:12px; color:#555;">จากวันที่:</span>
            <input type="date" id="payrollStartDate" value="${todayStr}" onchange="renderDailyPayrollData()" style="font-weight:bold; margin:2px 0 0 0;">
          </div>
          <div style="flex:1;">
            <span style="font-size:12px; color:#555;">ถึงวันที่:</span>
            <input type="date" id="payrollEndDate" value="${todayStr}" onchange="renderDailyPayrollData()" style="font-weight:bold; margin:2px 0 0 0;">
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn-blue" onclick="setPayrollDateToday()" style="margin:0; padding:8px; font-size:13px; flex:1;">📌 ดูเฉพาะวันนี้</button>
          <button class="btn-excel" onclick="exportPayrollExcel()" style="margin:0; padding:8px; font-size:13px; flex:1;">📥 ส่งออกข้อมูลเป็น Excel</button>
        </div>
      </div>
      <div id="dailyPayrollResultContainer"></div>
      <button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดสบอร์ด</button>
    `;

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
    window.renderDailyPayrollData();
  }

  function setPayrollDateToday() {
    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);
    const startDate = document.getElementById('payrollStartDate');
    const endDate = document.getElementById('payrollEndDate');
    if (startDate) startDate.value = todayStr;
    if (endDate) endDate.value = todayStr;
    window.renderDailyPayrollData();
  }

  let currentPayrollDataCache = { salaryList: [], fuelList: [], repairList: [], salaryTotal: 0, fuelTotal: 0, repairTotal: 0, employeeData: {} };

  function renderDailyPayrollData() {
    const startDate = document.getElementById('payrollStartDate')?.value;
    const endDate = document.getElementById('payrollEndDate')?.value;
    const container = document.getElementById('dailyPayrollResultContainer');
    if (!container || !startDate || !endDate) return;

    container.innerHTML = (typeof createLoadingHTML === 'function') ? createLoadingHTML() : 'กำลังโหลด...';

    window.db.ref('employees').once('value', (empSnap) => {
      const employeesObj = empSnap.val() || {};

      window.PinThipSafe.logsRepo.fetchLogsForRange(window.db, startDate, endDate).then((logsObj) => {
        const attendanceByEmployeeDate = new Map();

        Object.keys(logsObj).forEach((k) => {
          const log = logsObj[k];
          if (log.date >= startDate && log.date <= endDate && log.type === 'เข้างาน') {
            const employee = Object.values(employeesObj).find((emp) => String(emp.empId) === String(log.empId));
            if (!employee) return;

            const attendanceKey = `${employee.empId}|${log.date}`;
            const existing = attendanceByEmployeeDate.get(attendanceKey);
            if (!existing || String(log.time || '') < String(existing.time || '')) {
              attendanceByEmployeeDate.set(attendanceKey, { name: log.empName, id: log.empId, date: log.date, time: log.time, rate: Number(employee.dailyRate || 0) });
            }
          }
        });

        const presentList = Array.from(attendanceByEmployeeDate.values());
        const salaryTotal = presentList.reduce((total, item) => total + item.rate, 0);

        window.db.ref('fuel_requests').once('value', (fuelSnap) => {
          const fuelObj = fuelSnap.val() || {};
          let fuelOnlyTotal = 0;
          let repairOnlyTotal = 0;
          const fuelList = [];
          const repairList = [];

          Object.keys(fuelObj).forEach((k) => {
            const f = fuelObj[k];
            const statusStr = String(f.status || '');
            const reqType = f.requestType || 'เบิกค่าน้ำมัน';
            if (f.date >= startDate && f.date <= endDate && statusStr.includes('อนุมัติแล้ว')) {
              const amt = Number(f.amount || 0);
              if (reqType.includes('ซ่อม')) {
                repairOnlyTotal += amt;
                repairList.push({ name: f.empName, empId: f.empId, type: reqType, date: f.date, plate: f.carPlate || '-', route: f.route || '-', amount: amt });
              } else {
                fuelOnlyTotal += amt;
                fuelList.push({ name: f.empName, empId: f.empId, type: reqType, date: f.date, plate: f.carPlate || '-', route: f.route || '-', amount: amt });
              }
            }
          });

          // จัดกลุ่มข้อมูลตามพนักงาน
          const employeeData = {};
          
          // เพิ่มข้อมูลค่าแรง
          presentList.forEach((item) => {
            if (!employeeData[item.id]) {
              employeeData[item.id] = {
                empId: item.id,
                empName: item.name,
                salary: { total: 0, days: 0, list: [] },
                fuel: { total: 0, count: 0, list: [] },
                repair: { total: 0, count: 0, list: [] },
                grandTotal: 0
              };
            }
            employeeData[item.id].salary.total += item.rate;
            employeeData[item.id].salary.days += 1;
            employeeData[item.id].salary.list.push(item);
          });

          // เพิ่มข้อมูลค่าน้ำมัน
          fuelList.forEach((item) => {
            const empId = item.empId || 'unknown';
            if (!employeeData[empId]) {
              employeeData[empId] = {
                empId: empId,
                empName: item.name,
                salary: { total: 0, days: 0, list: [] },
                fuel: { total: 0, count: 0, list: [] },
                repair: { total: 0, count: 0, list: [] },
                grandTotal: 0
              };
            }
            employeeData[empId].fuel.total += item.amount;
            employeeData[empId].fuel.count += 1;
            employeeData[empId].fuel.list.push(item);
          });

          // เพิ่มข้อมูลค่าซ่อม
          repairList.forEach((item) => {
            const empId = item.empId || 'unknown';
            if (!employeeData[empId]) {
              employeeData[empId] = {
                empId: empId,
                empName: item.name,
                salary: { total: 0, days: 0, list: [] },
                fuel: { total: 0, count: 0, list: [] },
                repair: { total: 0, count: 0, list: [] },
                grandTotal: 0
              };
            }
            employeeData[empId].repair.total += item.amount;
            employeeData[empId].repair.count += 1;
            employeeData[empId].repair.list.push(item);
          });

          // คำนวณยอดรวมของแต่ละคน
          Object.keys(employeeData).forEach((empId) => {
            const emp = employeeData[empId];
            emp.grandTotal = emp.salary.total + emp.fuel.total + emp.repair.total;
          });

          currentPayrollDataCache = { 
            salaryList: presentList, 
            fuelList, 
            repairList, 
            salaryTotal, 
            fuelTotal: fuelOnlyTotal, 
            repairTotal: repairOnlyTotal,
            employeeData 
          };

          const grandTotal = salaryTotal + fuelOnlyTotal + repairOnlyTotal;
          
          // สร้าง HTML แบบใหม่ (Modern Dashboard Style - ใช้ Unicode Icons)
          let html = `
            <!-- Modern Page Header -->
            <div class="modern-payroll-header">
              <div class="payroll-header-left">
                <h2 class="payroll-page-title">📊 สรุปภาพรวมค่าใช้จ่าย</h2>
                <p class="payroll-date-range">${startDate} ถึง ${endDate}</p>
              </div>
            </div>

            <!-- Modern Stats Grid -->
            <div class="modern-stats-grid">
              <!-- Card 1: ค่าแรง -->
              <div class="modern-stat-card card-salary">
                <div class="stat-card-header">
                  <div class="stat-icon-wrapper stat-icon-salary">
                    <span class="stat-icon-text">👥</span>
                  </div>
                  <div class="stat-trend stat-trend-neutral">
                    <span class="trend-value">${presentList.length} วัน</span>
                  </div>
                </div>
                <div class="stat-card-body">
                  <h3 class="stat-label">ค่าแรงรวม</h3>
                  <div class="stat-value">${salaryTotal.toLocaleString()} <span class="stat-currency">฿</span></div>
                  <p class="stat-meta">${Object.values(employeeData).filter(e => e.salary.days > 0).length} พนักงาน</p>
                </div>
              </div>

              <!-- Card 2: ค่าน้ำมัน -->
              <div class="modern-stat-card card-fuel">
                <div class="stat-card-header">
                  <div class="stat-icon-wrapper stat-icon-fuel">
                    <span class="stat-icon-text">⛽</span>
                  </div>
                  <div class="stat-trend stat-trend-neutral">
                    <span class="trend-value">${fuelList.length} รายการ</span>
                  </div>
                </div>
                <div class="stat-card-body">
                  <h3 class="stat-label">ค่าน้ำมัน</h3>
                  <div class="stat-value">${fuelOnlyTotal.toLocaleString()} <span class="stat-currency">฿</span></div>
                  <p class="stat-meta">${Object.values(employeeData).filter(e => e.fuel.count > 0).length} พนักงาน</p>
                </div>
              </div>

              <!-- Card 3: ค่าซ่อม -->
              <div class="modern-stat-card card-repair">
                <div class="stat-card-header">
                  <div class="stat-icon-wrapper stat-icon-repair">
                    <span class="stat-icon-text">🔧</span>
                  </div>
                  <div class="stat-trend stat-trend-neutral">
                    <span class="trend-value">${repairList.length} รายการ</span>
                  </div>
                </div>
                <div class="stat-card-body">
                  <h3 class="stat-label">ค่าซ่อม</h3>
                  <div class="stat-value">${repairOnlyTotal.toLocaleString()} <span class="stat-currency">฿</span></div>
                  <p class="stat-meta">${Object.values(employeeData).filter(e => e.repair.count > 0).length} พนักงาน</p>
                </div>
              </div>

              <!-- Card 4: รวมทั้งหมด -->
              <div class="modern-stat-card card-total">
                <div class="stat-card-header">
                  <div class="stat-icon-wrapper stat-icon-total">
                    <span class="stat-icon-text">💰</span>
                  </div>
                  <div class="stat-trend stat-trend-up">
                    <span class="trend-value">100%</span>
                  </div>
                </div>
                <div class="stat-card-body">
                  <h3 class="stat-label">ยอดรวมทั้งหมด</h3>
                  <div class="stat-value stat-value-large">${grandTotal.toLocaleString()} <span class="stat-currency">฿</span></div>
                  <p class="stat-meta">${Object.keys(employeeData).length} พนักงานทั้งหมด</p>
                </div>
              </div>
            </div>
          `;

          // แสดงรายละเอียดรายบุคคล
          const employeeList = Object.values(employeeData).sort((a, b) => b.grandTotal - a.grandTotal);
          
          if (employeeList.length === 0) {
            html += '<div style="text-align:center; color:#888; padding: 40px 20px; background:#f8f9fa; border-radius:10px;">ไม่มีข้อมูลในช่วงเวลานี้</div>';
          } else {
            html += `<div style="font-weight:bold; margin-bottom:12px; font-size:14px;">👥 รายละเอียดรายบุคคล (${employeeList.length} คน)</div>`;
            html += window.renderEmployeePayrollCards(employeeList);
          }

          container.innerHTML = html;
        }, (fuelErr) => {
          console.error('Daily payroll fuel load failed:', fuelErr);
          container.innerHTML = '';
          if (window.PinThipSafe?.ui?.showAsyncError) {
            window.PinThipSafe.ui.showAsyncError('dailyPayrollResultContainer', {
              message: 'ไม่สามารถโหลดรายการเบิกจ่ายสำหรับสรุปค่าแรงได้',
              detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
              retryFn: renderDailyPayrollData
            });
          }
        });
      }).catch((logsErr) => {
        console.error('Daily payroll logs load failed:', logsErr);
        container.innerHTML = '';
        if (window.PinThipSafe?.ui?.showAsyncError) {
          window.PinThipSafe.ui.showAsyncError('dailyPayrollResultContainer', {
            message: 'ไม่สามารถโหลดข้อมูลการลงเวลาสำหรับสรุปค่าแรงได้',
            detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
            retryFn: renderDailyPayrollData
          });
        }
      });
    }, (empErr) => {
      console.error('Daily payroll employees load failed:', empErr);
      container.innerHTML = '';
      if (window.PinThipSafe?.ui?.showAsyncError) {
        window.PinThipSafe.ui.showAsyncError('dailyPayrollResultContainer', {
          message: 'ไม่สามารถโหลดข้อมูลพนักงานสำหรับสรุปค่าแรงได้',
          detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
          retryFn: renderDailyPayrollData
        });
      }
    });
  }

  function exportPayrollExcel() {
    const startDate = document.getElementById('payrollStartDate')?.value;
    const endDate = document.getElementById('payrollEndDate')?.value;

    const rows = [
      ['=== สรุปค่าแรงพนักงานมาทำงาน ==='],
      ['วันที่', 'รหัสพนักงาน', 'ชื่อพนักงาน', 'เวลาเข้างาน', 'ค่าแรง (บาท)']
    ];

    currentPayrollDataCache.salaryList.forEach((p) => {
      rows.push([p.date, p.id, p.name, p.time, p.rate]);
    });

    rows.push([]);
    rows.push(['=== สรุปรายการเบิกค่าน้ำมัน (อนุมัติแล้ว) ==='], ['วันที่', 'ชื่อพนักงาน', 'ประเภทการเบิก', 'ทะเบียนรถ', 'รายละเอียด', 'ยอดเงินอนุมัติ (บาท)']);
    currentPayrollDataCache.fuelList.forEach((f) => {
      rows.push([f.date, f.name, f.type, f.plate, f.route, f.amount]);
    });

    rows.push([]);
    rows.push(['=== สรุปรายการเบิกค่าซ่อมรถ (อนุมัติแล้ว) ==='], ['วันที่', 'ชื่อพนักงาน', 'ประเภทการเบิก', 'ทะเบียนรถ', 'รายละเอียด', 'ยอดเงินอนุมัติ (บาท)']);
    currentPayrollDataCache.repairList.forEach((r) => {
      rows.push([r.date, r.name, r.type, r.plate, r.route, r.amount]);
    });

    rows.push([]);
    rows.push(['รวมค่าแรงทั้งหมด', '', '', '', '', currentPayrollDataCache.salaryTotal]);
    rows.push(['รวมค่าน้ำมันทั้งหมด', '', '', '', '', currentPayrollDataCache.fuelTotal]);
    rows.push(['รวมค่าซ่อมรถทั้งหมด', '', '', '', '', currentPayrollDataCache.repairTotal]);
    rows.push(['รวมจ่ายออกทั้งหมดสุทธิ', '', '', '', '', currentPayrollDataCache.salaryTotal + currentPayrollDataCache.fuelTotal + currentPayrollDataCache.repairTotal]);

    window.downloadCSV(`Daily_Payroll_Summary_${startDate}_to_${endDate}.csv`, rows);
  }

  function showAnalyticsReport() {
    window.isAdmin = true;
    const mainCard = document.getElementById('mainCard');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bellBtn = document.getElementById('bellBtn');
    const pageTitle = document.getElementById('pageTitle');
    const listBox = document.getElementById('listBox');

    if (mainCard) mainCard.classList.add('admin-wide');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';
    if (bellBtn) bellBtn.style.display = 'block';
    if (pageTitle) pageTitle.innerText = '📈 สรุปค่าใช้จ่ายประจำเดือน';
    if (listBox) listBox.style.display = 'none';

    const nowYM = new Date().toISOString().substring(0, 7);
    const html = `
      <div style="background:#eef2f5; padding:12px; border-radius:10px; margin-bottom:15px; text-align:left;">
        <b>📅 เลือกเดือนที่ต้องการสรุป:</b> <input type="month" id="repMonth" value="${nowYM}" onchange="renderMonthlySummary()" style="margin-top:5px; font-weight:bold;">
        <div style="margin-top:10px;">
          <button class="btn-excel" onclick="exportMonthlyExcel()" style="padding:10px; font-size:14px;">📥 ส่งออกข้อมูลสรุปประจำเดือนเป็น Excel</button>
        </div>
      </div>
      <div id="repResult"></div>
      <button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดสบอร์ด</button>
    `;

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
    window.renderMonthlySummary();
  }

  let currentMonthlyCache = { ym: '', totalSalary: 0, totalFuel: 0, totalRepair: 0 };

  function renderMonthlySummary() {
    const ym = document.getElementById('repMonth')?.value;
    currentMonthlyCache.ym = ym;

    window.db.ref('employees').once('value', (empSnap) => {
      const empObj = empSnap.val() || {};
      window.PinThipSafe.logsRepo.fetchLogsForMonth(window.db, ym).then((logObj) => {
        window.db.ref('fuel_requests').once('value', (fuelSnap) => {
          const fuelObj = fuelSnap.val() || {};

            const attendanceDaysByEmployee = new Map();
          let totalFuel = 0;
          let totalRepair = 0;

          Object.keys(empObj).forEach((ek) => {
            const emp = empObj[ek];
              const employeeDates = new Set();
            Object.keys(logObj).forEach((lk) => {
              const l = logObj[lk];
                if (String(l.empId) === String(emp.empId) && l.date && l.date.startsWith(ym) && l.type === 'เข้างาน') employeeDates.add(l.date);
            });
              attendanceDaysByEmployee.set(String(emp.empId), { dates: employeeDates, rate: Number(emp.dailyRate || 0) });
          });

            const totalSalary = Array.from(attendanceDaysByEmployee.values()).reduce((total, item) => total + item.dates.size * item.rate, 0);

          Object.keys(fuelObj).forEach((fk) => {
            const f = fuelObj[fk];
            const statusStr = String(f.status || '');
            const reqType = f.requestType || 'เบิกค่าน้ำมัน';
              if (f.date && f.date.startsWith(ym) && statusStr.includes('อนุมัติแล้ว')) {
              const amt = Number(f.amount || 0);
              if (reqType.includes('ซ่อม')) {
                totalRepair += amt;
              } else {
                totalFuel += amt;
              }
            }
          });

          currentMonthlyCache.totalSalary = totalSalary;
          currentMonthlyCache.totalFuel = totalFuel;
          currentMonthlyCache.totalRepair = totalRepair;

          const repResult = document.getElementById('repResult');
          if (repResult) {
            repResult.innerHTML = `
              <div class="history-item">
                📅 ประจำเดือน: <b>${ym}</b><br><br>
                💵 ค่าแรงพนักงานรวม: <b style="color:#28a745; font-size:15px;">${totalSalary.toLocaleString()} บาท</b><br>
                ⛽ ค่าน้ำมันรถรวม (อนุมัติแล้ว): <b style="color:#e67e22; font-size:15px;">${totalFuel.toLocaleString()} บาท</b><br>
                🔧 ค่าซ่อมรถรวม (อนุมัติแล้ว): <b style="color:#d9534f; font-size:15px;">${totalRepair.toLocaleString()} บาท</b><br>
                <hr style="border:0; border-top:1px solid #ddd; margin:10px 0;">
                💰 <b>ค่าใช้จ่ายบริษัทรวมทั้งหมด: <span style="font-size:18px; color:#d9534f;">${(totalSalary + totalFuel + totalRepair).toLocaleString()} บาท</span></b>
              </div>
            `;
          }
        }, (fuelErr) => {
          console.error('Monthly fuel load failed:', fuelErr);
          showMonthlyLoadError('ไม่สามารถโหลดรายการเบิกจ่ายสำหรับสรุปรายเดือนได้', fuelErr);
        });
      }).catch((logsErr) => {
        console.error('Monthly logs load failed:', logsErr);
        showMonthlyLoadError('ไม่สามารถโหลดข้อมูลการลงเวลาสำหรับสรุปรายเดือนได้', logsErr);
      });
    }, (empErr) => {
      console.error('Monthly employees load failed:', empErr);
      showMonthlyLoadError('ไม่สามารถโหลดข้อมูลพนักงานสำหรับสรุปรายเดือนได้', empErr);
    });
  }

  function showMonthlyLoadError(message, err) {
    const repResult = document.getElementById('repResult');
    if (repResult) repResult.innerHTML = '';
    if (window.PinThipSafe?.ui?.showAsyncError) {
      window.PinThipSafe.ui.showAsyncError('repResult', {
        message,
        detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
        retryFn: renderMonthlySummary
      });
    }
    console.error('Monthly summary load failed:', err);
  }

  function exportMonthlyExcel() {
    const ym = currentMonthlyCache.ym;
    const rows = [
      ['รายงานสรุปค่าใช้จ่ายประจำเดือน', ym],
      [],
      ['รายการค่าใช้จ่าย', 'จำนวนเงินรวม (บาท)'],
      ['ค่าแรงพนักงานรวม', currentMonthlyCache.totalSalary],
      ['ค่าน้ำมันรถ (อนุมัติแล้ว)', currentMonthlyCache.totalFuel],
      ['ค่าซ่อมรถ / ค่าอะไหล่ (อนุมัติแล้ว)', currentMonthlyCache.totalRepair],
      ['ค่าใช้จ่ายบริษัทรวมทั้งหมดสุทธิ', currentMonthlyCache.totalSalary + currentMonthlyCache.totalFuel + currentMonthlyCache.totalRepair]
    ];

    window.downloadCSV(`Monthly_Expense_Summary_${ym}.csv`, rows);
  }

  function showEmpManagement() {
    window.isAdmin = true;
    const mainCard = document.getElementById('mainCard');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bellBtn = document.getElementById('bellBtn');
    const listBox = document.getElementById('listBox');
    const status = document.getElementById('status');

    if (mainCard) mainCard.classList.add('admin-wide');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';
    if (bellBtn) bellBtn.style.display = 'block';
    if (listBox) listBox.style.display = 'none';
    if (status) status.innerHTML = (typeof createLoadingHTML === 'function') ? createLoadingHTML() : 'กำลังโหลด...';

    window.db.ref('settings/globalLateTime').once('value', (settingsSnap) => {
      const globalLateTime = settingsSnap.val() || '08:00';

      window.db.ref('employees').once('value', (empSnap) => {
        if (status) status.innerHTML = '';
        const employeesObj = empSnap.val() || {};
        const empList = Object.keys(employeesObj).map((k) => ({ key: k, ...employeesObj[k] }));

        let html = `
          <h2>⚙️ จัดการพนักงาน & กำหนดเวลาเข้างาน</h2>
          <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border: 2px dashed #0d6efd; padding: 15px; border-radius: 12px; margin-bottom: 20px; text-align: left;">
            <b>⏰ ตั้งค่าเวลาเข้างานกลาง (สำหรับพนักงานทุกคน):</b>
            <div style="display: flex; gap: 10px; margin-top: 8px; align-items: center;">
              <input type="time" id="globalLateInput" value="${globalLateTime}" style="margin:0; font-weight:bold; font-size:16px;">
              <button class="btn-blue" onclick="saveGlobalLateTime()" style="width: auto; margin: 0; padding: 12px 20px;">💾 บันทึกเวลาส่วนกลาง</button>
            </div>
          </div>
          <button class="btn-blue" onclick="showAddEmpModal()">➕ เพิ่มพนักงานใหม่</button>
        `;

        if (empList.length === 0) {
          html += '<div style="color:#888; margin-top:15px;">ยังไม่มีข้อมูลพนักงาน</div>';
        } else {
          html += '<h3>📋 รายชื่อพนักงานทั้งหมด:</h3>';
          empList.forEach((emp) => {
            const driverBadge = emp.isDriver ? '🚚 <b style="color:#e67e22;">พนักงานขับรถ</b>' : '👤 พนักงานทั่วไป';
            const foamBadge = emp.canSendFoamLabels ? ' 📦 <b style="color:#0d6efd;">ส่งลังโฟม</b>' : '';
            const safeEmpName = window.PinThipSafe.safeText(emp.empName);
            const safeEmpId = window.PinThipSafe.safeText(emp.empId);
            html += `
              <div class="history-item" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                  <b>👤 ${safeEmpName}</b> (${safeEmpId})<br>
                  🔑 PIN: ${emp.pin ? '••••' : '—'} | ค่าแรง: ${emp.dailyRate || 0} บาท | ${driverBadge}${foamBadge}
                </div>
                <div style="display:flex; gap:5px;">
                  <button class="btn-blue" style="width:auto; margin:0; padding:6px 12px; font-size:12px;" onclick="showEditEmpModal('${window.PinThipSafe.safeText(emp.key)}', '${safeEmpId}', '${safeEmpName}', '', '${emp.dailyRate || 0}', ${emp.isDriver || false}, ${emp.canSendFoamLabels || false})">✏️</button>
                  <button class="btn-danger" style="width:auto; margin:0; padding:6px 12px; font-size:12px;" onclick="confirmDeleteEmp('${window.PinThipSafe.safeText(emp.key)}', '${safeEmpName}')">🗑️</button>
                </div>
              </div>
            `;
          });
        }

        html += '<button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดสบอร์ด</button>';
        const mainContent = document.getElementById('mainContent');
        if (mainContent) mainContent.innerHTML = html;
      }, (empErr) => {
        console.error('Employee list load failed:', empErr);
        if (status) status.innerHTML = '';
        if (window.PinThipSafe?.ui?.showAsyncError) {
          window.PinThipSafe.ui.showAsyncError('mainContent', {
            message: 'ไม่สามารถโหลดรายชื่อพนักงานได้',
            detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
            retryFn: showEmpManagement
          });
        }
      });
    }, (settingsErr) => {
      console.error('Employee settings load failed:', settingsErr);
      if (status) status.innerHTML = '';
      if (window.PinThipSafe?.ui?.showAsyncError) {
        window.PinThipSafe.ui.showAsyncError('mainContent', {
          message: 'ไม่สามารถโหลดการตั้งค่าเวลาทำงานได้',
          detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
          retryFn: showEmpManagement
        });
      }
    });
  }

  function saveGlobalLateTime() {
    const val = document.getElementById('globalLateInput')?.value.trim();
    if (!val) {
      PinThipSafe.modal.warning('กรุณาระบุเวลาให้ถูกต้อง');
      return;
    }

    window.db.ref('settings/globalLateTime').set(val, (err) => {
      if (!err) {
        window.showModal('🎉 สำเร็จ', `บันทึกเวลาเข้างานกลาง (${val} น.) เรียบร้อย\nมีผลกับพนักงานทุกคนในระบบ`, '<button class="btn-ok" onclick="closeModal(); showEmpManagement();">ตกลง</button>');
      }
    });
  }

  function showAddEmpModal() {
    const html = `
      <div class="user-banner">➕ เพิ่มพนักงานใหม่ในระบบ</div>
      <input type="text" id="newEmpId" placeholder="รหัสพนักงาน (4 หลัก)" maxlength="5">
      <input type="text" id="newEmpName" placeholder="ชื่อ-นามสกุล">
      <input type="password" id="newEmpPin" placeholder="รหัส PIN (4 หลัก)" maxlength="4">
      <input type="number" id="newEmpRate" placeholder="ค่าแรงต่อวัน (บาท)">
      <label style="display:flex; align-items:center; gap:8px; margin:10px 0; text-align:left; font-weight:bold;">
        <input type="checkbox" id="newEmpDriver" style="width:20px; height:20px; margin:0;"> เป็นพนักงานขับรถ (มีสิทธิ์เบิกน้ำมัน/ค่าซ่อม)
      </label>
      <label style="display:flex; align-items:center; gap:8px; margin:10px 0; text-align:left; font-weight:bold;">
        <input type="checkbox" id="newEmpFoamLabels" style="width:20px; height:20px; margin:0;"> มีสิทธิ์ใช้งานระบบส่งลังโฟม (เห็นเมนูส่งลังโฟม & รายชื่อลูกค้าทั้งหมด)
      </label>
      <button class="btn-blue" onclick="submitAddEmp()">💾 บันทึกพนักงาน</button>
      <button class="btn-back" onclick="showEmpManagement()">⬅️ ย้อนกลับ</button>
    `;
    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
  }

  function submitAddEmp() {
    const id = document.getElementById('newEmpId')?.value.trim();
    const name = document.getElementById('newEmpName')?.value.trim();
    const pin = document.getElementById('newEmpPin')?.value.trim();
    const rate = document.getElementById('newEmpRate')?.value.trim();
    const isDriver = document.getElementById('newEmpDriver')?.checked;
    const canSendFoamLabels = document.getElementById('newEmpFoamLabels')?.checked;

    if (!id || !name || !pin || !rate) {
      PinThipSafe.modal.warning('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    window.db.ref('employees').once('value', (snapshot) => {
      const employeesObj = snapshot.val() || {};
      let isIdDuplicate = false;
      Object.keys(employeesObj).forEach((k) => {
        if (String(employeesObj[k].empId) === String(id)) isIdDuplicate = true;
      });

      if (isIdDuplicate) {
        window.showModal('🚫 แจ้งเตือน', `⚠️ รหัสพนักงาน "${id}" นี้มีในระบบแล้ว!`, null, '<button class="btn-ok" onclick="closeModal()">ตกลง</button>');
        return;
      }

      const newRef = window.db.ref('employees').push();
      newRef.set({
        empId: id,
        empName: name,
        pin,
        dailyRate: Number(rate),
        isDriver,
        canSendFoamLabels
      }, (err) => {
        if (!err) {
          window.showModal('🎉 สำเร็จ', 'เพิ่มพนักงานเรียบร้อย', '<button class="btn-ok" onclick="closeModal(); showEmpManagement();">ตกลง</button>');
        }
      });
    }, (empErr) => {
      console.error('Add employee duplicate-check failed:', empErr);
      PinThipSafe.modal.error('ตรวจสอบรหัสพนักงานซ้ำไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง');
    });
  }

  function showEditEmpModal(key, id, name, pin, rate, isDriver, canSendFoamLabels) {
    const html = `
      <div class="user-banner">✏️ แก้ไขพนักงาน: ${name}</div>
      <input type="hidden" id="editKey" value="${key}">
      <input type="text" id="editEmpIdInput" value="${id}" placeholder="รหัสพนักงาน">
      <input type="text" id="editEmpName" value="${name}" placeholder="ชื่อพนักงาน">
      <input type="password" id="editEmpPin" placeholder="รหัส PIN (เว้นว่างไว้ = ไม่เปลี่ยน)" maxlength="4">
      <input type="number" id="editEmpRate" value="${rate}" placeholder="ค่าแรงต่อวัน">
      <label style="display:flex; align-items:center; gap:8px; margin:10px 0; text-align:left; font-weight:bold;">
        <input type="checkbox" id="editEmpDriver" ${isDriver ? 'checked' : ''} style="width:20px; height:20px; margin:0;"> เป็นพนักงานขับรถ (มีสิทธิ์เบิกน้ำมัน/ค่าซ่อม)
      </label>
      <label style="display:flex; align-items:center; gap:8px; margin:10px 0; text-align:left; font-weight:bold;">
        <input type="checkbox" id="editEmpFoamLabels" ${canSendFoamLabels ? 'checked' : ''} style="width:20px; height:20px; margin:0;"> มีสิทธิ์ใช้งานระบบส่งลังโฟม (เห็นเมนูส่งลังโฟม & รายชื่อลูกค้าทั้งหมด)
      </label>
      <button class="btn-blue" onclick="submitEditEmp()">💾 บันทึกการแก้ไข</button>
      <button class="btn-back" onclick="showEmpManagement()">⬅️ ย้อนกลับ</button>
    `;
    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
  }

  function submitEditEmp() {
    const key = document.getElementById('editKey')?.value;
    const newId = document.getElementById('editEmpIdInput')?.value.trim();
    const name = document.getElementById('editEmpName')?.value.trim();
    const pin = document.getElementById('editEmpPin')?.value.trim();
    const rate = document.getElementById('editEmpRate')?.value.trim();
    const isDriver = document.getElementById('editEmpDriver')?.checked;
    const canSendFoamLabels = document.getElementById('editEmpFoamLabels')?.checked;

    const updateData = {
      empId: newId,
      empName: name,
      dailyRate: Number(rate),
      isDriver,
      canSendFoamLabels
    };

    // Only update PIN if admin provides a new one — otherwise keep existing
    if (pin) {
      updateData.pin = pin;
    }

    window.db.ref('employees/' + key).update(updateData, (err) => {
      if (!err) {
        window.showModal('🎉 สำเร็จ', 'แก้ไขข้อมูลเรียบร้อย', '<button class="btn-ok" onclick="closeModal(); showEmpManagement();">ตกลง</button>');
      }
    });
  }

  function confirmDeleteEmp(key, name) {
    window.showModal('❓ ยืนยันการลบ', `ต้องการลบพนักงาน (${name}) ใช่หรือไม่?`,
      `<button class="btn-yes" onclick="executeDeleteEmp('${key}')">ใช่, ลบ</button><button class="btn-no" onclick="closeModal()">ยกเลิก</button>`
    );
  }

  function executeDeleteEmp(key) {
    window.db.ref('employees/' + key).remove((_err) => {
      window.closeModal();
      window.showEmpManagement();
    });
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.adminOperations = {
    showAdminAttendanceSummaryReport,
    setAttendanceDateToday,
    renderAttendanceSummaryList,
    showLocationManagement,
    addNewLocation,
    showEditLocationModal,
    submitEditLocation,
    deleteLocation,
    executeDeleteLocation,
    showFuelRequestForm,
    handleFuelSubmit,
    showAdminFuelRequests,
    updateFuelStatusWithAmount,
    showAdminFuelHistory,
    loadCarPlatesManagementList,
    addCarPlate,
    deleteCarPlate,
    setFuelDateToday,
    renderFuelHistoryList,
    renderCarExpenseChart,
    exportFuelHistoryExcel,
    showEditFuelModal,
    submitEditFuel,
    confirmDeleteFuel,
    executeDeleteFuel,
    showAdminLeaves,
    updateLeaveStatusAndHide,
    showAdminLeaveHistory,
    setLeaveDateToday,
    renderLeaveHistoryList,
    exportLeaveHistoryExcel,
    adminUpdateLeaveStatus,
    adminDeleteLeave,
    executeAdminDeleteLeave,
    showAdminLogsHistory,
    setLogDateToday,
    renderLogHistoryList,
    exportLogHistoryExcel,
    showDailyPayroll,
    setPayrollDateToday,
    renderDailyPayrollData,
    exportPayrollExcel,
    showAnalyticsReport,
    renderMonthlySummary,
    exportMonthlyExcel,
    showEmpManagement,
    saveGlobalLateTime,
    showAddEmpModal,
    submitAddEmp,
    showEditEmpModal,
    submitEditEmp,
    confirmDeleteEmp,
    executeDeleteEmp,
  };

  window.showAdminAttendanceSummaryReport = showAdminAttendanceSummaryReport;
  window.setAttendanceDateToday = setAttendanceDateToday;
  window.renderAttendanceSummaryList = renderAttendanceSummaryList;
  window.exportAttendanceSummaryExcel = exportAttendanceSummaryExcel;

  window.showLocationManagement = showLocationManagement;
  window.addNewLocation = addNewLocation;
  window.showEditLocationModal = showEditLocationModal;
  window.submitEditLocation = submitEditLocation;
  window.deleteLocation = deleteLocation;
  window.executeDeleteLocation = executeDeleteLocation;

  window.showFuelRequestForm = showFuelRequestForm;
  window.toggleFuelAmountField = toggleFuelAmountField;
  window.handleFuelSubmit = handleFuelSubmit;
  window.showAdminFuelRequests = showAdminFuelRequests;
  window.updateFuelStatusWithAmount = updateFuelStatusWithAmount;
  window.showAdminFuelHistory = showAdminFuelHistory;
  window.loadCarPlatesManagementList = loadCarPlatesManagementList;
  window.addCarPlate = addCarPlate;
  window.deleteCarPlate = deleteCarPlate;
  window.setFuelDateToday = setFuelDateToday;
  window.renderFuelHistoryList = renderFuelHistoryList;
  window.renderCarExpenseChart = renderCarExpenseChart;
  window.exportFuelHistoryExcel = exportFuelHistoryExcel;
  window.showEditFuelModal = showEditFuelModal;
  window.submitEditFuel = submitEditFuel;
  window.confirmDeleteFuel = confirmDeleteFuel;
  window.executeDeleteFuel = executeDeleteFuel;
  window.toggleFuelPaid = toggleFuelPaid;

  window.showAdminLeaves = showAdminLeaves;
  window.updateLeaveStatusAndHide = updateLeaveStatusAndHide;
  window.showAdminLeaveHistory = showAdminLeaveHistory;
  window.setLeaveDateToday = setLeaveDateToday;
  window.renderLeaveHistoryList = renderLeaveHistoryList;
  window.exportLeaveHistoryExcel = exportLeaveHistoryExcel;
  window.adminUpdateLeaveStatus = adminUpdateLeaveStatus;
  window.adminDeleteLeave = adminDeleteLeave;
  window.executeAdminDeleteLeave = executeAdminDeleteLeave;

  window.showAdminLogsHistory = showAdminLogsHistory;
  window.setLogDateToday = setLogDateToday;
  window.renderLogHistoryList = renderLogHistoryList;
  window.exportLogHistoryExcel = exportLogHistoryExcel;

  window.showDailyPayroll = showDailyPayroll;
  window.setPayrollDateToday = setPayrollDateToday;
  window.renderDailyPayrollData = renderDailyPayrollData;
  window.exportPayrollExcel = exportPayrollExcel;

  window.showAnalyticsReport = showAnalyticsReport;
  window.renderMonthlySummary = renderMonthlySummary;
  window.exportMonthlyExcel = exportMonthlyExcel;

  window.showEmpManagement = showEmpManagement;
  window.saveGlobalLateTime = saveGlobalLateTime;
  window.showAddEmpModal = showAddEmpModal;
  window.submitAddEmp = submitAddEmp;
  window.showEditEmpModal = showEditEmpModal;
  window.submitEditEmp = submitEditEmp;
  window.confirmDeleteEmp = confirmDeleteEmp;
  window.executeDeleteEmp = executeDeleteEmp;
})();
