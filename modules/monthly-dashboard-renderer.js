// Monthly Dashboard Renderer - Part 1: Stats Cards
function renderMonthlyDashboard(ym, totalSalary, totalFuel, totalRepair) {
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
      ${renderCharts(totalSalary, totalFuel, totalRepair, salaryPercent, fuelPercent, repairPercent, salaryDeg, fuelEndDeg, total)}
    </div>
  `;
}



// Part 2: Charts Renderer
function renderCharts(salary, fuel, repair, sp, fp, rp, sd, fed, total) {
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

// Make function available globally
if (typeof window !== 'undefined') {
  window.renderMonthlyDashboard = renderMonthlyDashboard;
}
