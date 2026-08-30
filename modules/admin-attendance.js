// Admin Attendance Summary Module
// Extracted from admin-operations.js for better performance and maintainability

(function () {
  'use strict';

  let currentAttendanceSummaryCache = [];

  function showAdminAttendanceSummaryReport() {
    window.isAdmin = true;
    const mainCard = document.getElementById('mainCard');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const bellBtn = document.getElementById('bellBtn');
    const pageTitle = document.getElementById('pageTitle');
    const listBox = document.getElementById('listBox');

    if (mainCard) mainCard.classList.add('admin-wide');
    if (hamburgerBtn) hamburgerBtn.style.display = 'block';
    if (bellBtn) bellBtn.style.display = 'block';
    if (pageTitle) pageTitle.innerText = '👥 สรุปสถิติ ขาด ลา มาสาย (รายบุคคล)';
    if (listBox) listBox.style.display = 'none';

    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString 
      ? window.PinThipSafe.utils.getLocalDateTimeString() 
      : new Date().toISOString().slice(0, 10);

    const html = `
      <h2>👥 สรุปสถิติ ขาด ลา มาสาย (แยกตามรายบุคคล)</h2>
      <div style="background:#eef2f5; padding:12px; border-radius:10px; margin-bottom:15px; text-align:left;">
        <b>📅 เลือกช่วงเวลาตรวจสอบสถิติ:</b>
        <div style="display:flex; gap:10px; margin-top:5px;">
          <div style="flex:1;">
            <span style="font-size:12px; color:#555;">จากวันที่:</span>
            <input type="date" id="attStartDate" value="${todayStr}" onchange="window.AdminAttendance.render()" style="font-weight:bold; margin:2px 0 0 0;">
          </div>
          <div style="flex:1;">
            <span style="font-size:12px; color:#555;">ถึงวันที่:</span>
            <input type="date" id="attEndDate" value="${todayStr}" onchange="window.AdminAttendance.render()" style="font-weight:bold; margin:2px 0 0 0;">
          </div>
        </div>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <button class="btn-blue" onclick="window.AdminAttendance.setToday()" style="margin:0; padding:8px; font-size:13px; flex:1;">📌 ดูเฉพาะวันนี้</button>
          <button class="btn-excel" onclick="window.AdminAttendance.exportExcel()" style="margin:0; padding:8px; font-size:13px; flex:1;">📥 ส่งออกข้อมูลเป็น Excel</button>
        </div>
      </div>
      <div id="attendanceSummaryResultContainer"></div>
      <button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดสบอร์ด</button>
    `;

    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.innerHTML = html;
    renderAttendanceSummaryList();
  }

  function setAttendanceDateToday() {
    const todayStr = window.PinThipSafe?.utils?.getLocalDateTimeString 
      ? window.PinThipSafe.utils.getLocalDateTimeString() 
      : new Date().toISOString().slice(0, 10);
    const startDate = document.getElementById('attStartDate');
    const endDate = document.getElementById('attEndDate');
    if (startDate) startDate.value = todayStr;
    if (endDate) endDate.value = todayStr;
    renderAttendanceSummaryList();
  }

  function renderAttendanceSummaryList() {
    const startDate = document.getElementById('attStartDate')?.value;
    const endDate = document.getElementById('attEndDate')?.value;
    const container = document.getElementById('attendanceSummaryResultContainer');
    if (!container || !startDate || !endDate) return;

    container.innerHTML = (typeof createLoadingHTML === 'function') 
      ? createLoadingHTML() 
      : 'กำลังโหลด...';

    Promise.all([
      window.db.ref('settings/globalLateTime').once('value'),
      window.db.ref('employees').once('value'),
      window.PinThipSafe.logsRepo.fetchLogsForRange(window.db, startDate, endDate),
      window.db.ref('leaveRequests').once('value')
    ]).then(([globalTimeSnap, empSnap, logs, leaveSnap]) => {
      const globalLateTime = globalTimeSnap.val() || '08:30';
      const employees = empSnap.val() || {};
      const leaves = leaveSnap.val() || {};
      const empKeys = Object.keys(employees);
      const summaryList = [];

      const logsByEmpId = new Map();
      Object.keys(logs).forEach((lk) => {
        const log = logs[lk];
        if (!log || log.type !== 'เข้างาน') return;
        if (!log.date || log.date < startDate || log.date > endDate) return;
        const empId = String(log.empId);
        if (!logsByEmpId.has(empId)) logsByEmpId.set(empId, []);
        logsByEmpId.get(empId).push(log);
      });

      const leavesByEmpId = new Map();
      Object.keys(leaves).forEach((fk) => {
        const leave = leaves[fk];
        const statusStr = String(leave.status || '');
        if (!statusStr.includes('อนุมัติแล้ว')) return;
        if (!leave.startDate || !leave.endDate || leave.startDate > endDate || leave.endDate < startDate) return;
        const empId = String(leave.empId);
        if (!leavesByEmpId.has(empId)) leavesByEmpId.set(empId, 0);
        leavesByEmpId.set(empId, leavesByEmpId.get(empId) + 1);
      });

      empKeys.forEach((ek) => {
        const emp = employees[ek];
        const empId = String(emp.empId);
        const empLogs = logsByEmpId.get(empId) || [];
        let presentCount = 0;
        let lateCount = 0;
        empLogs.forEach((log) => {
          presentCount++;
          if (log.time > globalLateTime) lateCount++;
        });
        const leaveCount = leavesByEmpId.get(empId) || 0;
        summaryList.push({ empId: emp.empId, empName: emp.empName, presentCount, lateCount, leaveCount });
      });

      currentAttendanceSummaryCache = summaryList;
      let html = `<div style="background: linear-gradient(135deg, #0dcaf0, #0d6efd); color: white; padding: 12px; border-radius: 10px; margin-bottom: 15px;">
          <b>📊 สรุปสถิติพนักงานช่วงวันที่ ${startDate} ถึง ${endDate}:</b><br>
          👥 จำนวนพนักงานทั้งหมด: <b>${summaryList.length} คน</b> (เกณฑ์มาสาย: หลัง ${globalLateTime} น.)
        </div>`;
      summaryList.forEach((item) => {
        html += `<div class="history-item" style="display: flex; justify-content: space-between; align-items: center;">
            <div><b>👤 ${item.empName}</b> (${item.empId})<br>
              <span style="color: #6c757d; font-size: 12px;">มาทำงาน: <b style="color: #28a745;">${item.presentCount}</b> วัน</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <span style="background: #fff3cd; color: #856404; padding: 4px 10px; border-radius: 6px; font-size: 13px;">⏰ มาสาย: <b>${item.lateCount}</b> ครั้ง</span>
              <span style="background: #e2e3e5; color: #383d41; padding: 4px 10px; border-radius: 6px; font-size: 13px;">🌴 ลา: <b>${item.leaveCount}</b> วัน</span>
            </div>
          </div>`;
      });
      container.innerHTML = html;
    }).catch((err) => {
      console.error('Attendance summary load failed:', err);
      if (container) container.innerHTML = '';
      
      // Check if it's a permission error
      const errMsg = err?.message || String(err);
      if (errMsg.includes('permission') || errMsg.includes('Permission')) {
        PinThipSafe.modal.error('ไม่มีสิทธิ์เข้าถึงข้อมูล กรุณาตรวจสอบ Firebase Rules หรือ Login ใหม่');
      } else {
        if (window.PinThipSafe?.ui?.showAsyncError) {
          window.PinThipSafe.ui.showAsyncError('attendanceSummaryResultContainer', {
            message: 'ไม่สามารถโหลดข้อมูลสถิติพนักงานได้',
            detail: 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วลองใหม่อีกครั้ง',
            retryFn: renderAttendanceSummaryList
          });
        }
      }
    });
  }

  function exportAttendanceSummaryExcel() {
    if (!currentAttendanceSummaryCache || currentAttendanceSummaryCache.length === 0) {
      PinThipSafe.modal.warning('ไม่มีข้อมูลสำหรับส่งออกเป็น Excel');
      return;
    }

    const startDate = document.getElementById('attStartDate')?.value;
    const endDate = document.getElementById('attEndDate')?.value;

    const rows = [
      ['รหัสพนักงาน', 'ชื่อพนักงาน', 'มาทำงาน (วัน)', 'มาสาย (ครั้ง)', 'ลา (วัน)', 'ช่วงวันที่ตรวจสอบ', `${startDate} ถึง ${endDate}`]
    ];

    currentAttendanceSummaryCache.forEach((item) => {
      rows.push([
        item.empId,
        item.empName,
        item.presentCount,
        item.lateCount,
        item.leaveCount
      ]);
    });

    window.downloadCSV(`Attendance_Summary_${startDate}_to_${endDate}.csv`, rows);
  }

  // Export module API
  window.AdminAttendance = {
    show: showAdminAttendanceSummaryReport,
    render: renderAttendanceSummaryList,
    setToday: setAttendanceDateToday,
    exportExcel: exportAttendanceSummaryExcel
  };

  // Backward compatibility
  window.showAdminAttendanceSummaryReport = showAdminAttendanceSummaryReport;
  window.renderAttendanceSummaryList = renderAttendanceSummaryList;
  window.setAttendanceDateToday = setAttendanceDateToday;
  window.exportAttendanceSummaryExcel = exportAttendanceSummaryExcel;

})();

