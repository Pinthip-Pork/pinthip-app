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

    if (normalizedPin !== String(adminConfig.pin)) {
      return { allowed: false, reason: 'Invalid admin PIN.' };
    }

    return { allowed: true, reason: 'Admin login successful.' };
  }

  function findEmployeeByCredentials(employees, inputId, inputPin) {
    if (!employees) return null;

    const normalizedInputId = String(inputId || '').trim();
    const normalizedPin = String(inputPin || '').trim();

    return Object.keys(employees).reduce((found, key) => {
      if (found) return found;
      const emp = employees[key];
      if (emp && String(emp.empId).trim() === normalizedInputId && String(emp.pin).trim() === normalizedPin) {
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
      pin: user.pin || undefined,
      role: user.role || 'employee'
    };
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.auth = {
    getAdminConfig,
    isAdminLoginEnabled,
    tryLoginAdmin,
    findEmployeeByCredentials,
    normalizeSessionUser
  };
})();
