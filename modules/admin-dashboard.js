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

    if (pageTitle) pageTitle.innerText = '';
    if (status) status.innerText = '';
    if (listBox) listBox.style.display = 'none';

    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);

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

      // ---- Foam delivery pending count ----
      let pendingFoam = 0;
      const foamObj = foamSnap.val() || {};
      Object.values(foamObj).forEach(function (f) {
        if (f.status === 'pending_review' || f.status === 'pending_duplicate_approval') {
          pendingFoam++;
        }
      });

      // Update drawer badge
      const foamBadge = document.getElementById('pendingFoamBadge');
      if (foamBadge) {
        if (pendingFoam > 0) {
          foamBadge.textContent = pendingFoam;
          foamBadge.style.display = 'inline-block';
        } else {
          foamBadge.style.display = 'none';
        }
      }

          const todayFuelAndRepairTotal = todayFuelOnlyTotal + todayRepairOnlyTotal;
          const grandTotalToday = todaySalaryTotal + todayFuelAndRepairTotal;
          const grandTotalPending = todayFuelPendingTotal + todayRepairPendingTotal;

      // ---- Attendance breakdown for emp-list-container ----
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

      // Sort by time ascending (earliest first)
      presentList.sort((a, b) => (a.present.time || '').localeCompare(b.present.time || ''));
      lateList.sort((a, b) => (a.present.time || '').localeCompare(b.present.time || ''));

      // Build emp-tag HTML
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

              <div class="view-switcher">
                <button class="active" onclick="showAdminDashboard()">📊 Dashboard หลัก</button>
                <button onclick="showAdminCommandCenter()">🖥️ Command Center</button>
              </div>

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
                  <div class="summary-card-value">${pendingFuel}</div>
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
                        <div class="menu-card-title">
                          ระบบลา & อนุมัติ
                        </div>
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
          const mainContent = document.getElementById('mainContent');
          if (mainContent) mainContent.innerHTML = html;
          if (typeof window.renderAdminHolidayCalendar === 'function') {
            window.renderAdminHolidayCalendar();
          }
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
    if (pageTitle) pageTitle.innerText = '';
    if (listBox) listBox.style.display = 'none';
    if (status) status.innerHTML = '';

    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);

    const html = `
      <div class="admin-content">

        <div class="view-switcher">
          <button onclick="showAdminDashboard()">📊 Dashboard หลัก</button>
          <button class="active" onclick="showAdminCommandCenter()">🖥️ Command Center</button>
        </div>

        <div class="admin-page-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h2>🖥️ Command Center (Live Operations)</h2>
            <p>หน้าจอติดตามสถานะปฏิบัติการเรียลไทม์</p>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn-refresh" onclick="showAdminCommandCenter()">🔄 รีเฟรชข้อมูล</button>
            <button class="btn-admin btn-admin-accent btn-admin-sm" onclick="showFoamAdminView()">📦 ป้ายลังโฟม</button>
          </div>
        </div>

        <div class="cc-grid">

          <div class="cc-panel">
            <div class="cc-panel-header">📊 สรุปภาพรวมวันนี้</div>
            <div class="cc-panel-body">
              <div id="ccSummaryStats">กำลังโหลด...</div>
              <div class="cc-quick-label" style="margin-top:12px;">⚡ ทางลัดด่วน</div>
              <div class="cc-quick-actions">
                <button class="btn-admin btn-admin-accent btn-admin-sm" onclick="openAdminQuickModal('job')">📦 จัดการจ๊อบส่งของ</button>
                <button class="btn-admin btn-admin-warning btn-admin-sm" onclick="openAdminQuickModal('fuel')">
                  ⛽ อนุมัติเบิกจ่าย <span class="drawer-badge" id="quickFuelsBadge">0</span>
                </button>
                <button class="btn-admin btn-admin-success btn-admin-sm" onclick="openAdminQuickModal('leave')">
                  🌴 อนุมัติใบลา <span class="drawer-badge" id="quickLeavesBadge">0</span>
                </button>
              </div>
            </div>
          </div>

          <div class="cc-panel">
            <div class="cc-panel-header">👥 สถานะพนักงานแบบเรียลไทม์</div>
            <div class="cc-panel-body" id="ccAttendanceList">กำลังโหลด...</div>
          </div>

          <div class="cc-panel">
            <div class="cc-panel-header">🚚 ติดตามการจัดส่ง (Live Tracking)</div>
            <div class="cc-panel-body" id="ccDeliveryList">กำลังโหลด...</div>
          </div>

        </div>

        <button class="btn-admin btn-admin-outline" onclick="showAdminDashboard()" style="margin-top:20px; width:auto;">
          ⬅️ กลับหน้าแดชบอร์ดหลัก
        </button>

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
          <div class="cc-stat-pills">
            <div class="cc-stat-pill present"><b>${presentList.length}</b>มาทำงาน</div>
            <div class="cc-stat-pill late"><b>${lateList.length}</b>มาสาย</div>
            <div class="cc-stat-pill leave"><b>${leaveList.length}</b>ลา</div>
            <div class="cc-stat-pill absent"><b>${absentList.length}</b>ขาด</div>
          </div>
          <div style="font-size:11px; color:#94a3b8; text-align:center; margin-bottom:4px;">
            พนักงานทั้งหมด ${allEmployees.length} คน (ตัดรอบ ${globalLateTime} น.)
          </div>
        `;
      }

      const attContainer = document.getElementById('ccAttendanceList');
      if (attContainer) {
        let htmlAtt = '';
        leaveList.forEach((item) => {
          htmlAtt += `<div class="emp-tag leave"><span class="emp-tag-name">🌴 ${item.emp.empName}</span><span class="emp-tag-meta">${item.leave.leaveType}</span></div>`;
        });
        presentList.forEach((item) => {
          htmlAtt += `<div class="emp-tag present"><span class="emp-tag-name">🟢 ${item.emp.empName}</span><span class="emp-tag-meta">${item.present.time} น.</span></div>`;
        });
        lateList.forEach((item) => {
          htmlAtt += `<div class="emp-tag late"><span class="emp-tag-name">⏰ ${item.emp.empName}</span><span class="emp-tag-meta">สาย ${item.present.time} น.</span></div>`;
        });
        absentList.forEach((item) => {
          htmlAtt += `<div class="emp-tag absent"><span class="emp-tag-name">🔴 ${item.emp.empName}</span><span class="emp-tag-meta">ยังไม่ลงเวลา</span></div>`;
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
          const statusLabel = isCompleted ? 'done' : (isOnTheWay ? 'ongoing' : 'pending');
          const statusText = isCompleted ? 'สำเร็จ' : (isOnTheWay ? 'กำลังเดินทาง' : 'รอดำเนินการ');
          const viewPhotoBtn = j.photoUrl ? `<a href="${j.photoUrl}" target="_blank" style="color:#2563eb; font-size:11px; text-decoration:underline; display:block; margin-top:4px;">🖼️ ดูรูปหลักฐาน</a>` : '';

          htmlJob += `
            <div class="cc-delivery-card">
              <div class="driver">🚚 ${j.driverName}</div>
              <div style="color:#475569; margin-bottom:4px;">🏬 ${j.customerName}</div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span class="status-badge ${statusLabel}">${statusText}</span>
                <span style="font-size:11px; color:#94a3b8;">${j.deliveredTime || '-'}</span>
              </div>
              ${viewPhotoBtn}
              <button class="btn-admin btn-admin-danger btn-admin-sm" onclick="adminDeleteDeliveryStatus('${j.key}')" style="margin-top:6px;">🗑️ ลบ</button>
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
