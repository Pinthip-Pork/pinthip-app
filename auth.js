(function () {
  const DEFAULT_ADMIN_CONFIG = {
    enabled: false,
    username: 'admin',
    pin: ''
  };

  function getAdminConfig() {
    const config = window.PinThipSafe?.config?.adminCredentials || {};
    return {
      ...DEFAULT_ADMIN_CONFIG,
      ...config
    };
  }

  function isAdminLoginEnabled() {
    const adminConfig = getAdminConfig();
    return Boolean(adminConfig.enabled && adminConfig.username && adminConfig.pin);
  }

  function tryLoginAdmin(inputId, inputPin) {
    const adminConfig = getAdminConfig();
    const normalizedInputId = String(inputId || '').trim().toLowerCase();
    const normalizedUser = String(adminConfig.username || '').trim().toLowerCase();
    const normalizedPin = String(inputPin || '').trim();

    if (!isAdminLoginEnabled()) {
      return {
        allowed: false,
        reason: 'Admin login is disabled. Configure secure admin credentials in app-config.js.'
      };
    }

    if (normalizedInputId !== normalizedUser) {
      return { allowed: false, reason: 'Invalid admin username.' };
    }

    // Note: This is only a client-side pre-check. Real validation happens in Cloud Function.
    // The client-side config may have a plain PIN for legacy setups, but the authoritative
    // check is in functions/index.js which handles both plain and hashed PINs.
    if (normalizedPin !== String(adminConfig.pin)) {
      return { allowed: false, reason: 'Invalid admin PIN.' };
    }

    return { allowed: true, reason: 'Admin login successful.' };
  }

  // Check PIN against employee record — supports both legacy plain PIN and hashed PIN
  function checkPinMatch(employee, inputPin) {
    if (!employee || !employee.pin) return false;
    const storedPin = employee.pin;
    const normalizedInputPin = String(inputPin || '').trim();

    // Legacy plain PIN
    if (typeof storedPin === 'string' && !storedPin.startsWith('sha256$')) {
      return String(storedPin).trim() === normalizedInputPin;
    }

    // Hashed PIN — cannot verify client-side (needs crypto), so return false
    // Real verification happens in Cloud Function (loginWithPin)
    return false;
  }

  function findEmployeeByCredentials(employees, inputId, inputPin) {
    if (!employees) return null;

    const normalizedInputId = String(inputId || '').trim();
    const normalizedPin = String(inputPin || '').trim();

    return Object.keys(employees).reduce((found, key) => {
      if (found) return found;
      const emp = employees[key];
      if (emp && String(emp.empId).trim() === normalizedInputId && checkPinMatch(emp, normalizedPin)) {
        return emp;
      }
      return null;
    }, null);
  }

  // Find employee by empId only (no PIN check) — used after Cloud Function validated the PIN
  function findEmployeeByEmpId(employees, inputId) {
    if (!employees) return null;
    const normalizedInputId = String(inputId || '').trim();
    return Object.keys(employees).reduce((found, key) => {
      if (found) return found;
      const emp = employees[key];
      if (emp && String(emp.empId).trim() === normalizedInputId) {
        return emp;
      }
      return null;
    }, null);
  }

  function normalizeSessionUser(user) {
    if (!user || !user.empId) return null;
    return {
      empId: String(user.empId),
      empName: String(user.empName || ''),
      isDriver: Boolean(user.isDriver),
      canSendFoamLabels: Boolean(user.canSendFoamLabels),
      // Do NOT include pin in session user — PIN should never be stored client-side
      role: user.role || 'employee'
    };
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.auth = {
    getAdminConfig,
    isAdminLoginEnabled,
    tryLoginAdmin,
    findEmployeeByCredentials,
    findEmployeeByEmpId,
    normalizeSessionUser,
    checkPinMatch
  };
})();