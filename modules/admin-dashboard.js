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

    const t = (window.i18n && window.i18n[window.currentLang]) || { pageTitleAdminDashboard: 'Admin Dashboard' };
    if (pageTitle) pageTitle.innerText = t.pageTitleAdminDashboard;
    if (status) status.innerText = '';
    if (listBox) listBox.style.display = 'block';

    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString ? window.PinThipSafe.utils.getLocalDateTimeString() : new Date().toISOString().slice(0, 10);

    window.db.ref('employees').once('value', (empSnap) => {
      const employeesObj = empSnap.val() || {};

      window.db.ref('logs').once('value', (logSnap) => {
        const logsObj = logSnap.val() || {};
        let presentToday = 0;
        let todaySalaryTotal = 0;

        Object.keys(logsObj).forEach((k) => {
          const log = logsObj[k];
          if (log.date === todayStr && log.type === 'เข้างาน') {
            presentToday++;
            Object.keys(employeesObj).forEach((ek) => {
              const emp = employeesObj[ek];
              if (String(emp.empId) === String(log.empId)) {
                todaySalaryTotal += Number(emp.dailyRate || 0);
              }
            });
          }
        });

        window.db.ref('fuel_requests').once('value', (fuelSnap) => {
          const fuelObj = fuelSnap.val() || {};
          let pendingFuel = 0;
          let todayFuelOnlyTotal = 0;
          let todayRepairOnlyTotal = 0;

          Object.keys(fuelObj).forEach((k) => {
            const f = fuelObj[k];
            const statusStr = String(f.status || '');
            const reqType = f.requestType || 'เบิกค่าน้ำมัน';
            if (statusStr.includes('รออนุมัติ')) pendingFuel++;
            if (f.date === todayStr && statusStr.includes('อนุมัติแล้ว')) {
              const amt = Number(f.amount || 0);
              if (reqType.includes('ซ่อม')) {
                todayRepairOnlyTotal += amt;
              } else {
                todayFuelOnlyTotal += amt;
              }
            }
          });

          const todayFuelAndRepairTotal = todayFuelOnlyTotal + todayRepairOnlyTotal;
          const grandTotalToday = todaySalaryTotal + todayFuelAndRepairTotal;

          const html = `
            <div class="user-banner">👑 ผู้ดูแลระบบ (Admin) | ข้อมูลสรุปประจำวันนี้: <b>${todayStr}</b></div>

            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-left: 4px solid #495057; color: #333; padding: 16px; border-radius: 10px; margin-bottom: 20px; text-align: left; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
              <div style="font-size: 14px; font-weight: bold; color: #495057; margin-bottom: 10px; border-bottom: 1px solid #e9ecef; padding-bottom: 6px;">💵 สรุปค่าใช้จ่ายรวมวันนี้ (${todayStr}):</div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #555; margin-bottom: 6px;">
                <span>• ค่าแรงพนักงานมาทำงานวันนี้ (${presentToday} คน):</span>
                <b style="color: #333;">${todaySalaryTotal.toLocaleString()} บาท</b>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #555; margin-bottom: 6px;">
                <span>• ⛽ ค่าน้ำมันรถส่งของ (อนุมัติแล้ว):</span>
                <b style="color: #e67e22;">${todayFuelOnlyTotal.toLocaleString()} บาท</b>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 13px; color: #555; margin-bottom: 10px;">
                <span>• 🔧 ค่าซ่อมรถ / ค่าอะไหล่ (อนุมัติแล้ว):</span>
                <b style="color: #d9534f;">${todayRepairOnlyTotal.toLocaleString()} บาท</b>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; color: #212529; border-top: 1px dashed #dee2e6; padding-top: 8px;">
                <span>💰 รวมจ่ายออกวันนี้ทั้งหมด:</span>
                <span style="color: #2c3e50;">${grandTotalToday.toLocaleString()} บาท</span>
              </div>
            </div>

            <div style="margin-bottom: 15px;">
              <button class="btn-fuel" onclick="showAdminCommandCenter()" style="padding: 16px; font-size: 17px; background: linear-gradient(135deg, #0d6efd, #6f42c1) !important;">DASHBORD สถานะพนักงานปิ่นทิพย์</button>
            </div>

            <div class="dashboard-grid">
              <div class="dashboard-box">
                <div>
                  <h3>📦 จัดการจ๊อบส่งหมูสด</h3>
                  <p>มอบหมายงานส่งของ & ดูประวัติย้อนหลัง</p>
                </div>
                <div>
                  <button class="btn-fuel" onclick="showAdminJobAssignPanel()">📦 มอบหมายจ๊อบส่งของวันนี้</button>
                  <button class="btn-history" onclick="showAdminDeliveryHistory()" style="margin-top:5px;">📜 ประวัติการส่งของย้อนหลัง</button>
                </div>
              </div>

              <div class="dashboard-box">
                <div>
                  <h3>👥 พนักงาน & สถิติการทำงาน</h3>
                  <p>มาทำงานวันนี้: <b style="color:#28a745;">${presentToday}</b> คน</p>
                </div>
                <div>
                  <button class="btn-blue" onclick="showAdminAttendanceSummaryReport()">👥 สรุป ขาด ลา มาสาย (เลือกช่วงวัน)</button>
                  <button class="btn-history" onclick="showAdminLogsHistory()" style="margin-top:5px;">📜 ดูการลงเวลาทำงานย้อนหลัง</button>
                </div>
              </div>

              <div class="dashboard-box">
                <div>
                  <h3>🌴 ระบบลา & อนุมัติ</h3>
                  <p>จัดการคำขอลาและตรวจสอบสถานะ</p>
                </div>
                <div>
                  <button class="btn-orange" onclick="showAdminLeaves()">🌴 ตรวจสอบ/อนุมัติใบลา</button>
                  <button class="btn-history" onclick="showAdminLeaveHistory()" style="margin-top:5px;">📜 ประวัติการลาทั้งหมด</button>
                </div>
              </div>

              <div class="dashboard-box">
                <div>
                  <h3>⛽/🔧 การเบิกค่าน้ำมัน / ค่าซ่อมรถ</h3>
                  <p>รออนุมัติ: <b style="color:#d9534f;">${pendingFuel}</b> รายการ</p>
                </div>
                <div>
                  <button class="btn-fuel" onclick="showAdminFuelRequests()">⛽/🔧 ตรวจสอบ/อนุมัติเบิกจ่าย</button>
                  <button class="btn-history" onclick="showAdminFuelHistory()" style="margin-top:5px;">📜 ประวัติ & จัดการเบิกจ่าย</button>
                </div>
              </div>
            </div>

            <div style="display:flex; gap:10px; margin-top:10px;">
              <button class="btn-clock" onclick="showDailyPayroll()">💵 สรุปค่าแรงย้อนหลัง</button>
              <button class="btn-purple" onclick="showAnalyticsReport()">📈 สรุปค่าใช้จ่ายประจำเดือน</button>
              <button class="btn-purple" onclick="showEmpManagement()">⚙️ จัดการพนักงาน</button>
            </div>
          `;
          const mainContent = document.getElementById('mainContent');
          if (mainContent) mainContent.innerHTML = html;
          if (typeof window.loadTodayListRealtime === 'function') {
            window.loadTodayListRealtime();
          }
        });
      });
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
      <div class="user-banner" style="display:flex; justify-content:space-between; align-items:center;">
        <span>DASHBORD Real-Time ประจำวันที่: <b>${todayStr}</b></span>
        <button class="btn-blue" onclick="showAdminCommandCenter()" style="width:auto; margin:0; padding:6px 12px; font-size:12px;">🔄 รีเฟรชข้อมูลสด</button>
      </div>

      <div class="command-center-container">
        <div class="command-column">
          <h3>📊 สรุปพนักงานมาทำงานวันนี้</h3>
          <div id="ccSummaryStats" style="margin-top:10px;">กำลังโหลด...</div>

          <h3 style="margin-top:20px;">⚡ เมนูด่วนแอดมิน</h3>
          <button class="btn-fuel" onclick="openAdminQuickModal('job')" style="font-size:13px; padding:10px;">📦 จัดการจ๊อบส่งของ</button>
          <button class="btn-blue" onclick="openAdminQuickModal('fuel')" style="font-size:13px; padding:10px; margin-top:5px;">⛽/🔧 อนุมัติเบิกค่าน้ำมัน/ค่าซ่อม</button>
          <button class="btn-orange" onclick="openAdminQuickModal('leave')" style="font-size:13px; padding:10px; margin-top:5px;">🌴 อนุมัติใบลา</button>
        </div>

        <div class="command-column">
          <h3>👥 สถานะพนักงานวันนี้ (Live)</h3>
          <div id="ccAttendanceList" style="margin-top:10px;">กำลังโหลด...</div>
        </div>

        <div class="command-column">
          <h3>🚚 ติดตามการส่งของ (Live Tracking)</h3>
          <div id="ccDeliveryList" style="margin-top:10px;">กำลังโหลด...</div>
        </div>
      </div>

      <button class="btn-back" onclick="showAdminDashboard()" style="margin-top:20px;">⬅️ กลับหน้าแดสบอร์ดหลัก</button>
    `;

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
    loadCommandCenterData(todayStr);
  }

  function loadCommandCenterData(todayStr) {
    window.db.ref('settings/globalLateTime').once('value', (settingsSnap) => {
      const globalLateTime = settingsSnap.val() || '08:00';

      window.db.ref('employees').once('value', (empSnap) => {
        const employeesObj = empSnap.val() || {};
        const allEmployees = Object.keys(employeesObj).map((k) => employeesObj[k]);

        window.db.ref('logs').once('value', (logSnap) => {
          const logsObj = logSnap.val() || {};
          const checkedInList = Object.keys(logsObj)
            .map((k) => logsObj[k])
            .filter((log) => log.date === todayStr && log.type === 'เข้างาน');

          window.db.ref('leaves').once('value', (leaveSnap) => {
            const leavesObj = leaveSnap.val() || {};
            const approvedLeavesToday = Object.keys(leavesObj)
              .map((k) => leavesObj[k])
              .filter((leave) => String(leave.status || '').includes('อนุมัติแล้ว') && leave.startDate <= todayStr && leave.endDate >= todayStr);

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
                <div class="stats-card-container">
                  <div class="stat-box" style="background:#e8f5e9; color:#2e7d32;">มา<b>${totalPresentCount}</b></div>
                  <div class="stat-box" style="background:#fff3cd; color:#856404;">ลา<b>${leaveList.length}</b></div>
                  <div class="stat-box" style="background:#ffebee; color:#c62828;">ไม่มา<b>${absentList.length}</b></div>
                </div>
                <div style="font-size:12px; color:#555; margin-top:5px;">• พนักงานทั้งหมด: ${allEmployees.length} คน</div>
                <div style="font-size:12px; color:#555;">• เกณฑ์เวลามาสาย: หลัง ${globalLateTime} น.</div>
              `;
            }

            const attContainer = document.getElementById('ccAttendanceList');
            if (attContainer) {
              let htmlAtt = '';
              leaveList.forEach((item) => {
                htmlAtt += `<div class="emp-tag-leave"><span>🌴 ${item.emp.empName}</span><span><b>${item.leave.leaveType}</b></span></div>`;
              });
              presentList.forEach((item) => {
                htmlAtt += `<div class="emp-tag-present"><span>🟢 ${item.emp.empName}</span><span><b>${item.present.time} น.</b></span></div>`;
              });
              lateList.forEach((item) => {
                htmlAtt += `<div class="emp-tag-late"><span>⏰ ${item.emp.empName}</span><span><b style="color:#d9534f;">สาย ${item.present.time} น.</b></span></div>`;
              });
              absentList.forEach((item) => {
                htmlAtt += `<div class="emp-tag-absent"><span>🔴 ${item.emp.empName}</span><span style="font-size:11px;">ยังไม่ได้ลงเวลา</span></div>`;
              });
              attContainer.innerHTML = htmlAtt || '<div class="no-data">ไม่มีข้อมูลพนักงาน</div>';
            }

            window.db.ref('delivery_jobs/' + todayStr).once('value', (jobSnap) => {
              const jobsObj = jobSnap.val() || {};
              const deliveryContainer = document.getElementById('ccDeliveryList');
              if (!deliveryContainer) return;

              const jobList = Object.keys(jobsObj).map((k) => ({ key: k, ...jobsObj[k] }));
              if (jobList.length === 0) {
                deliveryContainer.innerHTML = '<div class="no-data" style="text-align:center; padding:15px;">ยังไม่มีการมอบหมายจ๊อบส่งของในวันนี้</div>';
                return;
              }

              let htmlJob = '';
              jobList.forEach((j) => {
                const isCompleted = String(j.status).includes('สำเร็จ');
                const isOnTheWay = String(j.status).includes('กำลังเดินทาง');
                const badgeColor = isCompleted ? '#28a745' : (isOnTheWay ? '#0d6efd' : '#e67e22');
                const viewPhotoBtn = j.photoUrl ? `<a href="${j.photoUrl}" target="_blank" style="color:#0d6efd; font-size:11px; text-decoration:underline; display:block; margin-top:2px;">🖼️ ดูรูปหลักฐาน</a>` : '';

                htmlJob += `
                  <div class="history-item" style="border-left: 4px solid ${badgeColor}; margin-bottom:8px;">
                    <b>🚚 คนขับ: ${j.driverName}</b><br>
                    🏬 ร้าน: <b>${j.customerName}</b><br>
                    สถานะ: <span style="color:${badgeColor}; font-weight:bold;">${j.status} (${j.deliveredTime})</span>
                    ${viewPhotoBtn}
                  </div>
                `;
              });
              deliveryContainer.innerHTML = htmlJob;
            });
          });
        });
      });
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
})();
