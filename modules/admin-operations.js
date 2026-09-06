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
          const safeName = window.PinThipSafe.safeText(loc.name);
          const safeKey = window.PinThipSafe.safeText(loc.key);
          html += `
            <div class="history-item">
              <b>📍 ${safeName}</b><br>
              ละติจูด: ${window.PinThipSafe.safeText(loc.lat)} | ลองจิจูด: ${window.PinThipSafe.safeText(loc.lng)}<br>
              📏 รัศมีอนุญาต: <b style="color:#28a745; font-size:15px;">${window.PinThipSafe.safeText(loc.radius || 100)} เมตร</b><br>
              <div style="margin-top:8px; display:flex; gap:6px;">
                <button class="btn-blue" style="width:auto; margin:0; padding:6px 12px; font-size:12px;" onclick="showEditLocationModal('${safeKey}', '${safeName}', ${Number(loc.lat) || 0}, ${Number(loc.lng) || 0}, ${Number(loc.radius) || 100})">✏️ แก้ไข</button>
                <button class="btn-danger" style="width:auto; margin:0; padding:6px 12px; font-size:12px;" onclick="deleteLocation('${safeKey}')">🗑️ ลบ</button>
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
      } else {
        console.error('Add location failed:', err);
        PinThipSafe.modal.error('บันทึกจุดเช็กอินไม่สำเร็จ กรุณาลองอีกครั้ง');
      }
    });
  }

  function showEditLocationModal(key, name, lat, lng, radius) {
    const safeName = window.PinThipSafe.safeText(name);
    const safeKey = window.PinThipSafe.safeText(key);
    const html = `
      <div class="user-banner">✏️ แก้ไขจุดเช็กอิน: ${safeName}</div>
      <input type="hidden" id="editLocKey" value="${safeKey}">
      <div style="text-align:left; font-size:13px; color:#555;">ชื่อสถานที่:</div>
      <input type="text" id="editLocName" value="${safeName}">
      <div style="text-align:left; font-size:13px; color:#555; margin-top:5px;">ละติจูด (Lat):</div>
      <input type="text" id="editLocLat" value="${window.PinThipSafe.safeText(lat)}">
      <div style="text-align:left; font-size:13px; color:#555; margin-top:5px;">ลองจิจูด (Lng):</div>
      <input type="text" id="editLocLng" value="${window.PinThipSafe.safeText(lng)}">
      <div style="text-align:left; font-size:13px; color:#555; margin-top:5px;">รัศมี (เมตร):</div>
      <input type="number" id="editLocRadius" value="${window.PinThipSafe.safeText(radius)}">
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
      } else {
        console.error('Edit location update failed:', err);
        PinThipSafe.modal.error('บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง');
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
      } else {
        console.error('Fuel request submit failed:', err);
        PinThipSafe.modal.error('ส่งคำขอเบิกค่าใช้จ่ายไม่สำเร็จ กรุณาลองอีกครั้ง');
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
      } else {
        console.error('Update fuel status failed:', err);
        PinThipSafe.modal.error('บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง');
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
      } else {
        console.error('Add car plate failed:', err);
        PinThipSafe.modal.error('เพิ่มทะเบียนรถไม่สำเร็จ กรุณาลองอีกครั้ง');
      }
    });
  }

  function deleteCarPlate(key) {
    window.db.ref('car_plates/' + key).remove((err) => {
      if (!err) {
        window.loadCarPlatesManagementList();
      } else {
        console.error('Delete car plate failed:', err);
        PinThipSafe.modal.error('ลบทะเบียนรถไม่สำเร็จ กรุณาลองอีกครั้ง');
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
        
        // เก็บไว้ใน window เพื่อให้ showCarHistory() เข้าถึงได้
        window.currentFuelFilteredList = currentFuelFilteredList;

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

        let html = ``;

        if (currentFuelFilteredList.length === 0) {
          html += '<div style="color:#888; margin:20px 0;">ไม่มีรายการเบิกจ่ายในช่วงเวลาดังกล่าว</div>';
        } else {
          currentFuelFilteredList.slice().reverse().forEach((item) => {
            const statusBadge = String(item.status || '').includes('อนุมัติแล้ว') ? '🟢 อนุมัติแล้ว' : (String(item.status || '').includes('ไม่อนุมัติ') ? '🔴 ไม่อนุมัติ' : '⏳ รออนุมัติ');
            const isApproved = String(item.status || '').includes('อนุมัติแล้ว');
            const isPending = String(item.status || '').includes('รออนุมัติ');
            const isRejected = String(item.status || '').includes('ไม่อนุมัติ');
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
                ${isPending ? `
                <div style="margin-top:8px; padding:10px; background:#fff8e1; border-left:4px solid #ff9800; border-radius:6px;">
                  <div style="font-size:12px; font-weight:bold; color:#e65100; margin-bottom:6px;">💵 กำหนดจำนวนเงินอนุมัติ:</div>
                  <input type="number" id="quickFuelAmount_${window.PinThipSafe.safeText(item.key)}" value="${item.amount || ''}" placeholder="ระบุยอดเงิน" style="width:100%; margin-bottom:6px; padding:8px; font-size:13px;">
                  <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button style="flex:1; min-width:120px; margin:0; padding:8px 12px; font-size:12px; background:#28a745; color:white; border:none; border-radius:6px; font-weight:600;" onclick="quickApproveFuel('${window.PinThipSafe.safeText(item.key)}', true)">✅ อนุมัติ</button>
                    <button style="flex:1; min-width:120px; margin:0; padding:8px 12px; font-size:12px; background:#dc3545; color:white; border:none; border-radius:6px; font-weight:600;" onclick="quickApproveFuel('${window.PinThipSafe.safeText(item.key)}', false)">❌ ไม่อนุมัติ</button>
                  </div>
                </div>
                ` : ''}
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
    const carDates = {}; // เก็บวันที่เบิกแต่ละคัน
    let totalFuelOverall = 0;
    let totalRepairOverall = 0;
    let maxAmount = 1;

    currentFuelFilteredList.forEach((item) => {
      const plate = item.carPlate || 'ไม่ระบุทะเบียน';
      const statusStr = String(item.status || '');
      const reqType = item.requestType || 'เบิกค่าน้ำมัน';
      if (statusStr.includes('อนุมัติแล้ว')) {
        const amt = Number(item.amount || 0);
        if (!carData[plate]) carData[plate] = { fuel: 0, repair: 0 };
        if (!carDates[plate]) carDates[plate] = [];

        // เก็บวันที่เบิก
        if (item.date) carDates[plate].push(item.date);

        if (reqType.includes('ซ่อม')) {
          carData[plate].repair += amt;
          totalRepairOverall += amt;
        } else {
          carData[plate].fuel += amt;
          totalFuelOverall += amt;
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

    // สร้าง HTML โดยไม่มีกราฟโดนัท/แท่ง (ลบออก เหลือแค่ปุ่ม filter และตาราง)
    let chartHtml = '<div class="payroll-dashboard-wrapper" style="margin-bottom: 20px;">';
    
    // ปุ่มเลือกทะเบียนรถ (toolbar)
    chartHtml += '<div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">';
    chartHtml += '<button class="payroll-tool-btn" id="car-filter-all" onclick="filterCarExpense(\'all\')" style="background: #10b981; color: white; border-color: #10b981;">✓ ทุกคัน</button>';
    plates.forEach((plate) => {
      const safePlate = window.PinThipSafe.safeText(plate);
      chartHtml += `<button class="payroll-tool-btn car-filter-btn" data-plate="${safePlate}" onclick="filterCarExpense('${safePlate}')">${safePlate}</button>`;
    });
    chartHtml += '</div>';
    chartHtml += '</div>';

    // ตามด้วยส่วน breakdown ตามทะเบียนรถ (Table with Sparkline)
    chartHtml += '<div style="margin-top: 20px; padding-top: 15px; border-top: 2px dashed #dee2e6;">';
    chartHtml += '<div style="font-size: 13px; font-weight: bold; color: #6c757d; margin-bottom: 12px;">🚗 รายละเอียดแยกตามทะเบียนรถ (เรียงตามยอดมาก → น้อย)</div>';
    chartHtml += '<div id="carBreakdownList">';
    
    // เรียงลำดับตามยอดรวม มาก → น้อย
    const sortedPlates = plates.sort((a, b) => {
      const totalA = carData[a].fuel + carData[a].repair;
      const totalB = carData[b].fuel + carData[b].repair;
      return totalB - totalA;
    });
    
    // หายอดสูงสุดเพื่อคำนวณ sparkline
    const maxTotal = sortedPlates.length > 0 
      ? (carData[sortedPlates[0]].fuel + carData[sortedPlates[0]].repair)
      : 1;
    
    // ฟังก์ชันนับจำนวนครั้งที่เบิก
    function getRequestCount(dates) {
      return dates ? dates.length : 0;
    }
    
    // สร้างตาราง
    chartHtml += `
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <thead>
          <tr style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-bottom: 2px solid #dee2e6;">
            <th style="padding: 12px; text-align: left; font-size: 13px; color: #495057; font-weight: 700;">อันดับ</th>
            <th style="padding: 12px; text-align: left; font-size: 13px; color: #495057; font-weight: 700;">ทะเบียน</th>
            <th style="padding: 12px; text-align: right; font-size: 13px; color: #495057; font-weight: 700;">ค่าน้ำมัน</th>
            <th style="padding: 12px; text-align: right; font-size: 13px; color: #495057; font-weight: 700;">ค่าซ่อม</th>
            <th style="padding: 12px; text-align: right; font-size: 13px; color: #495057; font-weight: 700;">รวม</th>
            <th style="padding: 12px; text-align: center; font-size: 13px; color: #495057; font-weight: 700;">จำนวนครั้ง</th>
            <th style="padding: 12px; text-align: left; font-size: 13px; color: #495057; font-weight: 700; min-width: 150px;">กราฟเปรียบเทียบ</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    sortedPlates.forEach((plate, index) => {
      const safePlate = window.PinThipSafe.safeText(plate);
      const fAmt = carData[plate].fuel;
      const rAmt = carData[plate].repair;
      const total = fAmt + rAmt;
      const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
      
      // นับจำนวนครั้งที่เบิก
      const requestCount = getRequestCount(carDates[plate]);
      const countText = requestCount > 0 
        ? `<span style="color: #10b981; font-weight: 700; font-size: 14px;">${requestCount}</span> <span style="color: #6c757d; font-size: 12px;">ครั้ง</span>`
        : `<span style="color: #adb5bd; font-size: 12px;">0</span>`;
      
      // เหรียญอันดับ
      let rankBadge = '';
      if (index === 0) rankBadge = '🥇';
      else if (index === 1) rankBadge = '🥈';
      else if (index === 2) rankBadge = '🥉';
      else rankBadge = `<span style="color: #adb5bd; font-weight: 600;">${index + 1}</span>`;
      
      // สี row สลับ
      const bgColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
      
      chartHtml += `
        <tr class="car-breakdown-item" data-plate="${safePlate}" 
            style="background: ${bgColor}; border-bottom: 1px solid #e9ecef; cursor: pointer; transition: all 0.2s ease;"
            onmouseover="this.style.background='#e7f3ff'" 
            onmouseout="this.style.background='${bgColor}'"
            onclick="filterCarExpense('${safePlate}', false)">
          <td style="padding: 12px; text-align: center; font-size: 18px;">${rankBadge}</td>
          <td style="padding: 12px; font-weight: 700; color: #2c3e50; font-size: 14px;">🚗 ${safePlate}</td>
          <td style="padding: 12px; text-align: right; color: #e67e22; font-weight: 600; font-size: 14px;">${fAmt.toLocaleString()} ฿</td>
          <td style="padding: 12px; text-align: right; color: #d9534f; font-weight: 600; font-size: 14px;">${rAmt.toLocaleString()} ฿</td>
          <td style="padding: 12px; text-align: right; color: #2c3e50; font-weight: 700; font-size: 15px;">${total.toLocaleString()} ฿</td>
          <td style="padding: 12px; text-align: center;">${countText}</td>
          <td style="padding: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="flex: 1; background: #e9ecef; border-radius: 4px; height: 20px; overflow: hidden; position: relative;">
                <div style="background: linear-gradient(90deg, #10b981, #059669); height: 100%; width: ${percentage}%; border-radius: 4px; transition: width 0.3s ease;"></div>
              </div>
              <span style="font-size: 12px; color: #6c757d; font-weight: 600; min-width: 38px; text-align: right;">${percentage}%</span>
            </div>
          </td>
        </tr>
      `;
    });

    chartHtml += `
        </tbody>
      </table>
    `;

    chartHtml += '</div>';
    chartHtml += '</div>';
    
    // เพิ่มสรุปยอดรวมด้านล่างตาราง - แบบการ์ด 3 คอลัมน์
    const totalAll = totalFuelOverall + totalRepairOverall;
    const fuelPercent = totalAll > 0 ? ((totalFuelOverall / totalAll) * 100).toFixed(1) : '0.0';
    const repairPercent = totalAll > 0 ? ((totalRepairOverall / totalAll) * 100).toFixed(1) : '0.0';
    
    chartHtml += `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 20px;">
        
        <!-- การ์ดค่าน้ำมัน -->
        <div data-summary-card="fuel" style="background: linear-gradient(135deg, #fff5e6, #ffffff); border: 1px solid #ffe4cc; border-left: 4px solid #e67e22; border-radius: 10px; padding: 14px; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
          <div style="font-size: 28px; margin-bottom: 4px;">⛽</div>
          <div style="font-size: 12px; color: #888; margin-bottom: 6px;">ค่าน้ำมันรถ</div>
          <div data-amount style="font-size: 20px; font-weight: 700; color: #e67e22; margin-bottom: 4px;">${totalFuelOverall.toLocaleString()}<span style="font-size: 14px; font-weight: 400;">บาท</span></div>
          <div data-percent style="font-size: 11px; color: #999;">${fuelPercent}% ของค่าใช้จ่ายรวม</div>
        </div>
        
        <!-- การ์ดค่าซ่อม -->
        <div data-summary-card="repair" style="background: linear-gradient(135deg, #ffe6e6, #ffffff); border: 1px solid #ffcccc; border-left: 4px solid #d9534f; border-radius: 10px; padding: 14px; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
          <div style="font-size: 28px; margin-bottom: 4px;">🔧</div>
          <div style="font-size: 12px; color: #888; margin-bottom: 6px;">ค่าซ่อมรถ</div>
          <div data-amount style="font-size: 20px; font-weight: 700; color: #d9534f; margin-bottom: 4px;">${totalRepairOverall.toLocaleString()}<span style="font-size: 14px; font-weight: 400;">บาท</span></div>
          <div data-percent style="font-size: 11px; color: #999;">${repairPercent}% ของค่าใช้จ่ายรวม</div>
        </div>
        
        <!-- การ์ดรวมทั้งหมด -->
        <div data-summary-card="total" style="background: linear-gradient(135deg, #e6f7ff, #ffffff); border: 1px solid #b3e0ff; border-left: 4px solid #0dcaf0; border-radius: 10px; padding: 14px; text-align: center; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
          <div style="font-size: 28px; margin-bottom: 4px;">💰</div>
          <div style="font-size: 12px; color: #888; margin-bottom: 6px;">รวมทั้งหมด</div>
          <div data-amount style="font-size: 20px; font-weight: 700; color: #2c3e50; margin-bottom: 4px;">${totalAll.toLocaleString()}<span style="font-size: 14px; font-weight: 400;">บาท</span></div>
          <div data-percent style="font-size: 11px; color: #999;">${sortedPlates.length} คัน</div>
        </div>
        
      </div>
    `;
    
    chartContainer.innerHTML = chartHtml;
    
    // เก็บข้อมูลไว้ใช้กับ filter
    window.currentCarData = carData;
  }

  function filterCarExpense(plate, fromButton = true) {
    if (!window.currentCarData) return;
    
    const carData = window.currentCarData;
    const breakdownItems = document.querySelectorAll('.car-breakdown-item');
    const allBtn = document.getElementById('car-filter-all');
    const filterBtns = document.querySelectorAll('.car-filter-btn');

    // อัปเดตสถานะปุ่ม
    if (plate === 'all') {
      if (allBtn) {
        allBtn.style.background = '#10b981';
        allBtn.style.color = 'white';
        allBtn.style.borderColor = '#10b981';
      }
      filterBtns.forEach((btn) => {
        btn.style.background = '#ffffff';
        btn.style.color = '#475569';
        btn.style.borderColor = '#e2e8f0';
      });
      
      // แสดงทุกคัน
      breakdownItems.forEach((item) => {
        item.style.display = '';
        item.style.opacity = '1';
      });
      
      // ซ่อน modal ถ้ามี
      const modal = document.getElementById('carHistoryModal');
      if (modal) modal.style.display = 'none';
      
      // อัปเดตการ์ดกลับเป็นรวมทั้งหมด
      updateSummaryCards('all');
    } else {
      // เลือกคันใดคันหนึ่ง
      if (allBtn) {
        allBtn.style.background = '#ffffff';
        allBtn.style.color = '#475569';
        allBtn.style.borderColor = '#e2e8f0';
      }
      
      filterBtns.forEach((btn) => {
        const btnPlate = btn.getAttribute('data-plate');
        if (btnPlate === plate) {
          btn.style.background = '#10b981';
          btn.style.color = 'white';
          btn.style.borderColor = '#10b981';
        } else {
          btn.style.background = '#ffffff';
          btn.style.color = '#475569';
          btn.style.borderColor = '#e2e8f0';
        }
      });
      
      // แสดงเฉพาะคันที่เลือก highlight ส่วนอื่นเป็นเทา
      breakdownItems.forEach((item) => {
        const itemPlate = item.getAttribute('data-plate');
        if (itemPlate === plate) {
          item.style.opacity = '1';
          item.style.display = '';
        } else {
          item.style.opacity = '0.3';
          item.style.display = '';
        }
      });
      
      // ถ้าคลิกจากปุ่มด้านบน → อัปเดตการ์ดอย่างเดียว
      // ถ้าคลิกจากตาราง → เด้ง modal
      if (fromButton) {
        // คลิกจากปุ่ม → อัปเดตการ์ดสรุป
        updateSummaryCards(plate);
      } else {
        // คลิกจากตาราง → แสดง modal ประวัติ
        updateSummaryCards(plate);
        showCarHistory(plate);
      }
    }
  }

  function updateSummaryCards(plate) {
    if (!window.currentCarData) return;
    
    const carData = window.currentCarData;
    let totalFuel = 0;
    let totalRepair = 0;
    let carCount = 0;
    
    if (plate === 'all') {
      // แสดงทุกคัน
      Object.keys(carData).forEach((p) => {
        totalFuel += carData[p].fuel;
        totalRepair += carData[p].repair;
      });
      carCount = Object.keys(carData).length;
    } else {
      // แสดงเฉพาะคันที่เลือก
      if (carData[plate]) {
        totalFuel = carData[plate].fuel;
        totalRepair = carData[plate].repair;
        carCount = 1;
      }
    }
    
    const totalAll = totalFuel + totalRepair;
    const fuelPercent = totalAll > 0 ? ((totalFuel / totalAll) * 100).toFixed(1) : '0.0';
    const repairPercent = totalAll > 0 ? ((totalRepair / totalAll) * 100).toFixed(1) : '0.0';
    
    // อัปเดต DOM
    const fuelCard = document.querySelector('[data-summary-card="fuel"]');
    const repairCard = document.querySelector('[data-summary-card="repair"]');
    const totalCard = document.querySelector('[data-summary-card="total"]');
    
    if (fuelCard) {
      fuelCard.querySelector('[data-amount]').innerHTML = `${totalFuel.toLocaleString()}<span style="font-size: 14px; font-weight: 400;">บาท</span>`;
      fuelCard.querySelector('[data-percent]').textContent = `${fuelPercent}% ของค่าใช้จ่ายรวม`;
    }
    
    if (repairCard) {
      repairCard.querySelector('[data-amount]').innerHTML = `${totalRepair.toLocaleString()}<span style="font-size: 14px; font-weight: 400;">บาท</span>`;
      repairCard.querySelector('[data-percent]').textContent = `${repairPercent}% ของค่าใช้จ่ายรวม`;
    }
    
    if (totalCard) {
      totalCard.querySelector('[data-amount]').innerHTML = `${totalAll.toLocaleString()}<span style="font-size: 14px; font-weight: 400;">บาท</span>`;
      totalCard.querySelector('[data-percent]').textContent = `${carCount} คัน`;
    }
  }

  function showCarHistory(plate) {
    if (!window.currentFuelFilteredList || !plate) return;
    
    // กรองรายการของรถคันนี้ในช่วงวันที่ที่เลือก
    const carItems = window.currentFuelFilteredList.filter((item) => {
      return (item.carPlate || 'ไม่ระบุทะเบียน') === plate;
    });
    
    if (carItems.length === 0) return;
    
    // เรียงตามวันที่ล่าสุดก่อน
    carItems.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });
    
    // สร้าง modal header
    let modalHtml = `
      <div id="carHistoryModal" style="
        position: fixed; 
        top: 0; 
        left: 0; 
        width: 100%; 
        height: 100%; 
        background: rgba(0,0,0,0.5); 
        z-index: 10000; 
        display: flex; 
        align-items: center; 
        justify-content: center;
        padding: 20px;
      ">
        <div style="
          background: white; 
          border-radius: 12px; 
          max-width: 700px; 
          width: 100%; 
          max-height: 80vh; 
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        ">
          <div style="
            position: sticky;
            top: 0;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 20px 24px;
            border-radius: 12px 12px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 1;
          ">
            <div>
              <div style="font-size: 18px; font-weight: bold;">🚗 ประวัติเบิกจ่าย: ${window.PinThipSafe.safeText(plate)}</div>
              <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;">พบ ${carItems.length} รายการ</div>
            </div>
            <button onclick="document.getElementById('carHistoryModal').style.display='none'" style="
              background: rgba(255,255,255,0.2);
              border: none;
              color: white;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              cursor: pointer;
              font-size: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: background 0.2s;
            " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
          </div>
          <div style="padding: 20px 24px;">
    `;

    
    let totalFuel = 0;
    let totalRepair = 0;
    
    carItems.forEach((item, index) => {
      const statusBadge = String(item.status || '').includes('อนุมัติแล้ว') 
        ? '🟢 อนุมัติแล้ว' 
        : (String(item.status || '').includes('ไม่อนุมัติ') ? '🔴 ไม่อนุมัติ' : '⏳ รอการอนุมัติ');
      const reqType = item.requestType || 'เบิกค่าน้ำมัน';
      const isRepair = reqType.includes('ซ่อม');
      const icon = isRepair ? '🔧' : '⛽';
      const typeColor = isRepair ? '#d9534f' : '#e67e22';
      const amt = Number(item.amount || 0);
      
      if (String(item.status || '').includes('อนุมัติแล้ว')) {
        if (isRepair) {
          totalRepair += amt;
        } else {
          totalFuel += amt;
        }
      }
      
      const safeEmpName = window.PinThipSafe.safeText(item.empName || '-');
      const safeRoute = window.PinThipSafe.safeText(item.route || '-');
      const safeDate = window.PinThipSafe.safeText(item.date || '-');
      const safeRemark = window.PinThipSafe.safeText(item.remark || '');
      
      modalHtml += `
        <div style="
          background: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};
          border: 1px solid #e9ecef;
          border-left: 3px solid ${typeColor};
          border-radius: 6px;
          padding: 10px 12px;
          margin-bottom: 8px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-size: 12px; color: #6c757d;">${statusBadge}</div>
            <div style="font-size: 14px; font-weight: bold; color: ${typeColor};">${amt.toLocaleString()} ฿</div>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: #2c3e50; margin-bottom: 4px;">
            ${icon} ${window.PinThipSafe.safeText(reqType)}
          </div>
          <div style="font-size: 12px; color: #495057; line-height: 1.5;">
            📅 ${safeDate} | 👤 ${safeEmpName} | 📍 ${safeRoute}${safeRemark ? ` | 📝 ${safeRemark}` : ''}
          </div>
        </div>
      `;
    });
    
    // สรุปยอดรวมของรถคันนี้
    modalHtml += `
      <div style="
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border: 2px solid #10b981;
        border-radius: 8px;
        padding: 12px 14px;
        margin-top: 16px;
      ">
        <div style="font-size: 13px; font-weight: bold; color: #2c3e50; margin-bottom: 8px;">📊 สรุปยอดรวม</div>
        <div style="font-size: 12px; color: #495057; line-height: 1.6;">
          ⛽ ค่าน้ำมัน: <b style="color: #e67e22;">${totalFuel.toLocaleString()} ฿</b> | 🔧 ค่าซ่อม: <b style="color: #d9534f;">${totalRepair.toLocaleString()} ฿</b> | 💰 รวม: <b style="color: #2c3e50; font-size: 13px;">${(totalFuel + totalRepair).toLocaleString()} ฿</b>
        </div>
      </div>
    `;
    
    modalHtml += `
          </div>
        </div>
      </div>
    `;
    
    // ลบ modal เก่าถ้ามี
    const oldModal = document.getElementById('carHistoryModal');
    if (oldModal) oldModal.remove();
    
    // แทรก modal ใหม่
    document.body.insertAdjacentHTML('beforeend', modalHtml);
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

      const safeCarPlate = window.PinThipSafe.safeText(carPlate || 'รถส่วนกลาง');
      let optionsHtml = '<option value="">-- เลือกทะเบียนรถ --</option>';
      if (platesList.length === 0) {
        optionsHtml += `<option value="${safeCarPlate}">${safeCarPlate}</option>`;
      } else {
        platesList.forEach((p) => {
          const safePlate = window.PinThipSafe.safeText(p);
          const selected = (p === carPlate) ? 'selected' : '';
          optionsHtml += `<option value="${safePlate}" ${selected}>${safePlate}</option>`;
        });
      }

      const html = `
        <div class="user-banner">✏️ แก้ไขข้อมูลการเบิกจ่าย</div>
        <input type="hidden" id="editFuelKey" value="${window.PinThipSafe.safeText(key)}">
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
        <input type="text" id="editFuelRoute" value="${window.PinThipSafe.safeText(route)}">
        <div style="text-align:left; font-size:13px; color:#555; margin-top:5px;">จำนวนเงินอนุมัติ (บาท):</div>
        <input type="number" id="editFuelAmount" value="${window.PinThipSafe.safeText(amount)}">
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
      } else {
        console.error('Edit fuel update failed:', err);
        PinThipSafe.modal.error('บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง');
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
      } else {
        console.error('Update leave status failed:', err);
        PinThipSafe.modal.error('บันทึกสถานะใบลาไม่สำเร็จ กรุณาลองอีกครั้ง');
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
          
          // เก็บข้อมูลพนักงานทั้งหมดไว้ใน window เพื่อใช้กับ filter
          window.allEmployeeData = employeeData;
          
          // สร้าง HTML แบบ 4 กล่องเรียงแนวนอน (จะอัปเดตแบบ dynamic)
          let html = `
            <div class="payroll-dashboard-wrapper">
            <div class="payroll-dash-header">
              <h2 class="payroll-dash-title">💵 สรุปค่าแรง &amp; ค่าใช้จ่ายรายบุคคล</h2>
              <p class="payroll-dash-subtitle">${startDate} ถึง ${endDate}</p>
            </div>
            
            <div class="payroll-stats-grid" id="summary-cards">
              <div class="payroll-stat-card pcard-emp">
                <div class="payroll-stat-header">
                  <div class="payroll-stat-icon">👥</div>
                  <div class="payroll-stat-label">พนักงานที่เลือก</div>
                </div>
                <div class="payroll-stat-value" id="selected-count">${Object.keys(employeeData).length}</div>
                <div class="payroll-stat-meta">คน</div>
              </div>

              <div class="payroll-stat-card pcard-salary">
                <div class="payroll-stat-header">
                  <div class="payroll-stat-icon">💵</div>
                  <div class="payroll-stat-label">ค่าแรงรวม</div>
                </div>
                <div class="payroll-stat-value"><span id="selected-salary">${salaryTotal.toLocaleString()}</span><span class="currency">บาท</span></div>
                <div class="payroll-stat-meta">ค่าแรงพนักงาน</div>
              </div>

              <div class="payroll-stat-card pcard-other">
                <div class="payroll-stat-header">
                  <div class="payroll-stat-icon">⛽</div>
                  <div class="payroll-stat-label">ค่าน้ำมัน + ซ่อม</div>
                </div>
                <div class="payroll-stat-value"><span id="selected-other">${(fuelOnlyTotal + repairOnlyTotal).toLocaleString()}</span><span class="currency">บาท</span></div>
                <div class="payroll-stat-meta">ค่าใช้จ่ายรถ</div>
              </div>

              <div class="payroll-stat-card pcard-total">
                <div class="payroll-stat-header">
                  <div class="payroll-stat-icon">💰</div>
                  <div class="payroll-stat-label">รวมทั้งหมด</div>
                </div>
                <div class="payroll-stat-value"><span id="selected-total">${grandTotal.toLocaleString()}</span><span class="currency">บาท</span></div>
                <div class="payroll-stat-meta">ยอดจ่ายสุทธิ</div>
              </div>
            </div>

            <div class="payroll-toolbar">
              <button type="button" class="payroll-tool-btn payroll-tool-select" onclick="selectAllEmployees()">✓ เลือกทั้งหมด</button>
              <button type="button" class="payroll-tool-btn payroll-tool-clear" onclick="unselectAllEmployees()">✗ ยกเลิกทั้งหมด</button>
            </div>
          `;

          // แสดงรายละเอียดรายบุคคล (ซ้าย: เลือกพนักงาน / ขวา: กราฟสัดส่วน)
          const employeeList = Object.values(employeeData).sort((a, b) => b.grandTotal - a.grandTotal);
          
          if (employeeList.length === 0) {
            html += '<div class="payroll-empty">ไม่มีข้อมูลในช่วงเวลานี้</div>';
          } else {
            html += '<div class="payroll-split-row">';

            // คอลัมน์ซ้าย: เลือกพนักงาน
            html += '<div class="payroll-split-col">';
            html += `<h3 class="payroll-section-title">👥 รายละเอียดรายบุคคล (${employeeList.length} คน)</h3>`;
            html += '<div class="payroll-emp-grid">';

            employeeList.forEach((emp) => {
              if (emp.grandTotal <= 0) return;
              html += `
                <div id="emp-card-${emp.empId}" class="payroll-emp-card is-selected"
                     onclick="toggleEmployeeSelection('${emp.empId}')">
                  <div class="payroll-emp-name">${window.PinThipSafe.safeText(emp.empName)}</div>
                  <div class="payroll-emp-amount">${emp.grandTotal.toLocaleString()} ฿</div>
                  <div class="payroll-emp-stats">
                    <span>📅 ${emp.salary.days}</span>
                    <span>⛽ ${emp.fuel.count}</span>
                    <span>🔧 ${emp.repair.count}</span>
                  </div>
                  <input type="checkbox" id="emp-checkbox-${emp.empId}" checked style="display: none;">
                </div>
              `;
            });

            html += '</div>';
            html += '</div>';

            // คอลัมน์ขวา: กราฟสัดส่วนค่าใช้จ่าย (อัปเดตตามคนที่เลือก)
            html += '<div class="payroll-split-col payroll-split-charts" id="payrollChartsCol">';
            html += renderPayrollCharts(salaryTotal, fuelOnlyTotal, repairOnlyTotal);
            html += '</div>';

            html += '</div>';
          }

          html += '</div>';
          
          // ฟังก์ชันช่วยตั้งสถานะ card
          const applyEmployeeCardState = (card, isSelected) => {
            if (!card) return;
            card.classList.toggle('is-selected', isSelected);
            card.classList.toggle('is-unselected', !isSelected);
          };

          // ฟังก์ชัน toggle selection
          window.toggleEmployeeSelection = function(empId) {
            const card = document.getElementById('emp-card-' + empId);
            const checkbox = document.getElementById('emp-checkbox-' + empId);
            
            if (checkbox && card) {
              checkbox.checked = !checkbox.checked;
              applyEmployeeCardState(card, checkbox.checked);
              window.updatePayrollSummary();
            }
          };
          
          // ฟังก์ชันอัปเดตสรุป
          window.updatePayrollSummary = function() {
            const allData = window.allEmployeeData;
            let selectedCount = 0;
            let selectedSalary = 0;
            let selectedFuel = 0;
            let selectedRepair = 0;
            
            Object.values(allData).forEach(emp => {
              const checkbox = document.getElementById('emp-checkbox-' + emp.empId);
              if (checkbox && checkbox.checked) {
                selectedCount++;
                selectedSalary += emp.salary.total;
                selectedFuel += emp.fuel.total;
                selectedRepair += emp.repair.total;
              }
            });
            
            const selectedOther = selectedFuel + selectedRepair;
            const selectedTotal = selectedSalary + selectedOther;
            
            document.getElementById('selected-count').textContent = selectedCount;
            document.getElementById('selected-salary').textContent = selectedSalary.toLocaleString();
            document.getElementById('selected-other').textContent = selectedOther.toLocaleString();
            document.getElementById('selected-total').textContent = selectedTotal.toLocaleString();

            // วาดกราฟสัดส่วนใหม่ตามพนักงานที่เลือก
            const chartsCol = document.getElementById('payrollChartsCol');
            if (chartsCol) {
              chartsCol.innerHTML = renderPayrollCharts(selectedSalary, selectedFuel, selectedRepair);
            }
          };
          
          // ฟังก์ชันเลือกทั้งหมด
          window.selectAllEmployees = function() {
            const allData = window.allEmployeeData;
            Object.values(allData).forEach(emp => {
              const checkbox = document.getElementById('emp-checkbox-' + emp.empId);
              const card = document.getElementById('emp-card-' + emp.empId);
              if (checkbox && card) {
                checkbox.checked = true;
                applyEmployeeCardState(card, true);
              }
            });
            window.updatePayrollSummary();
          };
          
          // ฟังก์ชันยกเลิกทั้งหมด
          window.unselectAllEmployees = function() {
            const allData = window.allEmployeeData;
            Object.values(allData).forEach(emp => {
              const checkbox = document.getElementById('emp-checkbox-' + emp.empId);
              const card = document.getElementById('emp-card-' + emp.empId);
              if (checkbox && card) {
                checkbox.checked = false;
                applyEmployeeCardState(card, false);
              }
            });
            window.updatePayrollSummary();
          };

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

  // สร้างกราฟเปรียบเทียบ + กราฟโดนัทสัดส่วนค่าใช้จ่าย (ใช้ร่วมกับหน้าสรุปค่าแรงรายบุคคล)
  function renderPayrollCharts(salary, fuel, repair) {
    const safeSalary = Number(salary) || 0;
    const safeFuel = Number(fuel) || 0;
    const safeRepair = Number(repair) || 0;
    const total = safeSalary + safeFuel + safeRepair;

    const pct = (value) => (total > 0 ? (value / total * 100) : 0);
    const sp = pct(safeSalary);
    const fp = pct(safeFuel);
    const rp = pct(safeRepair);

    const fmt = (value) => value.toFixed(1);
    const salaryDeg = (sp / 100) * 360;
    const fuelEndDeg = salaryDeg + ((fp / 100) * 360);

    // เลือกสีและ label ตามประเภทค่าใช้จ่าย (ถ้า salary=0 แสดงว่าเป็นหน้าเบิกจ่าย ใช้สีแยก)
    const isFuelRepairOnly = (safeSalary === 0);
    const salaryColor = isFuelRepairOnly ? '#6c757d' : '#6366f1';
    const fuelColorStart = isFuelRepairOnly ? '#e67e22' : '#f59e0b';
    const fuelColorEnd = isFuelRepairOnly ? '#d68722' : '#f97316';
    const repairColorStart = isFuelRepairOnly ? '#d9534f' : '#ef4444';
    const repairColorEnd = isFuelRepairOnly ? '#c9443f' : '#dc2626';

    const barItem = (icon, label, amount, percent, startColor, endColor) => `
      <div class="payroll-bar-item">
        <div class="payroll-bar-label">
          <div class="payroll-bar-label-left"><span>${icon}</span><span>${label}</span></div>
          <div class="payroll-bar-label-right">${amount.toLocaleString()} บาท</div>
        </div>
        <div class="payroll-bar-track">
          <div class="payroll-bar" style="--pbar-width: ${fmt(percent)}%; --pbar-start: ${startColor}; --pbar-end: ${endColor};"></div>
        </div>
      </div>
    `;

    const legendItem = (color, label, amount, percent) => `
      <div class="payroll-legend-item">
        <div class="payroll-legend-left">
          <div class="payroll-legend-color" style="background: ${color};"></div>
          <div class="payroll-legend-label">${label}</div>
        </div>
        <div class="payroll-legend-value">${amount.toLocaleString()}<span class="payroll-legend-percent">(${fmt(percent)}%)</span></div>
      </div>
    `;

    const donutClass = total > 0 ? 'payroll-donut-circle' : 'payroll-donut-circle payroll-donut-empty';

    let html = '<div class="payroll-chart-section">';
    html += '<div class="payroll-chart-title">📊 เปรียบเทียบค่าใช้จ่าย</div>';
    html += '<div class="payroll-bar-list">';
    
    if (!isFuelRepairOnly) {
      html += barItem('💵', 'ค่าแรงพนักงาน', safeSalary, sp, salaryColor, '#8b5cf6');
    }
    html += barItem('⛽', 'ค่าน้ำมันรถ', safeFuel, fp, fuelColorStart, fuelColorEnd);
    html += barItem('🔧', 'ค่าซ่อมรถ', safeRepair, rp, repairColorStart, repairColorEnd);
    
    html += '</div>';
    html += '</div>';
    
    html += '<div class="payroll-chart-section">';
    html += '<div class="payroll-chart-title">🥧 สัดส่วนค่าใช้จ่าย</div>';
    html += '<div class="payroll-donut-wrapper">';
    html += '<div class="payroll-donut-chart">';
    html += `<div class="${donutClass}" style="--pdonut-salary: ${salaryColor}; --pdonut-fuel: ${fuelColorStart}; --pdonut-repair: ${repairColorStart}; --pdonut-salary-deg: ${salaryDeg}deg; --pdonut-fuel-end-deg: ${fuelEndDeg}deg;">`;
    html += '<div class="payroll-donut-center">';
    html += '<div class="payroll-donut-center-label">รวม</div>';
    html += `<div class="payroll-donut-center-value">${total.toLocaleString()}</div>`;
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="payroll-donut-legend">';
    
    if (!isFuelRepairOnly) {
      html += legendItem(salaryColor, 'ค่าแรง', safeSalary, sp);
    }
    html += legendItem(fuelColorStart, 'ค่าน้ำมัน', safeFuel, fp);
    html += legendItem(repairColorStart, 'ค่าซ่อม', safeRepair, rp);
    
    html += '</div>';
    html += '</div>';
    html += '</div>';

    return html;
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
            repResult.innerHTML = renderMonthlyDashboard(ym, totalSalary, totalFuel, totalRepair);
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

  // Render Monthly Dashboard with cards and charts
  function renderMonthlyDashboard(ym, totalSalary, totalFuel, totalRepair) {
    console.log('🎨 renderMonthlyDashboard called:', { ym, totalSalary, totalFuel, totalRepair });
    const total = totalSalary + totalFuel + totalRepair;
    const salaryPercent = total > 0 ? (totalSalary / total * 100).toFixed(1) : 0;
    const fuelPercent = total > 0 ? (totalFuel / total * 100).toFixed(1) : 0;
    const repairPercent = total > 0 ? (totalRepair / total * 100).toFixed(1) : 0;
    const salaryDeg = (parseFloat(salaryPercent) / 100) * 360;
    const fuelEndDeg = salaryDeg + ((parseFloat(fuelPercent) / 100) * 360);
    
    return `
      <div class="monthly-dashboard-wrapper">
        <div class="monthly-stats-grid">
          <div class="monthly-stat-card card-salary">
            <div class="monthly-stat-header">
              <div class="monthly-stat-icon">💵</div>
              <div class="monthly-stat-label">ค่าแรงพนักงาน</div>
            </div>
            <div class="monthly-stat-value">${totalSalary.toLocaleString()}<span class="currency">บาท</span></div>
            <div class="monthly-stat-meta">${salaryPercent}% ของค่าใช้จ่ายรวม</div>
          </div>
          <div class="monthly-stat-card card-fuel">
            <div class="monthly-stat-header">
              <div class="monthly-stat-icon">⛽</div>
              <div class="monthly-stat-label">ค่าน้ำมันรถ</div>
            </div>
            <div class="monthly-stat-value">${totalFuel.toLocaleString()}<span class="currency">บาท</span></div>
            <div class="monthly-stat-meta">${fuelPercent}% ของค่าใช้จ่ายรวม</div>
          </div>
          <div class="monthly-stat-card card-repair">
            <div class="monthly-stat-header">
              <div class="monthly-stat-icon">🔧</div>
              <div class="monthly-stat-label">ค่าซ่อมรถ</div>
            </div>
            <div class="monthly-stat-value">${totalRepair.toLocaleString()}<span class="currency">บาท</span></div>
            <div class="monthly-stat-meta">${repairPercent}% ของค่าใช้จ่ายรวม</div>
          </div>
          <div class="monthly-stat-card card-total">
            <div class="monthly-stat-header">
              <div class="monthly-stat-icon">💰</div>
              <div class="monthly-stat-label">รวมทั้งหมด</div>
            </div>
            <div class="monthly-stat-value">${total.toLocaleString()}<span class="currency">บาท</span></div>
            <div class="monthly-stat-meta">ค่าใช้จ่ายประจำเดือน ${ym}</div>
          </div>
        </div>
        ${renderMonthlyCharts(totalSalary, totalFuel, totalRepair, salaryPercent, fuelPercent, repairPercent, salaryDeg, fuelEndDeg, total)}
      </div>
    `;
  }

  // Render charts section
  function renderMonthlyCharts(salary, fuel, repair, sp, fp, rp, sd, fed, total) {
    return `
      <div class="monthly-charts-row">
        <div class="monthly-chart-section">
          <div class="monthly-chart-title">📊 เปรียบเทียบค่าใช้จ่าย</div>
          <div class="monthly-bar-chart-list">
            <div class="monthly-bar-item">
              <div class="monthly-bar-label">
                <div class="monthly-bar-label-left"><span>💵</span><span>ค่าแรงพนักงาน</span></div>
                <div class="monthly-bar-label-right">${salary.toLocaleString()} บาท</div>
              </div>
              <div class="monthly-bar-track">
                <div class="monthly-bar" style="--bar-width: ${sp}%; --bar-color-start: #6366f1; --bar-color-end: #8b5cf6;"></div>
              </div>
            </div>
            <div class="monthly-bar-item">
              <div class="monthly-bar-label">
                <div class="monthly-bar-label-left"><span>⛽</span><span>ค่าน้ำมันรถ</span></div>
                <div class="monthly-bar-label-right">${fuel.toLocaleString()} บาท</div>
              </div>
              <div class="monthly-bar-track">
                <div class="monthly-bar" style="--bar-width: ${fp}%; --bar-color-start: #f59e0b; --bar-color-end: #f97316;"></div>
              </div>
            </div>
            <div class="monthly-bar-item">
              <div class="monthly-bar-label">
                <div class="monthly-bar-label-left"><span>🔧</span><span>ค่าซ่อมรถ</span></div>
                <div class="monthly-bar-label-right">${repair.toLocaleString()} บาท</div>
              </div>
              <div class="monthly-bar-track">
                <div class="monthly-bar" style="--bar-width: ${rp}%; --bar-color-start: #ef4444; --bar-color-end: #dc2626;"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="monthly-chart-section">
          <div class="monthly-chart-title">🥧 สัดส่วนค่าใช้จ่าย</div>
          <div class="monthly-donut-wrapper">
            <div class="monthly-donut-chart">
              <div class="monthly-donut-circle" style="--salary-color: #6366f1; --fuel-color: #f59e0b; --repair-color: #ef4444; --salary-deg: ${sd}deg; --fuel-end-deg: ${fed}deg;">
                <div class="monthly-donut-center">
                  <div class="monthly-donut-center-label">รวม</div>
                  <div class="monthly-donut-center-value">${total.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div class="monthly-donut-legend">
              <div class="monthly-legend-item">
                <div class="monthly-legend-left">
                  <div class="monthly-legend-color" style="background: #6366f1;"></div>
                  <div class="monthly-legend-label">ค่าแรง</div>
                </div>
                <div class="monthly-legend-value">${salary.toLocaleString()}<span class="monthly-legend-percent">(${sp}%)</span></div>
              </div>
              <div class="monthly-legend-item">
                <div class="monthly-legend-left">
                  <div class="monthly-legend-color" style="background: #f59e0b;"></div>
                  <div class="monthly-legend-label">ค่าน้ำมัน</div>
                </div>
                <div class="monthly-legend-value">${fuel.toLocaleString()}<span class="monthly-legend-percent">(${fp}%)</span></div>
              </div>
              <div class="monthly-legend-item">
                <div class="monthly-legend-left">
                  <div class="monthly-legend-color" style="background: #ef4444;"></div>
                  <div class="monthly-legend-label">ค่าซ่อม</div>
                </div>
                <div class="monthly-legend-value">${repair.toLocaleString()}<span class="monthly-legend-percent">(${rp}%)</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
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
      } else {
        console.error('Save global late time failed:', err);
        PinThipSafe.modal.error('บันทึกเวลาเข้างานกลางไม่สำเร็จ กรุณาลองอีกครั้ง');
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
        } else {
          console.error('Add employee failed:', err);
          PinThipSafe.modal.error('เพิ่มพนักงานไม่สำเร็จ กรุณาลองอีกครั้ง');
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

    if (!key || !newId || !name || !rate) {
      PinThipSafe.modal.warning('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    window.db.ref('employees').once('value', (snapshot) => {
      const employeesObj = snapshot.val() || {};
      let isIdDuplicate = false;
      Object.keys(employeesObj).forEach((k) => {
        if (k !== key && String(employeesObj[k].empId) === String(newId)) isIdDuplicate = true;
      });

      if (isIdDuplicate) {
        PinThipSafe.modal.warning(`⚠️ รหัสพนักงาน "${newId}" นี้มีในระบบแล้ว!`);
        return;
      }

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
        } else {
          console.error('Edit employee update failed:', err);
          PinThipSafe.modal.error('บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง');
        }
      });
    }, (empErr) => {
      console.error('Edit employee duplicate-check failed:', empErr);
      PinThipSafe.modal.error('ตรวจสอบรหัสพนักงานไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง');
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

  // ฟังก์ชันอนุมัติ/ไม่อนุมัติแบบเร็วในหน้าประวัติ
  function quickApproveFuel(key, approve) {
    const amountInput = document.getElementById(`quickFuelAmount_${key}`);
    const amountVal = amountInput?.value.trim() || '';

    if (approve && (!amountVal || Number(amountVal) <= 0)) {
      PinThipSafe.modal.warning('กรุณากรอกจำนวนเงินอนุมัติให้ถูกต้อง');
      return;
    }

    const newStatus = approve ? 'อนุมัติแล้ว 🟢' : 'ไม่อนุมัติ 🔴';
    const confirmMsg = approve 
      ? `ยืนยันการอนุมัติเบิกจ่ายจำนวน ${Number(amountVal).toLocaleString()} บาท?`
      : 'ยืนยันไม่อนุมัติรายการนี้?';

    if (!confirm(confirmMsg)) return;

    window.db.ref('fuel_requests/' + key).update({
      status: newStatus,
      amount: Number(amountVal || 0)
    }, (err) => {
      if (!err) {
        PinThipSafe.modal.success(approve ? '✅ อนุมัติเรียบร้อย' : '❌ บันทึกการไม่อนุมัติเรียบร้อย');
        // Reload หน้าประวัติ
        setTimeout(() => {
          renderFuelHistoryList();
        }, 800);
      } else {
        console.error('Quick approve/reject failed:', err);
        PinThipSafe.modal.error('บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง');
      }
    });
  }

  window.quickApproveFuel = quickApproveFuel;
  window.loadCarPlatesManagementList = loadCarPlatesManagementList;
  window.filterCarExpense = filterCarExpense;
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
