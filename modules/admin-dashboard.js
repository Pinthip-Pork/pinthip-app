(function () {
  function showAdminDashboard() {
    // Clean up employee listeners when switching to admin mode
    if (typeof stopTodayListRealtime === 'function') stopTodayListRealtime();
    
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

    if (pageTitle) pageTitle.innerText = '';
    if (status) status.innerText = '';
    if (listBox) listBox.style.display = 'none';
    
    // Start admin notification listeners
    if (typeof startAdminNotificationListener === 'function') startAdminNotificationListener();

    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString
      ? window.PinThipSafe.utils.getLocalDateTimeString()
      : localTodayStr();

    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
      mainContent.innerHTML = '<div class="admin-content" style="text-align:center; padding:40px 16px; color:#64748b;">⏳ กำลังโหลดข้อมูลแดชบอร์ด...</div>';
    }

    Promise.all([
      window.db.ref('employees').once('value'),
      window.PinThipSafe.logsRepo.fetchLogsForRange(window.db, todayStr, todayStr),
      window.db.ref('leaves').once('value'),
      window.db.ref('fuel_requests').once('value'),
      window.db.ref('settings/globalLateTime').once('value'),
      window.db.ref('foam_delivery_requests/' + todayStr).once('value')
    ]).then(([empSnap, logsObj, leaveSnap, fuelSnap, settingsSnap, foamSnap]) => {
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

      const employeeByEmpId = new Map();
      Object.values(employeesObj).forEach((emp) => {
        employeeByEmpId.set(String(emp.empId), emp);
      });

      Object.values(logsObj).forEach((log) => {
        const employeeId = String(log.empId);
        if (log.date !== todayStr || log.type !== 'เข้างาน' || approvedLeaveEmployeeIds.has(employeeId) || countedEmployeeIds.has(employeeId)) return;

        const employee = employeeByEmpId.get(employeeId);
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

      // Pending leaves so the "รายการรออนุมัติ" card matches its "เบิกจ่าย + ใบลา" label.
      let pendingLeaves = 0;
      Object.values(leavesObj).forEach((leave) => {
        if (String(leave.status || '').includes('รออนุมัติ')) pendingLeaves++;
      });
      const totalPendingApprovals = pendingFuel + pendingLeaves;

      // Foam pending count (today only, for the dashboard summary).
      let pendingFoam = 0;
      const foamObj = foamSnap.val() || {};
      Object.values(foamObj).forEach(function (f) {
        if (f.status === 'pending_review' || f.status === 'pending_duplicate_approval') {
          pendingFoam++;
        }
      });
      // NOTE: pendingFoamBadge (drawer) is managed by updateAdminBellBadgeCount()
      // as the single source of truth — not written here, to avoid badge mismatch.

      const todayFuelAndRepairTotal = todayFuelOnlyTotal + todayRepairOnlyTotal;
      const grandTotalToday = todaySalaryTotal + todayFuelAndRepairTotal;
      const grandTotalPending = todayFuelPendingTotal + todayRepairPendingTotal;

      const globalLateTime = settingsSnap.val() || '08:00';
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

      presentList.sort((a, b) => (a.present.time || '').localeCompare(b.present.time || ''));
      lateList.sort((a, b) => (a.present.time || '').localeCompare(b.present.time || ''));

      let empTagsHtml = '';
      presentList.forEach((item) => {
        empTagsHtml += `<div class="emp-tag present"><span class="emp-tag-name">🟢 ${item.emp.empName}</span><span class="emp-tag-meta">${item.present.time} น.</span></div>`;
      });
      lateList.forEach((item) => {
        empTagsHtml += `<div class="emp-tag late"><span class="emp-tag-name">⏰ ${item.emp.empName}</span><span class="emp-tag-meta">สาย ${item.present.time} น.</span></div>`;
      });
      leaveList.forEach((item) => {
        empTagsHtml += `<div class="emp-tag leave"><span class="emp-tag-name">🌴 ${item.emp.empName}</span><span class="emp-tag-meta">${item.leave.leaveType}</span></div>`;
      });
      absentList.forEach((item) => {
        empTagsHtml += `<div class="emp-tag absent"><span class="emp-tag-name">🔴 ${item.emp.empName}</span><span class="emp-tag-meta">ยังไม่ลงเวลา</span></div>`;
      });

      const html = `
        <div class="admin-content">

          <div class="admin-page-header">
            <h2>📊 ภาพรวมรายจ่ายรายวัน</h2>
            <p>ข้อมูลสรุปประจำวันที่ <b>${todayStr}</b></p>
          </div>

          <div class="summary-cards">
            <div class="summary-card success">
              <div class="summary-card-label">พนักงานมาทำงาน</div>
              <div class="summary-card-value">${presentToday}</div>
              <div class="summary-card-sub">คน</div>
            </div>
            <div class="summary-card warning">
              <div class="summary-card-label">ค่าแรงวันนี้</div>
              <div class="summary-card-value">${todaySalaryTotal.toLocaleString()}</div>
              <div class="summary-card-sub">บาท</div>
            </div>
            <div class="summary-card accent">
              <div class="summary-card-label">ค่าน้ำมัน + ซ่อม</div>
              <div class="summary-card-value">${todayFuelAndRepairTotal.toLocaleString()}</div>
              <div class="summary-card-sub">บาท${grandTotalPending > 0 ? ' (รออนุมัติ ' + grandTotalPending.toLocaleString() + ')' : ''}</div>
            </div>
            <div class="summary-card danger">
              <div class="summary-card-label">รายการรออนุมัติ</div>
              <div class="summary-card-value">${totalPendingApprovals}</div>
              <div class="summary-card-sub">เบิกจ่าย + ใบลา</div>
            </div>
          </div>

          <div class="total-bar">
            <span class="total-bar-label">💰 ค่าใช้จ่ายรวมสุทธิวันนี้</span>
            <span class="total-bar-value">${grandTotalToday.toLocaleString()} บาท</span>
          </div>

          <div class="admin-section">
            <div class="admin-section-title">
              <span class="section-icon" style="background:#eff6ff; color:#2563eb;">📋</span>
              เมนูจัดการระบบหลัก
            </div>
            <div class="menu-grid">

              <div class="menu-card">
                <div class="menu-card-header">
                  <div class="menu-card-icon blue">📦</div>
                  <div>
                    <div class="menu-card-title">
                      จัดการป้ายลังโฟม
                      ${pendingFoam > 0 ? '<span class="menu-card-badge">' + pendingFoam + '</span>' : ''}
                    </div>
                    <div class="menu-card-desc">ออกและพิมพ์ป้ายพัสดุสำหรับขนส่ง</div>
                  </div>
                </div>
                <div class="menu-card-actions">
                  <button class="btn-admin btn-admin-primary" onclick="showFoamAdminView()">📦 พิมพ์ป้ายลังโฟม</button>
                  <button class="btn-admin btn-admin-outline" onclick="showFoamCustomerManager()">👥 รายชื่อลูกค้าลังโฟม</button>
                </div>
              </div>

              <div class="menu-card">
                <div class="menu-card-header">
                  <div class="menu-card-icon orange">⛽</div>
                  <div>
                    <div class="menu-card-title">
                      เบิกค่าน้ำมัน & ค่าซ่อม
                      ${pendingFuel > 0 ? '<span class="menu-card-badge">' + pendingFuel + '</span>' : ''}
                    </div>
                    <div class="menu-card-desc">ตรวจสอบสลิปและอนุมัติการเบิกจ่าย</div>
                  </div>
                </div>
                <div class="menu-card-actions">
                  <button class="btn-admin btn-admin-warning" id="dashboardFuelsButton" onclick="showAdminFuelRequests()">
                    ⛽ อนุมัติเบิกจ่าย <span class="drawer-badge" id="dashboardFuelsBadge">0</span>
                  </button>
                  <button class="btn-admin btn-admin-outline" onclick="showAdminFuelHistory()">📜 ประวัติเบิก</button>
                </div>
              </div>

              <div class="menu-card">
                <div class="menu-card-header">
                  <div class="menu-card-icon green">🌴</div>
                  <div>
                    <div class="menu-card-title">ระบบลา & อนุมัติ</div>
                    <div class="menu-card-desc">จัดการคำขอลาป่วย ลากิจ พักร้อน</div>
                  </div>
                </div>
                <div class="menu-card-actions">
                  <button class="btn-admin btn-admin-success" id="dashboardLeavesButton" onclick="showAdminLeaves()">
                    🌴 อนุมัติใบลา <span class="drawer-badge" id="dashboardLeavesBadge">0</span>
                  </button>
                  <button class="btn-admin btn-admin-outline" onclick="showAdminLeaveHistory()">📜 ประวัติการลา</button>
                </div>
              </div>

              <div class="menu-card">
                <div class="menu-card-header">
                  <div class="menu-card-icon purple">👥</div>
                  <div>
                    <div class="menu-card-title">สถิติพนักงาน</div>
                    <div class="menu-card-desc">เช็คชื่อ มาทำงานวันนี้: <b>${presentToday} คน</b></div>
                  </div>
                </div>
                <div class="menu-card-actions">
                  <button class="btn-admin btn-admin-accent" onclick="showAdminAttendanceSummaryReport()">📊 สรุป ขาด ลา มาสาย</button>
                  <button class="btn-admin btn-admin-outline" onclick="showAdminLogsHistory()">📜 ลงเวลาย้อนหลัง</button>
                </div>
              </div>

            </div>
          </div>

          <div class="admin-section">
            <div class="admin-section-title">
              <span class="section-icon" style="background:#f1f5f9; color:#475569;">🟢</span>
              สถานะพนักงานวันนี้ (Live Overview)
            </div>
            <div class="emp-list-container">
              ${empTagsHtml || '<div class="no-data">ไม่มีข้อมูลพนักงาน</div>'}
            </div>
          </div>

          <div class="admin-bottom-actions">
            <button class="btn-admin btn-admin-outline" onclick="showHolidayManagement()">🗓️ กำหนดวันหยุดร้าน</button>
            <button class="btn-admin btn-admin-outline" onclick="showDailyPayroll()">💵 สรุปค่าแรงย้อนหลัง</button>
            <button class="btn-admin btn-admin-outline" onclick="showAnalyticsReport()">📈 สรุปค่าใช้จ่ายประจำเดือน</button>
            <button class="btn-admin btn-admin-outline" onclick="showEmpManagement()">⚙️ จัดการพนักงาน</button>
          </div>

          <div class="admin-section" id="adminHolidayCalendarSection">
            <div class="admin-section-title">
              <span class="section-icon" style="background:#fff7ed; color:#f59e0b;">🗓️</span>
              ปฏิทินวันหยุด / วันพระ
            </div>
            <div id="adminHolidayCalendarRoot">กำลังโหลดปฏิทิน...</div>
          </div>

        </div>
      `;
      if (mainContent) mainContent.innerHTML = html;
      if (typeof window.renderAdminHolidayCalendar === 'function') {
        window.renderAdminHolidayCalendar();
      }
      if (typeof window.updateAdminBellBadgeCount === 'function') window.updateAdminBellBadgeCount();
      if (typeof window.loadTodayListRealtime === 'function') {
        window.loadTodayListRealtime();
      }
    }).catch((err) => {
      const contentEl = document.getElementById('mainContent');
      if (contentEl) {
        contentEl.innerHTML = '';
      }
      if (window.PinThipSafe?.ui?.showAsyncError) {
        window.PinThipSafe.ui.showAsyncError('mainContent', {
          message: 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้',
          detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วกดลองใหม่',
          retryFn: showAdminDashboard
        });
      }
      console.error('Admin dashboard load failed:', err);
    });
  }

  // Local-date fallback (YYYY-MM-DD) so the dashboard never shows a UTC date
  // around midnight/morning when the device is in UTC+7.
  function localTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.adminDashboard = {
    showAdminDashboard
  };
  window.showAdminDashboard = showAdminDashboard;
})();
