(function () {
  const SESSION_KEYS = {
    admin: 'app_is_admin',
    user: 'app_user_data'
  };

  function getSessionTtlMs() {
    const config = window.PinThipSafe?.config?.sessionSettings || {};
    const ttlMinutes = Number(config.adminSessionTtlMinutes || 60 * 24 * 30);
    return ttlMinutes * 60 * 1000;
  }

  function parseStoredValue(rawValue) {
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }

  function unwrapSessionPayload(payload, fallbackValue = null) {
    if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'value')) {
      const expiresAt = Number(payload.expiresAt || 0);
      if (expiresAt && expiresAt <= Date.now()) {
        return fallbackValue;
      }
      return payload.value;
    }

    return payload;
  }

  function read(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return parseStoredValue(raw);
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  function clearAuthState() {
    remove(SESSION_KEYS.admin);
    remove(SESSION_KEYS.user);
  }

  function restoreSession() {
    const rawAdminFlag = read(SESSION_KEYS.admin, false);
    const adminFlag = unwrapSessionPayload(rawAdminFlag, false);
    const rawUser = read(SESSION_KEYS.user, null);
    const user = unwrapSessionPayload(rawUser, null);

    if (adminFlag === true || adminFlag === 'true') {
      return { isAdmin: true, currentUser: null };
    }

    if (user && user.empId) {
      return { isAdmin: false, currentUser: user };
    }

    clearAuthState();
    return { isAdmin: false, currentUser: null };
  }

  function setAdminSession() {
    const ttlMs = getSessionTtlMs();
    write(SESSION_KEYS.admin, {
      value: true,
      expiresAt: Date.now() + ttlMs
    });
    remove(SESSION_KEYS.user);
    return { isAdmin: true, currentUser: null };
  }

  function setUserSession(user) {
    const ttlMs = getSessionTtlMs();
    if (!user || !user.empId) {
      clearAuthState();
      return { isAdmin: false, currentUser: null };
    }

    remove(SESSION_KEYS.admin);
    write(SESSION_KEYS.user, {
      value: user,
      expiresAt: Date.now() + ttlMs
    });
    return { isAdmin: false, currentUser: user };
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.session = {
    read,
    write,
    remove,
    clearAuthState,
    restoreSession,
    setAdminSession,
    setUserSession
  };
})();
