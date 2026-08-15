(function () {
  function getDb() {
    return window.db;
  }

  function getCurrentUser() {
    return window.currentUser;
  }

  function getCurrentLang() {
    return window.currentLang || 'TH';
  }

  function getLocalDateTimeString() {
    return window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);
  }

  function showAdminDeliveryHistory() {
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
    if (pageTitle) pageTitle.innerText = '📜 ประวัติการส่งของย้อนหลัง';
    if (listBox) listBox.style.display = 'none';
    if (status) status.innerHTML = (window.i18n && window.i18n[getCurrentLang()]) ? window.i18n[getCurrentLang()].checking : 'กำลังโหลด...';

    const todayStr = getLocalDateTimeString();
    const html = `
      <h2>📜 ประวัติการจัดส่งสินค้า (จ๊อบส่งหมูสด) ย้อนหลัง</h2>
      <div style="background:#eef2f5; padding:12px; border-radius:10px; margin-bottom:15px; text-align:left;">
        <b>📅 เลือกวันที่ต้องการดูประวัติการส่งของ:</b>
        <div style="display:flex; gap:10px; margin-top:5px;">
          <div style="flex:1;">
            <input type="date" id="deliveryHistDate" value="${todayStr}" onchange="renderAdminDeliveryHistoryList()" style="font-weight:bold; margin:0;">
          </div>
          <button class="btn-blue" onclick="setDeliveryDateToday()" style="margin:0; padding:8px 15px; font-size:13px; width:auto;">📌 วันนี้</button>
        </div>
      </div>
      <div id="adminDeliveryHistContainer"></div>
      <button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดสบอร์ด</button>
    `;

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
    renderAdminDeliveryHistoryList();
  }

  function setDeliveryDateToday() {
    const todayStr = getLocalDateTimeString();
    const deliveryHistDate = document.getElementById('deliveryHistDate');
    if (deliveryHistDate) {
      deliveryHistDate.value = todayStr;
    }
    renderAdminDeliveryHistoryList();
  }

  function renderAdminDeliveryHistoryList() {
    const selectedDate = document.getElementById('deliveryHistDate')?.value;
    const container = document.getElementById('adminDeliveryHistContainer');
    if (!container || !selectedDate) return;

    container.innerHTML = (window.i18n && window.i18n[getCurrentLang()]) ? window.i18n[getCurrentLang()].checking : 'กำลังโหลด...';

    getDb().ref('delivery_jobs/' + selectedDate).once('value', (snapshot) => {
      const status = document.getElementById('status');
      if (status) status.innerHTML = '';
      const jobsObj = snapshot.val() || {};
      const list = Object.keys(jobsObj).map((k) => ({ key: k, ...jobsObj[k] }));

      if (list.length === 0) {
        container.innerHTML = `<div style="color:#888; text-align:center; padding:20px;">ไม่มีบันทึกการส่งของในวันที่ ${selectedDate}</div>`;
        return;
      }

      const completedCount = list.filter((j) => String(j.status).includes('สำเร็จ')).length;
      let html = `
        <div style="background: #f8f9fa; border: 1px solid #dee2e6; padding: 12px 15px; border-radius: 10px; margin-bottom: 15px; text-align: left; font-size: 14px;">
          <b>📊 สรุปผลวันที่ ${selectedDate}:</b> ส่งสำเร็จแล้ว <b>${completedCount} / ${list.length} ร้าน</b>
        </div>
      `;

      list.forEach((j) => {
        const isCompleted = String(j.status).includes('สำเร็จ');
        const isOnTheWay = String(j.status).includes('กำลังเดินทาง');
        const badgeColor = isCompleted ? '#28a745' : (isOnTheWay ? '#0d6efd' : '#e67e22');
        const viewPhotoBtn = j.photoUrl ? `<a href="${j.photoUrl}" target="_blank" class="btn-blue" style="display:inline-block; margin-top:6px; padding:6px 12px; font-size:12px; text-decoration:none; border-radius:6px;">🖼️ ดูรูปหลักฐานจาก Google Drive</a>` : '<span style="color:#888; font-size:12px;">(ยังไม่มีรูปแนบ)</span>';

        html += `
          <div class="history-item" style="border-left: 4px solid ${badgeColor};">
            <b>🚚 พนักงาน: ${j.driverName}</b><br>
            🏬 ร้าน/ลูกค้า: <b>${j.customerName}</b><br>
            สถานะ: <b style="color:${badgeColor};">${j.status} (${j.deliveredTime})</b><br>
            ${viewPhotoBtn}
          </div>
        `;
      });

      container.innerHTML = html;
    });
  }

  function showCustomerManagementPanel() {
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
    if (pageTitle) pageTitle.innerText = '🏬 จัดการฐานข้อมูลลูกค้า (ร้านค้าส่งหมู)';
    if (listBox) listBox.style.display = 'none';
    if (status) status.innerHTML = (window.i18n && window.i18n[getCurrentLang()]) ? window.i18n[getCurrentLang()].checking : 'กำลังโหลด...';

    getDb().ref('customers').once('value', (snapshot) => {
      const statusEl = document.getElementById('status');
      if (statusEl) statusEl.innerHTML = '';
      const custObj = snapshot.val() || {};
      const custList = Object.keys(custObj).map((k) => ({ key: k, ...custObj[k] }));

      const html = `
        <h2>🏬 รายชื่อร้านค้า/ลูกค้าทั้งหมดในระบบ</h2>
        <div style="background: #eef2f5; padding: 15px; border-radius: 12px; margin-bottom: 20px; text-align: left; border: 2px dashed #0d6efd;">
          <b>➕ เพิ่มลูกค้า/ร้านค้าใหม่:</b>
          <input type="text" id="newCustName" placeholder="ชื่อร้าน / ชื่อลูกค้า (เช่น เจ๊ I, ตลาดสดโซน A)" style="margin-top:6px; font-weight:bold;">
          <input type="text" id="newCustPhone" placeholder="เบอร์โทรศัพท์ (ถ้ามี)" style="margin-top:4px;">
          <input type="text" id="newCustAddress" placeholder="โซน / ที่อยู่คร่าวๆ" style="margin-top:4px;">
          <button class="btn-blue" onclick="addNewCustomer()" style="margin-top:8px;">💾 บันทึกลูกค้าใหม่</button>
        </div>
        <div id="customerListContainer"></div>
        <button class="btn-back" onclick="showAdminJobAssignPanel()" style="margin-top:15px;">⬅️ กลับหน้าจัดการจ๊อบส่งของ</button>
      `;

      const mainContent = document.getElementById('mainContent');
      if (mainContent) mainContent.innerHTML = html;
      renderCustomerListUI(custList);
    });
  }

  function renderCustomerListUI(list) {
    const container = document.getElementById('customerListContainer');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = '<div style="color:#888; text-align:center; padding:15px;">ยังไม่มีข้อมูลร้านค้าในระบบ (กรุณาเพิ่มด้านบน)</div>';
      return;
    }

    let html = '';
    list.forEach((c) => {
      const addedByText = c.addedBy ? ` | 👤 เพิ่มโดย: ${c.addedBy}` : '';
      html += `
        <div class="history-item" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <b>🏬 ${c.name}</b><br>
            <span style="color:#6c757d; font-size:12px;">📞 โทร: ${c.phone || '-'} | 📍 โซน: ${c.address || '-'}${addedByText}</span>
          </div>
          <div>
            <button class="btn-danger" style="width:auto; margin:0; padding:6px 12px; font-size:12px;" onclick="deleteCustomer('${c.key}')">🗑️ ลบ</button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  function addNewCustomer() {
    const name = document.getElementById('newCustName')?.value.trim();
    const phone = document.getElementById('newCustPhone')?.value.trim();
    const address = document.getElementById('newCustAddress')?.value.trim();

    if (!name) {
      window.alert('กรุณากรอกชื่อร้านค้าหรือลูกค้า');
      return;
    }

    getDb().ref('customers').push().set({ name, phone, address, addedBy: 'Admin', regularDriverId: 'ALL' }, (err) => {
      if (!err) {
        showCustomerManagementPanel();
      }
    });
  }

  function deleteCustomer(key) {
    window.showModal('❓ ยืนยันการลบ', 'ต้องการลบร้านค้านี้ออกจากระบบใช่หรือไม่?', `<button class="btn-yes" onclick="executeDeleteCustomer('${key}')">ใช่, ลบ</button><button class="btn-no" onclick="closeModal()">ยกเลิก</button>`);
  }

  function executeDeleteCustomer(key) {
    getDb().ref('customers/' + key).remove(() => {
      window.closeModal();
      showCustomerManagementPanel();
    });
  }

  function showAdminJobAssignPanel() {
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
    if (pageTitle) pageTitle.innerText = '📦 จัดการ & มอบหมายจ๊อบส่งของประจำวัน';
    if (listBox) listBox.style.display = 'none';
    if (status) status.innerHTML = (window.i18n && window.i18n[getCurrentLang()]) ? window.i18n[getCurrentLang()].checking : 'กำลังโหลด...';

    const todayStr = getLocalDateTimeString();

    getDb().ref('employees').once('value', (empSnap) => {
      const empObj = empSnap.val() || {};
      const driversList = Object.keys(empObj)
        .map((k) => empObj[k])
        .filter((emp) => emp.isDriver);

      getDb().ref('customers').once('value', (custSnap) => {
        const custObj = custSnap.val() || {};
        const custList = Object.keys(custObj).map((k) => ({ key: k, ...custObj[k] }));

        getDb().ref('routes_preset').once('value', (presetSnap) => {
          const presetObj = presetSnap.val() || {};

          getDb().ref('delivery_jobs/' + todayStr).once('value', (jobSnap) => {
            const todayJobsObj = jobSnap.val() || {};
            const statusEl = document.getElementById('status');
            if (statusEl) statusEl.innerHTML = '';

            let driverOptions = '<option value="">-- เลือกพนักงานขับรถ --</option>';
            driversList.forEach((d) => {
              driverOptions += `<option value="${d.empId}" data-name="${d.empName}">${d.empName} (${d.empId})</option>`;
            });

            let presetOptions = '<option value="">-- เลือกโหลดเส้นทางประจำ (Preset) --</option>';
            Object.keys(presetObj).forEach((pk) => {
              const p = presetObj[pk];
              presetOptions += `<option value="${pk}">${p.routeName} (สำหรับ ${p.driverName})</option>`;
            });

            let customerCheckboxesHtml = '';
            if (custList.length === 0) {
              customerCheckboxesHtml = '<div style="color:#888; font-size:13px;">ยังไม่มีรายชื่อลูกค้าในระบบ</div>';
            } else {
              custList.forEach((c) => {
                customerCheckboxesHtml += `
                  <label style="display:flex; align-items:center; gap:8px; margin:4px 0; font-size:14px; background:white; padding:6px 10px; border-radius:6px; border:1px solid #ddd; cursor:pointer;">
                    <input type="checkbox" class="cust-checkbox" value="${c.name}" style="width:18px; height:18px; margin:0;">
                    <span>🏬 ${c.name} (${c.address || 'ทั่วไป'})</span>
                  </label>
                `;
              });
            }

            const html = `
              <h2>📦 จัดการจ๊อบส่งของประจำวันนี้: <b style="color:#0d6efd;">${todayStr}</b></h2>
              <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 12px; padding: 15px; margin-bottom: 20px; text-align: left;">
                <b>➕ มอบหมายจ๊อบให้พนักงาน (เลือกคนขับ + ติ๊กเลือกร้านค้า):</b>
                <div style="margin-top:8px;">
                  <span style="font-size:12px; color:#555;">1. เลือกพนักงานขับรถ:</span>
                  <select id="assignDriverSelect" style="font-weight:bold;">${driverOptions}</select>
                </div>
                <div style="margin-top:6px;">
                  <span style="font-size:12px; color:#555;">(ทางเลือก) โหลดเส้นทางประจำ:</span>
                  <select id="assignPresetSelect" onchange="loadPresetRouteToForm()">${presetOptions}</select>
                </div>
                <div style="margin-top:10px;">
                  <span style="font-size:12px; color:#555;">2. ติ๊กเลือกร้านค้าที่ต้องไปส่งในวันนี้:</span>
                  <div style="max-height: 180px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; border-radius: 8px; background: #fff;">
                    ${customerCheckboxesHtml}
                  </div>
                </div>
                <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                  <button class="btn-fuel" onclick="saveAssignedJobs()" style="margin:0; flex:2; min-width:180px;">💾 บันทึกจ๊อบส่ง</button>
                  <button class="btn-purple" onclick="saveAsPresetRoute()" style="margin:0; flex:1; font-size:13px; min-width:140px;" title="บันทึกรายการที่ติ๊กไว้เป็นเส้นทางประจำของคนนี้">📌 บันทึกเส้นทาง</button>
                  <button class="btn-blue" onclick="showCustomerManagementPanel()" style="margin:0; flex:1; font-size:13px; min-width:140px;">🏬 จัดการฐานข้อมูลลูกค้า</button>
                </div>
              </div>
              <h3>📋 สรุปสถานะการส่งของพนักงานวันนี้ & จัดการแก้ไข:</h3>
              <div id="todayJobsOverviewContainer"></div>
              <button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดสบอร์ด</button>
            `;

            const mainContent = document.getElementById('mainContent');
            if (mainContent) mainContent.innerHTML = html;
            renderTodayJobsOverviewAdminEditable(todayJobsObj, driversList);
          });
        });
      });
    });
  }

  function loadPresetRouteToForm() {
    const presetId = document.getElementById('assignPresetSelect')?.value;
    if (!presetId) return;

    getDb().ref('routes_preset/' + presetId).once('value', (snapshot) => {
      const preset = snapshot.val();
      if (!preset || !preset.customers) return;

      const driverSelect = document.getElementById('assignDriverSelect');
      if (driverSelect) driverSelect.value = preset.driverId;

      const checkboxes = document.querySelectorAll('.cust-checkbox');
      checkboxes.forEach((cb) => {
        cb.checked = preset.customers.includes(cb.value);
      });
    });
  }

  function saveAsPresetRoute() {
    const driverSelect = document.getElementById('assignDriverSelect');
    const driverId = driverSelect?.value;
    if (!driverId) {
      window.alert('กรุณาเลือกพนักงานขับรถก่อนบันทึกเป็นเส้นทางประจำ');
      return;
    }
    const driverName = driverSelect.options[driverSelect.selectedIndex].getAttribute('data-name');

    const checkboxes = document.querySelectorAll('.cust-checkbox:checked');
    const selectedCusts = Array.from(checkboxes).map((cb) => cb.value);

    if (selectedCusts.length === 0) {
      window.alert('กรุณาติ๊กเลือกร้านค้าอย่างน้อย 1 ร้าน');
      return;
    }

    const routeName = window.prompt('ตั้งชื่อเส้นทางประจำนี้ (เช่น รอบส่งตลาดสดเช้า):', `${driverName} - สายประจำ`);
    if (!routeName) return;

    getDb().ref('routes_preset').push().set({
      routeName,
      driverId,
      driverName,
      customers: selectedCusts
    }, (err) => {
      if (!err) {
        window.showModal('🎉 สำเร็จ', 'บันทึกเป็นเส้นทางประจำเรียบร้อย', '<button class="btn-ok" onclick="closeModal(); showAdminJobAssignPanel();">ตกลง</button>');
      }
    });
  }

  function saveAssignedJobs() {
    const driverSelect = document.getElementById('assignDriverSelect');
    const driverId = driverSelect?.value;
    if (!driverId) {
      window.alert('กรุณาเลือกพนักงานขับรถ');
      return;
    }
    const driverName = driverSelect.options[driverSelect.selectedIndex].getAttribute('data-name');

    const checkboxes = document.querySelectorAll('.cust-checkbox:checked');
    const selectedCusts = Array.from(checkboxes).map((cb) => cb.value);

    if (selectedCusts.length === 0) {
      window.alert('กรุณาติ๊กเลือกร้านค้าที่ต้องไปส่ง');
      return;
    }

    const todayStr = getLocalDateTimeString();
    const jobsRef = getDb().ref('delivery_jobs/' + todayStr);

    selectedCusts.forEach((custName) => {
      jobsRef.push({
        driverId,
        driverName,
        customerName: custName,
        status: 'รอจัดส่ง ⏳',
        deliveredTime: '-'
      });
    });

    window.showModal('🎉 สำเร็จ', `มอบหมายจ๊อบส่งของให้ "${driverName}" จำนวน ${selectedCusts.length} ร้าน เรียบร้อย`, '<button class="btn-ok" onclick="closeModal(); showAdminJobAssignPanel();">ตกลง</button>');
  }

  function renderTodayJobsOverviewAdminEditable(jobsObj, driversList) {
    const container = document.getElementById('todayJobsOverviewContainer');
    if (!container) return;

    const list = Object.keys(jobsObj).map((k) => ({ key: k, ...jobsObj[k] }));
    if (list.length === 0) {
      container.innerHTML = '<div style="color:#888; font-size:13px; text-align:center; padding:10px;">ยังไม่มีการมอบหมายจ๊อบส่งของในวันนี้</div>';
      return;
    }

    const grouped = {};
    driversList.forEach((d) => {
      grouped[d.empId] = { name: d.empName, jobs: [] };
    });

    list.forEach((j) => {
      if (!grouped[j.driverId]) grouped[j.driverId] = { name: j.driverName, jobs: [] };
      grouped[j.driverId].jobs.push(j);
    });

    let html = '';
    Object.keys(grouped).forEach((did) => {
      const g = grouped[did];
      if (g.jobs.length === 0) return;

      const completedCount = g.jobs.filter((j) => String(j.status).includes('สำเร็จ')).length;
      html += `
        <div class="history-item">
          <b>🚚 พนักงาน: ${g.name}</b> (ส่งแล้ว ${completedCount} / ${g.jobs.length} ร้าน)<br>
          <div style="margin-top:6px; display:flex; flex-direction:column; gap:6px;">
      `;

      g.jobs.forEach((j) => {
        const isCompleted = String(j.status).includes('สำเร็จ');
        const isOnTheWay = String(j.status).includes('กำลังเดินทาง');
        const badgeColor = isCompleted ? '#28a745' : (isOnTheWay ? '#0d6efd' : '#e67e22');
        const viewPhotoBtn = j.photoUrl ? `<a href="${j.photoUrl}" target="_blank" class="btn-blue" style="display:inline-block; margin-top:4px; padding:4px 8px; font-size:11px; text-decoration:none; border-radius:4px;">🖼️ ดูรูป Drive</a>` : '';

        html += `
          <div style="background:white; padding:8px 10px; border-radius:6px; border:1px solid #ddd; display:flex; justify-content:space-between; align-items:center; font-size:13px;">
            <div>
              🏬 <b>${j.customerName}</b><br>
              <span style="color:${badgeColor}; font-weight:bold;">${j.status} (${j.deliveredTime})</span>
              ${viewPhotoBtn}
            </div>
            <div style="display:flex; gap:4px;">
              <button class="btn-blue" style="width:auto; margin:0; padding:4px 8px; font-size:11px;" onclick="adminToggleJobStatus('${j.key}', '${j.status}')">🔄 สลับสถานะ</button>
              <button class="btn-danger" style="width:auto; margin:0; padding:4px 8px; font-size:11px;" onclick="adminDeleteJob('${j.key}')">🗑️ ลบ</button>
            </div>
          </div>
        `;
      });

      html += '</div></div>';
    });

    container.innerHTML = html;
  }

  function adminToggleJobStatus(jobKey, currentStatus) {
    const todayStr = getLocalDateTimeString();
    const newStatus = String(currentStatus).includes('สำเร็จ') ? 'รอจัดส่ง ⏳' : 'ส่งสำเร็จแล้ว 🟢';
    const timeStr = String(currentStatus).includes('สำเร็จ') ? '-' : `${new Date().toTimeString().substring(0, 5)} น.`;

    getDb().ref(`delivery_jobs/${todayStr}/${jobKey}`).update({
      status: newStatus,
      deliveredTime: timeStr
    }, () => {
      const pageTitle = document.getElementById('pageTitle')?.innerText || '';
      if (pageTitle.includes('ศูนย์บัญชาการ')) {
        window.showAdminCommandCenter();
      } else if (pageTitle.includes('จัดการ')) {
        window.showAdminJobAssignPanel();
      } else {
        window.showDriverMyJobsView();
      }
    });
  }

  function adminDeleteJob(jobKey) {
    const todayStr = getLocalDateTimeString();
    if (window.confirm('ต้องการลบจ๊อบส่งของนี้ใช่หรือไม่?')) {
      getDb().ref(`delivery_jobs/${todayStr}/${jobKey}`).remove(() => {
        window.showAdminJobAssignPanel();
      });
    }
  }

  function showDriverMyJobsView() {
    const currentUser = getCurrentUser();
    const t = (window.i18n && window.i18n[getCurrentLang()]) || { btnBack: 'กลับ' };
    document.getElementById('pageTitle').innerText = '📦 งานส่งของของฉันวันนี้';
    document.getElementById('listBox').style.display = 'none';
    const todayStr = getLocalDateTimeString();

    const html = `
      <div class="user-banner">${currentUser.empName} (${currentUser.empId}) | วันที่: ${todayStr}</div>

      <div style="background: #eef2f5; border: 2px dashed #0d6efd; padding: 12px; border-radius: 10px; margin-bottom: 15px; text-align: left;">
        <b>➕ เพิ่มร้านค้า/สถานที่ส่งของใหม่ (เข้าสู่ระบบ):</b>
        <input type="text" id="driverNewCustName" placeholder="ชื่อร้านค้า / ลูกค้า" style="margin-top:6px; font-weight:bold;">
        <input type="text" id="driverNewCustPhone" placeholder="เบอร์โทรศัพท์ (ถ้ามี)" style="margin-top:4px;">
        <input type="text" id="driverNewCustZone" placeholder="โซน / ที่อยู่ (เช่น ตลาดสดโซน B)" style="margin-top:4px;">
        <button class="btn-blue" onclick="driverAddNewCustomerOnly()" style="margin-top:6px; font-size:14px; padding:10px;">💾 บันทึกเก็บไว้เป็นลูกค้าประจำของฉัน</button>
      </div>

      <div style="background: #f8f9fa; border: 1px solid #ced4da; padding: 12px; border-radius: 10px; margin-bottom: 15px; text-align: left;">
        <b>⭐ เลือกจาก "ลูกค้าประจำของฉัน" (ติ๊กเลือกหลายร้านพร้อมกัน):</b>
        <div style="max-height: 180px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; border-radius: 8px; background: #fff; margin-top:6px;" id="driverRegularCustCheckboxContainer">
          <span style="color:#888; font-size:13px;">กำลังโหลดรายชื่อลูกค้าประจำ...</span>
        </div>
        <button class="btn-fuel" onclick="driverAddMultipleJobsFromRegular()" style="margin-top:8px; font-size:14px; padding:10px;">➕ ดึงร้านที่เลือกไปส่งวันนี้ทั้งหมด</button>
      </div>

      <h3>📦 รายการจ๊อบส่งของวันนี้:</h3>
      <div id="driverMyJobsContainer"><div style="color:#888;">กำลังโหลดรายการจ๊อบส่งของ...</div></div>
      <button class="btn-back" onclick="showDashboard()">${t.btnBack}</button>
    `;

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
    loadDriverRegularCustomersCheckboxes();

    getDb().ref('delivery_jobs/' + todayStr).on('value', (snapshot) => {
      const jobsObj = snapshot.val() || {};
      const container = document.getElementById('driverMyJobsContainer');
      if (!container) return;

      const myList = Object.keys(jobsObj)
        .map((k) => ({ key: k, ...jobsObj[k] }))
        .filter((j) => String(j.driverId) === String(currentUser.empId));

      if (myList.length === 0) {
        container.innerHTML = '<div style="color:#888; text-align:center; padding:20px;">🎉 วันนี้คุณยังไม่มีจ๊อบส่งของ (สามารถติ๊กเลือกจากลูกค้าประจำด้านบนได้เลย)</div>';
        return;
      }

      let htmlList = '';
      myList.forEach((j) => {
        const isCompleted = String(j.status).includes('สำเร็จ');
        const isOnTheWay = String(j.status).includes('กำลังเดินทาง');
        const badgeColor = isCompleted ? '#28a745' : (isOnTheWay ? '#0d6efd' : '#e67e22');
        const viewPhotoLink = j.photoUrl ? `<a href="${j.photoUrl}" target="_blank" class="btn-blue" style="display:inline-block; margin-top:6px; padding:6px 12px; font-size:12px; text-decoration:none; border-radius:6px;">🖼️ ดูรูปที่แนบไว้แล้ว</a>` : '<span style="color:#888; font-size:12px;">(ยังไม่มีรูปแนบ)</span>';

        let actionBtnHtml = '';
        if (isCompleted) {
          actionBtnHtml = '<button class="btn-clock" style="margin:0; padding:8px; font-size:13px; flex:1;" disabled>✅ ส่งเรียบร้อยแล้ว</button>';
        } else if (isOnTheWay) {
          actionBtnHtml = `<button class="btn-blue" style="margin:0; padding:8px; font-size:13px; flex:1; background:linear-gradient(135deg, #0d6efd, #0dcaf0);" onclick="driverMarkAsDelivered('${j.key}')">✅ กดส่งของเสร็จแล้ว</button>`;
        } else {
          actionBtnHtml = `<button class="btn-orange" style="margin:0; padding:8px; font-size:13px; flex:1;" onclick="driverMarkAsOnTheWay('${j.key}')">🚚 กำลังไปส่ง</button>`;
        }

        htmlList += `
          <div class="history-item" style="border-left: 4px solid ${badgeColor};">
            <b>🏬 ร้าน/ลูกค้า: ${j.customerName}</b><br>
            สถานะ: <b style="color:${badgeColor};">${j.status} (${j.deliveredTime})</b><br>
            <div style="margin-top:6px;">${viewPhotoLink}</div><br>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              ${actionBtnHtml}
              <label class="btn-fuel" style="margin:0; padding:8px; font-size:13px; flex:1; text-align:center; border-radius:8px; cursor:pointer; display:inline-block; box-sizing:border-box;">
                📸 ถ่ายรูปหลักฐาน
                <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="uploadDeliveryPhotoToDrive(event, '${j.key}', '${j.customerName}')">
              </label>
              <button class="btn-danger" style="width:auto; margin:0; padding:8px 12px; font-size:12px;" onclick="driverDeleteMyJob('${j.key}')">🗑️ ลบ</button>
            </div>
          </div>
        `;
      });

      container.innerHTML = htmlList;
    });
  }

  function loadDriverRegularCustomersCheckboxes() {
    const container = document.getElementById('driverRegularCustCheckboxContainer');
    if (!container) return;

    getDb().ref('customers').once('value', (snapshot) => {
      const custObj = snapshot.val() || {};
      const currentUser = getCurrentUser();
      const myCustomers = Object.keys(custObj)
        .map((k) => custObj[k])
        .filter((customer) => customer.regularDriverId === currentUser.empId || customer.regularDriverId === 'ALL' || customer.addedBy === currentUser.empName);

      if (myCustomers.length === 0) {
        container.innerHTML = '<span style="color:#888; font-size:13px; font-style:italic;">ยังไม่มีลูกค้าประจำ (สามารถเพิ่มร้านใหม่ด้านบนได้เลย)</span>';
        return;
      }

      let html = '';
      myCustomers.forEach((c) => {
        html += `
          <label style="display:flex; align-items:center; gap:8px; margin:4px 0; font-size:14px; background:#fff; padding:6px 8px; border-radius:6px; border:1px solid #e9ecef; cursor:pointer;">
            <input type="checkbox" class="driver-cust-checkbox" value="${c.name}" style="width:18px; height:18px; margin:0;">
            <span>🏬 ${c.name} (${c.address || 'ลูกค้าประจำ'})</span>
          </label>
        `;
      });
      container.innerHTML = html;
    });
  }

  function driverAddMultipleJobsFromRegular() {
    const checkboxes = document.querySelectorAll('.driver-cust-checkbox:checked');
    const selectedCusts = Array.from(checkboxes).map((cb) => cb.value);

    if (selectedCusts.length === 0) {
      window.alert('กรุณาติ๊กเลือกร้านค้าอย่างน้อย 1 ร้าน');
      return;
    }

    const todayStr = getLocalDateTimeString();
    const jobsRef = getDb().ref('delivery_jobs/' + todayStr);

    selectedCusts.forEach((custName) => {
      jobsRef.push({
        driverId: getCurrentUser().empId,
        driverName: getCurrentUser().empName,
        customerName: custName,
        status: 'รอจัดส่ง ⏳',
        deliveredTime: '-'
      });
    });

    window.showModal('🎉 สำเร็จ', `ดึงรายชื่อลูกค้า ${selectedCusts.length} ร้าน มาเป็นจ๊อบส่งของวันนี้เรียบร้อย`, '<button class="btn-ok" onclick="closeModal(); showDriverMyJobsView();">ตกลง</button>');
  }

  function driverAddNewCustomerOnly() {
    const name = document.getElementById('driverNewCustName')?.value.trim();
    const phone = document.getElementById('driverNewCustPhone')?.value.trim();
    const address = document.getElementById('driverNewCustZone')?.value.trim();

    if (!name) {
      window.alert('กรุณากรอกชื่อร้านค้าหรือลูกค้าใหม่');
      return;
    }

    getDb().ref('customers').push().set({
      name,
      phone,
      address: address || 'เพิ่มโดยพนักงาน',
      addedBy: getCurrentUser().empName,
      regularDriverId: getCurrentUser().empId
    }, (err) => {
      if (!err) {
        document.getElementById('driverNewCustName').value = '';
        document.getElementById('driverNewCustPhone').value = '';
        document.getElementById('driverNewCustZone').value = '';
        loadDriverRegularCustomersCheckboxes();
        window.alert('บันทึกเป็นลูกค้าประจำของคุณเรียบร้อย!');
      }
    });
  }

  function driverMarkAsOnTheWay(jobKey) {
    const todayStr = getLocalDateTimeString();
    const timeStr = `${new Date().toTimeString().substring(0, 5)} น.`;

    getDb().ref(`delivery_jobs/${todayStr}/${jobKey}`).update({
      status: 'กำลังเดินทางไปส่ง 🚚',
      deliveredTime: timeStr
    });
  }

  function driverMarkAsDelivered(jobKey) {
    const todayStr = getLocalDateTimeString();
    const timeStr = `${new Date().toTimeString().substring(0, 5)} น.`;

    getDb().ref(`delivery_jobs/${todayStr}/${jobKey}`).update({
      status: 'ส่งสำเร็จแล้ว 🟢',
      deliveredTime: timeStr
    });
  }

  function driverDeleteMyJob(jobKey) {
    const todayStr = getLocalDateTimeString();
    if (window.confirm('ต้องการลบรายการส่งของนี้ออก?')) {
      getDb().ref(`delivery_jobs/${todayStr}/${jobKey}`).remove();
    }
  }

  function showDashboard() {
    window.isAdmin = false;
    const mainCard = document.getElementById('mainCard');
    if (mainCard) mainCard.classList.remove('admin-wide');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (hamburgerBtn) hamburgerBtn.style.display = 'none';
    const t = (window.i18n && window.i18n[getCurrentLang()]) || { pageTitleDashboard: 'Dashboard' };
    const pageTitle = document.getElementById('pageTitle');
    const status = document.getElementById('status');
    const listBox = document.getElementById('listBox');
    if (pageTitle) pageTitle.innerText = t.pageTitleDashboard;
    if (status) status.innerText = '';
    if (listBox) listBox.style.display = 'block';

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = window.PinThipSafe.employeeDashboard.buildDashboardHtml(getCurrentUser(), t);
    if (typeof window.updateClockInStatus === 'function') {
      window.updateClockInStatus();
    }
    if (typeof window.loadTodayListRealtime === 'function') {
      window.loadTodayListRealtime();
    }
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.adminJobOps = {
    showAdminDeliveryHistory,
    setDeliveryDateToday,
    renderAdminDeliveryHistoryList,
    showCustomerManagementPanel,
    renderCustomerListUI,
    addNewCustomer,
    deleteCustomer,
    executeDeleteCustomer,
    showAdminJobAssignPanel,
    loadPresetRouteToForm,
    saveAsPresetRoute,
    saveAssignedJobs,
    renderTodayJobsOverviewAdminEditable,
    adminToggleJobStatus,
    adminDeleteJob,
    showDriverMyJobsView,
    loadDriverRegularCustomersCheckboxes,
    driverAddMultipleJobsFromRegular,
    driverAddNewCustomerOnly,
    driverMarkAsOnTheWay,
    driverMarkAsDelivered,
    driverDeleteMyJob,
    showDashboard
  };

  window.showAdminDeliveryHistory = showAdminDeliveryHistory;
  window.setDeliveryDateToday = setDeliveryDateToday;
  window.renderAdminDeliveryHistoryList = renderAdminDeliveryHistoryList;
  window.showCustomerManagementPanel = showCustomerManagementPanel;
  window.renderCustomerListUI = renderCustomerListUI;
  window.addNewCustomer = addNewCustomer;
  window.deleteCustomer = deleteCustomer;
  window.executeDeleteCustomer = executeDeleteCustomer;
  window.showAdminJobAssignPanel = showAdminJobAssignPanel;
  window.loadPresetRouteToForm = loadPresetRouteToForm;
  window.saveAsPresetRoute = saveAsPresetRoute;
  window.saveAssignedJobs = saveAssignedJobs;
  window.renderTodayJobsOverviewAdminEditable = renderTodayJobsOverviewAdminEditable;
  window.adminToggleJobStatus = adminToggleJobStatus;
  window.adminDeleteJob = adminDeleteJob;
  window.showDriverMyJobsView = showDriverMyJobsView;
  window.loadDriverRegularCustomersCheckboxes = loadDriverRegularCustomersCheckboxes;
  window.driverAddMultipleJobsFromRegular = driverAddMultipleJobsFromRegular;
  window.driverAddNewCustomerOnly = driverAddNewCustomerOnly;
  window.driverMarkAsOnTheWay = driverMarkAsOnTheWay;
  window.driverMarkAsDelivered = driverMarkAsDelivered;
  window.driverDeleteMyJob = driverDeleteMyJob;
  window.showDashboard = showDashboard;
})();
