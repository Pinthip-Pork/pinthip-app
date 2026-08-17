(function () {
  function showAdminDashboard() {
    window.isAdmin = true;
    const mainCard = document.getElementById('mainCard');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bellBtn = document.getElementById('bellBtn');
    const pageTitle = document.getElementById('pageTitle');
    const status = document.getElementById('status');
    const listBox = document.getElementById('listBox');

    if (mainCard) mainCard.classList.add('admin-wide');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';
    if (bellBtn) bellBtn.style.display = 'block';
    if (typeof updatePendingDevicesBadge === 'function') updatePendingDevicesBadge();

    const t = (window.i18n && window.i18n[window.currentLang]) || { pageTitleAdminDashboard: 'Admin Dashboard' };
    if (pageTitle) pageTitle.innerText = t.pageTitleAdminDashboard;
    if (status) status.innerText = '';
    if (listBox) listBox.style.display = 'block';

    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);

    Promise.all([
      window.db.ref('employees').once('value'),
      window.PinThipSafe.logsRepo.fetchLogsForRange(window.db, todayStr, todayStr),
      window.db.ref('leaves').once('value'),
      window.db.ref('fuel_requests').once('value')
    ]).then(([empSnap, logsObj, leaveSnap, fuelSnap]) => {
      const employeesObj = empSnap.val() || {};
      const leavesObj = leaveSnap.val() || {};
      const fuelObj = fuelSnap.val() || {};

      const approvedLeaveEmployeeIds = new Set(
        Object.values(leavesObj)
          .filter((leave) => String(leave.status || '').includes('อนุมัติแล้ว') && leave.startDate <= todayStr && leave.endDate >= todayStr)
          .map((leave) => String(leave.empId))
      );
      let presentToday = 0;
      let todaySalaryTotal = 0;
      const countedEmployeeIds = new Set();

      Object.values(logsObj).forEach((log) => {
        const employeeId = String(log.empId);
        if (log.date !== todayStr || log.type !== 'เข้างาน' || approvedLeaveEmployeeIds.has(employeeId) || countedEmployeeIds.has(employeeId)) return;

        const employee = Object.values(employeesObj).find((emp) => String(emp.empId) === employeeId);
        if (!employee) return;

        countedEmployeeIds.add(employeeId);
        presentToday++;
        todaySalaryTotal += Number(employee.dailyRate || 0);
      });

      let pendingFuel = 0;
      let todayFuelOnlyTotal = 0;
      let todayRepairOnlyTotal = 0;
      let todayFuelPendingTotal = 0;
      let todayRepairPendingTotal = 0;

      Object.values(fuelObj).forEach((f) => {
        const statusStr = String(f.status || '');
        const reqType = f.requestType || 'เบิกค่าน้ำมัน';
        if (statusStr.includes('รออนุมัติ')) pendingFuel++;
        if (f.date === todayStr) {
          const amt = Number(f.amount || 0);
          if (statusStr.includes('อนุมัติแล้ว')) {
            if (reqType.includes('ซ่อม')) {
              todayRepairOnlyTotal += amt;
            } else {
              todayFuelOnlyTotal += amt;
            }
          } else if (statusStr.includes('รออนุมัติ')) {
            if (reqType.includes('ซ่อม')) {
              todayRepairPendingTotal += amt;
            } else {
              todayFuelPendingTotal += amt;
            }
          }
        }
      });

          const todayFuelAndRepairTotal = todayFuelOnlyTotal + todayRepairOnlyTotal;
          const grandTotalToday = todaySalaryTotal + todayFuelAndRepairTotal;
          const grandTotalPending = todayFuelPendingTotal + todayRepairPendingTotal;

          const html = `
            <div class="admin-content">
              <div class="admin-page-header">
                <h2>📊 ภาพรวมระบบ</h2>
                <span class="admin-date-badge">📅 ${todayStr}</span>
              </div>

              <div class="summary-cards">
                <div class="summary-card sc-emerald">
                  <div class="summary-card-label">👥 พนักงานมาทำงานวันนี้</div>
                  <div class="summary-card-value">${presentToday}</div>
                  <div class="summary-card-sub">คน</div>
                </div>
                <div class="summary-card sc-blue">
                  <div class="summary-card-label">💰 ค่าแรงวันนี้</div>
                  <div class="summary-card-value">${todaySalaryTotal.toLocaleString()}</div>
                  <div class="summary-card-sub">บาท</div>
                </div>
                <div class="summary-card sc-amber">
                  <div class="summary-card-label">⛽ ค่าน้ำมัน + ค่าซ่อม</div>
                  <div class="summary-card-value">${todayFuelAndRepairTotal.toLocaleString()}</div>
                  <div class="summary-card-sub">บาท${grandTotalPending > 0 ? ' (รออนุมัติ ' + grandTotalPending.toLocaleString() + ')' : ''}</div>
                </div>
                <div class="summary-card sc-red">
                  <div class="summary-card-label">⏳ รออนุมัติเบิกจ่าย</div>
                  <div class="summary-card-value">${pendingFuel}</div>
                  <div class="summary-card-sub">รายการ</div>
                </div>
              </div>

              <div class="total-bar">
                <span class="total-bar-label">💵 รวมค่าใช้จ่ายวันนี้</span>
                <span class="total-bar-value">${grandTotalToday.toLocaleString()} บาท</span>
                ${grandTotalPending > 0 ? '<span class="total-bar-pending">⏳ รออนุมัติ: ' + grandTotalPending.toLocaleString() + ' บาท</span>' : ''}
              </div>

              <div class="view-switcher">
                <button class="active" onclick="showAdminDashboard()">📊 แดชบอร์ด</button>
                <button onclick="showAdminCommandCenter()">📋 สถานะพนักงาน</button>
              </div>

              <div class="menu-grid">
                <div class="menu-card">
                  <div>
                    <div class="menu-card-icon">📦</div>
                    <h3>จัดการป้ายลังโฟม</h3>
                    <p>จัดการลูกค้าลังโฟมและป้ายลัง</p>
                  </div>
                  <div class="menu-card-actions">
                    <button class="btn-admin-warning" onclick="showFoamAdminView()">📦 จัดการป้ายลังโฟม</button>
                    <button class="btn-admin-slate" onclick="showFoamCustomerManager()">📦 จัดการลูกค้า</button>
                  </div>
                </div>

                <div class="menu-card">
                  <div>
                    <div class="menu-card-icon">⛽</div>
                    <h3>การเบิกค่าน้ำมัน / ค่าซ่อมรถ</h3>
                    <p>รออนุมัติ: <b style="color:#ef4444;">${pendingFuel}</b> รายการ</p>
                  </div>
                  <div class="menu-card-actions">
                    <button class="btn-admin-warning" id="dashboardFuelsButton" onclick="showAdminFuelRequests()">⛽ อนุมัติเบิกจ่าย <span class="drawer-badge" id="dashboardFuelsBadge">0</span></button>
                    <button class="btn-admin-slate" onclick="showAdminFuelHistory()">📜 ประวัติเบิกจ่าย</button>
                  </div>
                </div>

                <div class="menu-card">
                  <div>
                    <div class="menu-card-icon">🌴</div>
                    <h3>ระบบลา & อนุมัติ</h3>
                    <p>จัดการคำขอลาและตรวจสอบสถานะ</p>
                  </div>
                  <div class="menu-card-actions">
                    <button class="btn-admin-warning" id="dashboardLeavesButton" onclick="showAdminLeaves()">🌴 อนุมัติใบลา <span class="drawer-badge" id="dashboardLeavesBadge">0</span></button>
                    <button class="btn-admin-slate" onclick="showAdminLeaveHistory()">📜 ประวัติการลา</button>
                  </div>
                </div>

                <div class="menu-card">
                  <div>
                    <div class="menu-card-icon">👥</div>
                    <h3>พนักงาน & สถิติการทำงาน</h3>
                    <p>มาทำงานวันนี้: <b style="color:#10b981;">${presentToday}</b> คน</p>
                  </div>
                  <div class="menu-card-actions">
                    <button class="btn-admin-primary" onclick="showAdminAttendanceSummaryReport()">👥 สรุป ขาด ลา มาสาย</button>
                    <button class="btn-admin-slate" onclick="showAdminLogsHistory()">📜 ลงเวลาย้อนหลัง</button>
                  </div>
                </div>
              </div>

              <div class="admin-bottom-actions">
                <button class="btn-admin-success" onclick="showDailyPayroll()">💵 สรุปค่าแรงย้อนหลัง</button>
                <button class="btn-admin-purple" onclick="showAnalyticsReport()">📈 สรุปค่าใช้จ่ายประจำเดือน</button>
                <button class="btn-admin-purple" onclick="showEmpManagement()">⚙️ จัดการพนักงาน</button>
              </div>
            </div>
          `;
          const mainContent = document.getElementById('mainContent');
          if (mainContent) mainContent.innerHTML = html;
          if (typeof window.updateAdminBellBadgeCount === 'function') window.updateAdminBellBadgeCount();
          if (typeof window.loadTodayListRealtime === 'function') {
            window.loadTodayListRealtime();
          }
      });
  }

  function showAdminCommandCenter() {
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
    if (pageTitle) pageTitle.innerText = 'DASHBORD สถานะพนักงานปิ่นทิพย์';
    if (listBox) listBox.style.display = 'none';
    if (status) status.innerHTML = '';

    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);

    const html = `
      <div class="admin-content">
        <div class="admin-page-header">
          <h2>📋 สถานะพนักงานปิ่นทิพย์</h2>
          <span class="admin-date-badge">📅 ${todayStr}</span>
        </div>

        <div class="view-switcher">
          <button onclick="showAdminDashboard()">📊 แดชบอร์ด</button>
          <button class="active" onclick="showAdminCommandCenter()">📋 สถานะพนักงาน</button>
        </div>

        <div class="cc-container">
          <div class="cc-panel">
            <h3>📊 สรุปวันนี้</h3>
            <div id="ccSummaryStats" style="margin-bottom:12px;">กำลังโหลด...</div>

            <h3 style="margin-top:16px;">⚡ เมนูด่วน</h3>
            <button class="btn-admin-primary" onclick="openAdminQuickModal('job')">📦 จัดการจ๊อบส่งของ</button>
            <button class="btn-admin-warning" onclick="openAdminQuickModal('fuel')">⛽ อนุมัติเบิกค่าน้ำมัน/ค่าซ่อม <span class="drawer-badge" id="quickFuelsBadge">0</span></button>
            <button class="btn-admin-warning" onclick="openAdminQuickModal('leave')">🌴 อนุมัติใบลา <span class="drawer-badge" id="quickLeavesBadge">0</span></button>
            <button class="btn-admin-slate" onclick="showFoamAdminView()" style="margin-top:4px;">📦 จัดการป้ายลังโฟม</button>
          </div>

          <div class="cc-panel">
            <h3>👥 สถานะพนักงาน (Live)</h3>
            <div id="ccAttendanceList">กำลังโหลด...</div>
          </div>

          <div class="cc-panel">
            <h3>🚚 ติดตามการส่งของ (Live)</h3>
            <div id="ccDeliveryList">กำลังโหลด...</div>
          </div>
        </div>

        <button class="btn-admin-slate" onclick="showAdminDashboard()" style="margin-top:16px; width:auto;">⬅️ กลับหน้าแดชบอร์ดหลัก</button>
      </div>
    `;

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
    if (typeof window.updateAdminBellBadgeCount === 'function') window.updateAdminBellBadgeCount();
    loadCommandCenterData(todayStr);
  }

  function loadCommandCenterData(todayStr) {
    Promise.all([
      window.db.ref('settings/globalLateTime').once('value'),
      window.db.ref('employees').once('value'),
      window.PinThipSafe.logsRepo.fetchLogsForRange(window.db, todayStr, todayStr),
      window.db.ref('leaves').once('value'),
      window.db.ref('delivery_jobs/' + todayStr).once('value')
    ]).then(([settingsSnap, empSnap, logsObj, leaveSnap, jobSnap]) => {
      const globalLateTime = settingsSnap.val() || '08:00';
      const employeesObj = empSnap.val() || {};
      const leavesObj = leaveSnap.val() || {};
      const jobsObj = jobSnap.val() || {};

      const allEmployees = Object.values(employeesObj);
      const checkedInList = Object.values(logsObj).filter((log) => log.date === todayStr && log.type === 'เข้างาน');
      const approvedLeavesToday = Object.values(leavesObj).filter(
        (leave) => String(leave.status || '').includes('อนุมัติแล้ว') && leave.startDate <= todayStr && leave.endDate >= todayStr
      );

      const leaveList = [];
      const presentList = [];
      const lateList = [];
      const absentList = [];

      allEmployees.forEach((emp) => {
        const present = checkedInList.find((item) => String(item.empId) === String(emp.empId));
        const leave = approvedLeavesToday.find((item) => String(item.empId) === String(emp.empId));

        if (leave) {
          leaveList.push({ emp, leave });
        } else if (present) {
          if (present.time > globalLateTime) {
            lateList.push({ emp, present });
          } else {
            presentList.push({ emp, present });
          }
        } else {
          absentList.push({ emp });
        }
      });

      const totalPresentCount = presentList.length + lateList.length;

      const summaryContainer = document.getElementById('ccSummaryStats');
      if (summaryContainer) {
        summaryContainer.innerHTML = `
          <div class="cc-stats">
            <div class="cc-stat cc-stat-green">มา<b>${totalPresentCount}</b></div>
            <div class="cc-stat cc-stat-yellow">ลา<b>${leaveList.length}</b></div>
            <div class="cc-stat cc-stat-red">ไม่มา<b>${absentList.length}</b></div>
          </div>
          <div class="cc-meta">• พนักงานทั้งหมด: ${allEmployees.length} คน</div>
          <div class="cc-meta">• เกณฑ์เวลามาสาย: หลัง ${globalLateTime} น.</div>
        `;
      }

      const attContainer = document.getElementById('ccAttendanceList');
      if (attContainer) {
        let htmlAtt = '';
        leaveList.forEach((item) => {
          htmlAtt += `<div class="cc-emp-tag leave"><span>🌴 ${item.emp.empName}</span><span><b>${item.leave.leaveType}</b></span></div>`;
        });
        presentList.forEach((item) => {
          htmlAtt += `<div class="cc-emp-tag present"><span>🟢 ${item.emp.empName}</span><span><b>${item.present.time} น.</b></span></div>`;
        });
        lateList.forEach((item) => {
          htmlAtt += `<div class="cc-emp-tag late"><span>⏰ ${item.emp.empName}</span><span><b>สาย ${item.present.time} น.</b></span></div>`;
        });
        absentList.forEach((item) => {
          htmlAtt += `<div class="cc-emp-tag absent"><span>🔴 ${item.emp.empName}</span><span style="font-size:11px;">ยังไม่ได้ลงเวลา</span></div>`;
        });
        attContainer.innerHTML = htmlAtt || '<div class="no-data">ไม่มีข้อมูลพนักงาน</div>';
      }

      const deliveryContainer = document.getElementById('ccDeliveryList');
      if (deliveryContainer) {
        const jobList = Object.keys(jobsObj).map((k) => ({ key: k, ...jobsObj[k] }));
        if (jobList.length === 0) {
          deliveryContainer.innerHTML = '<div class="no-data" style="text-align:center; padding:15px;">ยังไม่มีการมอบหมายจ๊อบส่งของในวันนี้</div>';
          return;
        }

        let htmlJob = '';
        jobList.forEach((j) => {
          const isCompleted = String(j.status).includes('สำเร็จ');
          const isOnTheWay = String(j.status).includes('กำลังเดินทาง');
          const statusClass = isCompleted ? 'done' : (isOnTheWay ? 'ontheway' : 'pending');
          const viewPhotoBtn = j.photoUrl ? `<a href="${j.photoUrl}" target="_blank" style="color:#2563eb; font-size:11px; text-decoration:underline; display:block; margin-top:2px;">🖼️ ดูรูปหลักฐาน</a>` : '';

          htmlJob += `
            <div class="cc-delivery-item ${statusClass}">
              <b>🚚 คนขับ: ${j.driverName}</b><br>
              🏬 ร้าน: <b>${j.customerName}</b><br>
              สถานะ: <b>${j.status} (${j.deliveredTime})</b>
              ${viewPhotoBtn}
              <button class="btn-admin-danger" onclick="adminDeleteDeliveryStatus('${j.key}')">🗑️ ลบรายการส่งของ</button>
            </div>
          `;
        });
        deliveryContainer.innerHTML = htmlJob;
      }
    });
  }

  function adminDeleteDeliveryStatus(jobKey) {
    if (!window.confirm('ต้องการลบรายการส่งของนี้ใช่หรือไม่?')) return;

    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);
    window.db.ref(`delivery_jobs/${todayStr}/${jobKey}`).remove((error) => {
      if (error) {
        window.alert('ลบรายการส่งของไม่สำเร็จ กรุณาลองใหม่');
        return;
      }
      showAdminCommandCenter();
    });
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.adminDashboard = {
    showAdminDashboard,
    showAdminCommandCenter,
    loadCommandCenterData
  };
  window.showAdminDashboard = showAdminDashboard;
  window.showAdminCommandCenter = showAdminCommandCenter;
  window.loadCommandCenterData = loadCommandCenterData;
  window.adminDeleteDeliveryStatus = adminDeleteDeliveryStatus;
})();
