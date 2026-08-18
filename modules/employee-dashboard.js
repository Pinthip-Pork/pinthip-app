(function () {
  function escape(value) {
    return window.PinThipSafe?.escapeHtml ? window.PinThipSafe.escapeHtml(value) : String(value ?? '');
  }

  function buildLoginHtml(t) {
    return `
      <form onsubmit="event.preventDefault(); handleLogin();">
        <input type="text" id="loginId" autocomplete="username" placeholder="${escape(t.phEmpId)}" oninput="validateUsernameLength(this)">
        <input type="password" id="loginPin" autocomplete="current-password" placeholder="${escape(t.phPin)}" maxlength="4">
        <button type="submit">${escape(t.btnLogin)}</button>
      </form>
    `;
  }

  function buildDashboardHtml(currentUser, t) {
    const userId = escape(currentUser?.empId || '');
    const foamExtras = currentUser?.canSendFoamLabels ? `
      <button class="btn-fuel" onclick="showFoamStaffView()">📦 ส่งลังโฟม</button>
    ` : '';

    const driverExtras = currentUser?.isDriver ? `
      <button class="btn-fuel" onclick="showFuelRequestForm()">${escape(t.btnFuelMenu)}</button>
    ` : '';

    return `
      <div class="user-banner">
        <div class="user-banner-title">${escape(t.welcome(currentUser?.empName || 'Employee'))} (${userId})</div>
        <div class="user-banner-status"><span id="clockInStatus" class="user-status-badge status-pending">${escape(t.clockInStatusLoading)}</span></div>
      </div>
      <button class="btn-clock" onclick="showClockInForm()">${escape(t.btnClockInMenu)}</button>
      ${foamExtras}
      ${driverExtras}
      <button class="btn-leave" onclick="showLeaveForm()">${escape(t.btnLeaveMenu)}</button>
      <button class="btn-history" onclick="showMyAttendance()">${escape(t.btnMyAttendance)}</button>
      <button class="btn-purple" onclick="showHistory()">${escape(t.btnHistoryMenu)}</button>
      <button class="btn-logout" onclick="handleLogout()">${escape(t.btnLogout)}</button>
    `;
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.employeeDashboard = {
    buildLoginHtml,
    buildDashboardHtml
  };
})();
