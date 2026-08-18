(function () {
  const SESSION_KEYS = {
    admin: 'app_is_admin',
    user: 'app_user_data'
  };

  function getSessionTtlMs() {
    const config = window.PinThipSafe?.config?.sessionSettings || {};
    const ttlMinutes = Number(config.adminSessionTtlMinutes || 60 * 24 * 7);
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

  // Sanitize stored credentials — never expose PIN in localStorage
  function sanitizeCredentials(credentials) {
    if (!credentials) return null;
    const clean = { ...credentials };
    // Remove PIN field — session token replaces it for re-authentication
    delete clean.pin;
    return clean;
  }

  function getStoredSession() {
    const rawAdminFlag = read(SESSION_KEYS.admin, false);
    const adminFlag = unwrapSessionPayload(rawAdminFlag, false);
    const rawUser = read(SESSION_KEYS.user, null);
    const user = unwrapSessionPayload(rawUser, null);

    // Admin session: stored as { isAdmin: true, credentials: {...} }
    if (adminFlag && typeof adminFlag === 'object' && adminFlag.isAdmin === true) {
      return {
        isAdmin: true,
        currentUser: null,
        credentials: adminFlag.credentials || null
      };
    }

    // Backward-compatible: old format stored as boolean true
    if (adminFlag === true || adminFlag === 'true') {
      return { isAdmin: true, currentUser: null, credentials: null };
    }

    // User session: stored as { user: {...}, credentials: {...} }
    if (user && typeof user === 'object' && user.user && user.user.empId) {
      return {
        isAdmin: false,
        currentUser: user.user,
        credentials: user.credentials || null
      };
    }

    // Backward-compatible: old format stored user object directly
    if (user && user.empId) {
      return { isAdmin: false, currentUser: user, credentials: null };
    }

    return null;
  }

  function hasStoredSession() {
    return getStoredSession() !== null;
  }

  function restoreSession() {
    const stored = getStoredSession();
    if (stored) {
      return {
        isAdmin: stored.isAdmin,
        currentUser: stored.currentUser,
        credentials: stored.credentials
      };
    }

    clearAuthState();
    return { isAdmin: false, currentUser: null, credentials: null };
  }

  function setAdminSession(credentials) {
    const ttlMs = getSessionTtlMs();
    write(SESSION_KEYS.admin, {
      value: {
        isAdmin: true,
        credentials: sanitizeCredentials(credentials) || null
      },
      expiresAt: Date.now() + ttlMs
    });
    remove(SESSION_KEYS.user);
    return { isAdmin: true, currentUser: null, credentials: sanitizeCredentials(credentials) || null };
  }

  function setUserSession(user, credentials) {
    const ttlMs = getSessionTtlMs();
    if (!user || !user.empId) {
      clearAuthState();
      return { isAdmin: false, currentUser: null, credentials: null };
    }

    remove(SESSION_KEYS.admin);
    write(SESSION_KEYS.user, {
      value: {
        user: user,
        credentials: sanitizeCredentials(credentials) || null
      },
      expiresAt: Date.now() + ttlMs
    });
    return { isAdmin: false, currentUser: user, credentials: sanitizeCredentials(credentials) || null };
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.session = {
    read,
    write,
    remove,
    clearAuthState,
    restoreSession,
    getStoredSession,
    hasStoredSession,
    setAdminSession,
    setUserSession
  };
})();