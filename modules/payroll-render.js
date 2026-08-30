(function() {
  window.renderEmployeePayrollCards = function(employeeList) {
    let html = '';
    employeeList.forEach((emp) => {
      if (emp.grandTotal <= 0) return;
      html += renderEmployeeCard(emp);
    });
    return html;
  };

  function renderEmployeeCard(emp) {
    let html = '<div class="employee-payroll-card">';
    html += '<div class="employee-header" onclick="toggleEmployeeDetail(\'emp-' + emp.empId + '\')">';
    html += '<div style="flex:1;">';
    html += '<div style="font-size:15px; font-weight:bold; color:#2c3e50;">';
    html += '👤 ' + window.PinThipSafe.safeText(emp.empName) + ' ';
    html += '<span style="font-size:13px; color:#7f8c8d;">(' + window.PinThipSafe.safeText(emp.empId) + ')</span>';
    html += '</div>';
    html += '<div style="font-size:12px; color:#95a5a6; margin-top:2px;">';
    html += 'ค่าแรง ' + emp.salary.days + ' วัน • น้ำมัน ' + emp.fuel.count + ' รายการ • ซ่อม ' + emp.repair.count + ' รายการ';
    html += '</div></div>';
    html += '<div style="text-align:right;">';
    html += '<div style="font-size:18px; font-weight:bold; color:#27ae60;">' + emp.grandTotal.toLocaleString() + ' ฿</div>';
    html += '<div style="font-size:12px; color:#7f8c8d; margin-top:2px;">';
    html += '<span id="emp-' + emp.empId + '-toggle">▼</span> ดูรายละเอียด';
    html += '</div></div></div>';
    html += '<div id="emp-' + emp.empId + '" class="employee-detail" style="display:none;">';
    html += renderSummaryCards(emp);
    html += '<div style="margin-top:12px;"><div style="font-weight:bold; font-size:13px; color:#2c3e50; margin-bottom:8px;">📋 รายละเอียดทั้งหมด:</div>';
    html += renderDetails(emp);
    html += '</div></div></div>';
    return html;
  }


  function renderSummaryCards(emp) {
    let html = '<div class="employee-summary-cards">';
    html += '<div class="mini-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white;">';
    html += '<div style="font-size:20px; margin-bottom:4px;">💼</div>';
    html += '<div style="font-size:11px; opacity:0.9;">ค่าแรง</div>';
    html += '<div style="font-size:18px; font-weight:bold; margin-top:4px;">' + emp.salary.total.toLocaleString() + ' ฿</div>';
    html += '<div style="font-size:11px; opacity:0.8; margin-top:2px;">' + emp.salary.days + ' วัน</div>';
    html += '</div>';
    html += '<div class="mini-card" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color:white;">';
    html += '<div style="font-size:20px; margin-bottom:4px;">⛽</div>';
    html += '<div style="font-size:11px; opacity:0.9;">ค่าน้ำมัน</div>';
    html += '<div style="font-size:18px; font-weight:bold; margin-top:4px;">' + emp.fuel.total.toLocaleString() + ' ฿</div>';
    html += '<div style="font-size:11px; opacity:0.8; margin-top:2px;">' + emp.fuel.count + ' รายการ</div>';
    html += '</div>';
    html += '<div class="mini-card" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color:white;">';
    html += '<div style="font-size:20px; margin-bottom:4px;">🔧</div>';
    html += '<div style="font-size:11px; opacity:0.9;">ค่าซ่อม</div>';
    html += '<div style="font-size:18px; font-weight:bold; margin-top:4px;">' + emp.repair.total.toLocaleString() + ' ฿</div>';
    html += '<div style="font-size:11px; opacity:0.8; margin-top:2px;">' + emp.repair.count + ' รายการ</div>';
    html += '</div></div>';
    return html;
  }

  function renderDetails(emp) {
    let html = '';
    emp.salary.list.forEach((item) => {
      html += '<div class="detail-item"><div class="detail-icon" style="background:#667eea;">💼</div>';
      html += '<div style="flex:1;"><div style="font-size:13px; color:#2c3e50;">เข้างาน - เวลา ' + window.PinThipSafe.safeText(item.time) + ' น.</div>';
      html += '<div style="font-size:11px; color:#7f8c8d; margin-top:2px;">📅 ' + window.PinThipSafe.safeText(item.date) + '</div></div>';
      html += '<div style="font-size:14px; font-weight:bold; color:#27ae60;">' + item.rate.toLocaleString() + ' ฿</div></div>';
    });
    emp.fuel.list.forEach((item) => {
      html += '<div class="detail-item"><div class="detail-icon" style="background:#f39c12;">⛽</div>';
      html += '<div style="flex:1;"><div style="font-size:13px; color:#2c3e50;">' + window.PinThipSafe.safeText(item.type) + '</div>';
      html += '<div style="font-size:11px; color:#7f8c8d; margin-top:2px;">📅 ' + window.PinThipSafe.safeText(item.date) + ' • 🚗 ' + window.PinThipSafe.safeText(item.plate) + '</div>';
      html += '<div style="font-size:11px; color:#95a5a6; margin-top:2px;">' + window.PinThipSafe.safeText(item.route) + '</div></div>';
      html += '<div style="font-size:14px; font-weight:bold; color:#f39c12;">' + item.amount.toLocaleString() + ' ฿</div></div>';
    });
    emp.repair.list.forEach((item) => {
      html += '<div class="detail-item"><div class="detail-icon" style="background:#e74c3c;">🔧</div>';
      html += '<div style="flex:1;"><div style="font-size:13px; color:#2c3e50;">' + window.PinThipSafe.safeText(item.type) + '</div>';
      html += '<div style="font-size:11px; color:#7f8c8d; margin-top:2px;">📅 ' + window.PinThipSafe.safeText(item.date) + ' • 🚗 ' + window.PinThipSafe.safeText(item.plate) + '</div>';
      html += '<div style="font-size:11px; color:#95a5a6; margin-top:2px;">' + window.PinThipSafe.safeText(item.route) + '</div></div>';
      html += '<div style="font-size:14px; font-weight:bold; color:#e74c3c;">' + item.amount.toLocaleString() + ' ฿</div></div>';
    });
    return html;
  }

  window.toggleEmployeeDetail = function(empId) {
    const detail = document.getElementById(empId);
    const toggle = document.getElementById(empId + '-toggle');
    if (detail && toggle) {
      if (detail.style.display === 'none') {
        detail.style.display = 'block';
        toggle.textContent = '▲';
      } else {
        detail.style.display = 'none';
        toggle.textContent = '▼';
      }
    }
  };

})();

  window.renderEmployeePayrollCards = function(employeeList) {
    let html = '';
    employeeList.forEach((emp) => {
      if (emp.grandTotal <= 0) return;
      html += `<div class="employee-payroll-card"><div class="employee-header" onclick="toggleEmployeeDetail('emp-${emp.empId}')"><div style="flex:1;"><div style="font-size:15px; font-weight:bold; color:#2c3e50;">👤 ${window.PinThipSafe.safeText(emp.empName)} <span style="font-size:13px; color:#7f8c8d;">(${window.PinThipSafe.safeText(emp.empId)})</span></div><div style="font-size:12px; color:#95a5a6; margin-top:2px;">ค่าแรง ${emp.salary.days} วัน • น้ำมัน ${emp.fuel.count} รายการ • ซ่อม ${emp.repair.count} รายการ</div></div><div style="text-align:right;"><div style="font-size:18px; font-weight:bold; color:#27ae60;">${emp.grandTotal.toLocaleString()} ฿</div><div style="font-size:12px; color:#7f8c8d; margin-top:2px;"><span id="emp-${emp.empId}-toggle">▼</span> ดูรายละเอียด</div></div></div><div id="emp-${emp.empId}" class="employee-detail" style="display:none;"><div class="employee-summary-cards"><div class="mini-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white;"><div style="font-size:20px; margin-bottom:4px;">💼</div><div style="font-size:11px; opacity:0.9;">ค่าแรง</div><div style="font-size:18px; font-weight:bold; margin-top:4px;">${emp.salary.total.toLocaleString()} ฿</div><div style="font-size:11px; opacity:0.8; margin-top:2px;">${emp.salary.days} วัน</div></div><div class="mini-card" style="background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color:white;"><div style="font-size:20px; margin-bottom:4px;">⛽</div><div style="font-size:11px; opacity:0.9;">ค่าน้ำมัน</div><div style="font-size:18px; font-weight:bold; margin-top:4px;">${emp.fuel.total.toLocaleString()} ฿</div><div style="font-size:11px; opacity:0.8; margin-top:2px;">${emp.fuel.count} รายการ</div></div><div class="mini-card" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color:white;"><div style="font-size:20px; margin-bottom:4px;">🔧</div><div style="font-size:11px; opacity:0.9;">ค่าซ่อม</div><div style="font-size:18px; font-weight:bold; margin-top:4px;">${emp.repair.total.toLocaleString()} ฿</div><div style="font-size:11px; opacity:0.8; margin-top:2px;">${emp.repair.count} รายการ</div></div></div><div style="margin-top:12px;"><div style="font-weight:bold; font-size:13px; color:#2c3e50; margin-bottom:8px;">📋 รายละเอียดทั้งหมด:</div>`;
      emp.salary.list.forEach((item) => { html += `<div class="detail-item"><div class="detail-icon" style="background:#667eea;">💼</div><div style="flex:1;"><div style="font-size:13px; color:#2c3e50;">เข้างาน - เวลา ${window.PinThipSafe.safeText(item.time)} น.</div><div style="font-size:11px; color:#7f8c8d; margin-top:2px;">📅 ${window.PinThipSafe.safeText(item.date)}</div></div><div style="font-size:14px; font-weight:bold; color:#27ae60;">${item.rate.toLocaleString()} ฿</div></div>`; });
      emp.fuel.list.forEach((item) => { html += `<div class="detail-item"><div class="detail-icon" style="background:#f39c12;">⛽</div><div style="flex:1;"><div style="font-size:13px; color:#2c3e50;">${window.PinThipSafe.safeText(item.type)}</div><div style="font-size:11px; color:#7f8c8d; margin-top:2px;">📅 ${window.PinThipSafe.safeText(item.date)} • 🚗 ${window.PinThipSafe.safeText(item.plate)}</div><div style="font-size:11px; color:#95a5a6; margin-top:2px;">${window.PinThipSafe.safeText(item.route)}</div></div><div style="font-size:14px; font-weight:bold; color:#f39c12;">${item.amount.toLocaleString()} ฿</div></div>`; });
      emp.repair.list.forEach((item) => { html += `<div class="detail-item"><div class="detail-icon" style="background:#e74c3c;">🔧</div><div style="flex:1;"><div style="font-size:13px; color:#2c3e50;">${window.PinThipSafe.safeText(item.type)}</div><div style="font-size:11px; color:#7f8c8d; margin-top:2px;">📅 ${window.PinThipSafe.safeText(item.date)} • 🚗 ${window.PinThipSafe.safeText(item.plate)}</div><div style="font-size:11px; color:#95a5a6; margin-top:2px;">${window.PinThipSafe.safeText(item.route)}</div></div><div style="font-size:14px; font-weight:bold; color:#e74c3c;">${item.amount.toLocaleString()} ฿</div></div>`; });
      html += `</div></div></div>`;
    });
    return html;
  };
  window.toggleEmployeeDetail = function(empId) {
    const detail = document.getElementById(empId);
    const toggle = document.getElementById(empId + '-toggle');
    if (detail && toggle) {
      if (detail.style.display === 'none') {
        detail.style.display = 'block';
        toggle.textContent = '▲';
      } else {
        detail.style.display = 'none';
        toggle.textContent = '▼';
      }
    }
  };
})();
