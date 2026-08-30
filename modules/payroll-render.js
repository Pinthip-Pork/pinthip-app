(function() {
  'use strict';

  // Private helper function: Render individual employee card
  function renderEmployeeCard(emp) {
    let html = '<div class="employee-payroll-card">';
    html += '<div class="employee-header" onclick="toggleEmployeeDetail(\'emp-' + emp.empId + '\')">';
    html += '<div class="emp-header-left">';
    html += '<div class="emp-name-row">';
    html += '<span class="emp-avatar">👨‍💼</span>';
    html += '<span class="emp-name">' + window.PinThipSafe.safeText(emp.empName) + '</span>';
    html += '<span class="emp-id">ID: ' + window.PinThipSafe.safeText(emp.empId) + '</span>';
    html += '</div>';
    html += '<div class="emp-stats-row">';
    html += '<span class="emp-stat"><span class="stat-icon">📅</span> ' + emp.salary.days + ' วัน</span>';
    html += '<span class="emp-stat"><span class="stat-icon">⛽</span> ' + emp.fuel.count + '</span>';
    html += '<span class="emp-stat"><span class="stat-icon">🔧</span> ' + emp.repair.count + '</span>';
    html += '</div></div>';
    html += '<div class="emp-header-right">';
    html += '<div class="emp-total-amount">' + emp.grandTotal.toLocaleString() + ' ฿</div>';
    html += '<button class="emp-toggle-btn" id="emp-' + emp.empId + '-toggle">▼ แสดงรายละเอียด</button>';
    html += '</div></div>';
    html += '<div id="emp-' + emp.empId + '" class="employee-detail" style="display:none;">';
    html += renderSummaryCards(emp);
    html += '<div class="detail-section">';
    html += '<h3 class="detail-title">รายการทั้งหมด</h3>';
    html += renderDetails(emp);
    html += '</div></div></div>';
    return html;
  }

  // Private helper function: Render summary cards (salary, fuel, repair)
  function renderSummaryCards(emp) {
    let html = '<div class="employee-summary-cards">';
    
    // Salary Card
    html += '<div class="stat-card stat-card-salary">';
    html += '<div class="stat-card-header">';
    html += '<span class="stat-card-icon">💼</span>';
    html += '<span class="stat-card-label">ค่าแรง</span>';
    html += '</div>';
    html += '<div class="stat-card-value">' + emp.salary.total.toLocaleString() + ' ฿</div>';
    html += '<div class="stat-card-meta">' + emp.salary.days + ' วันทำงาน</div>';
    html += '</div>';
    
    // Fuel Card
    html += '<div class="stat-card stat-card-fuel">';
    html += '<div class="stat-card-header">';
    html += '<span class="stat-card-icon">⛽</span>';
    html += '<span class="stat-card-label">ค่าน้ำมัน</span>';
    html += '</div>';
    html += '<div class="stat-card-value">' + emp.fuel.total.toLocaleString() + ' ฿</div>';
    html += '<div class="stat-card-meta">' + emp.fuel.count + ' รายการ</div>';
    html += '</div>';
    
    // Repair Card
    html += '<div class="stat-card stat-card-repair">';
    html += '<div class="stat-card-header">';
    html += '<span class="stat-card-icon">🔧</span>';
    html += '<span class="stat-card-label">ค่าซ่อม</span>';
    html += '</div>';
    html += '<div class="stat-card-value">' + emp.repair.total.toLocaleString() + ' ฿</div>';
    html += '<div class="stat-card-meta">' + emp.repair.count + ' รายการ</div>';
    html += '</div>';
    
    html += '</div>';
    return html;
  }

  // Private helper function: Render all detail items
  function renderDetails(emp) {
    let html = '<div class="detail-table">';
    
    // Salary items
    emp.salary.list.forEach((item) => {
      html += '<div class="detail-row detail-row-salary">';
      html += '<div class="detail-icon-col"><span class="detail-type-badge badge-salary">💼 ค่าแรง</span></div>';
      html += '<div class="detail-info-col">';
      html += '<div class="detail-primary">เข้างาน เวลา ' + window.PinThipSafe.safeText(item.time) + ' น.</div>';
      html += '<div class="detail-secondary">' + window.PinThipSafe.safeText(item.date) + '</div>';
      html += '</div>';
      html += '<div class="detail-amount-col">' + item.rate.toLocaleString() + ' ฿</div>';
      html += '</div>';
    });
    
    // Fuel items
    emp.fuel.list.forEach((item) => {
      html += '<div class="detail-row detail-row-fuel">';
      html += '<div class="detail-icon-col"><span class="detail-type-badge badge-fuel">⛽ น้ำมัน</span></div>';
      html += '<div class="detail-info-col">';
      html += '<div class="detail-primary">' + window.PinThipSafe.safeText(item.type) + '</div>';
      html += '<div class="detail-secondary">' + window.PinThipSafe.safeText(item.date) + ' • 🚗 ' + window.PinThipSafe.safeText(item.plate) + '</div>';
      html += '<div class="detail-tertiary">' + window.PinThipSafe.safeText(item.route) + '</div>';
      html += '</div>';
      html += '<div class="detail-amount-col">' + item.amount.toLocaleString() + ' ฿</div>';
      html += '</div>';
    });
    
    // Repair items
    emp.repair.list.forEach((item) => {
      html += '<div class="detail-row detail-row-repair">';
      html += '<div class="detail-icon-col"><span class="detail-type-badge badge-repair">🔧 ซ่อม</span></div>';
      html += '<div class="detail-info-col">';
      html += '<div class="detail-primary">' + window.PinThipSafe.safeText(item.type) + '</div>';
      html += '<div class="detail-secondary">' + window.PinThipSafe.safeText(item.date) + ' • 🚗 ' + window.PinThipSafe.safeText(item.plate) + '</div>';
      html += '<div class="detail-tertiary">' + window.PinThipSafe.safeText(item.route) + '</div>';
      html += '</div>';
      html += '<div class="detail-amount-col">' + item.amount.toLocaleString() + ' ฿</div>';
      html += '</div>';
    });
    
    html += '</div>';
    return html;
  }

  // Public API: Render all employee payroll cards
  window.renderEmployeePayrollCards = function(employeeList) {
    let html = '';
    employeeList.forEach((emp) => {
      if (emp.grandTotal <= 0) return;
      html += renderEmployeeCard(emp);
    });
    return html;
  };

  // Public API: Toggle employee detail visibility
  window.toggleEmployeeDetail = function(empId) {
    const detail = document.getElementById(empId);
    const toggle = document.getElementById(empId + '-toggle');
    if (detail && toggle) {
      if (detail.style.display === 'none') {
        detail.style.display = 'block';
        toggle.textContent = '▲ ซ่อนรายละเอียด';
      } else {
        detail.style.display = 'none';
        toggle.textContent = '▼ แสดงรายละเอียด';
      }
    }
  };

})();
