(function () {
  const SESSION_KEYS = {
    admin: 'app_is_admin',
    user: 'app_user_data'
  };

  function parseStoredValue(rawValue) {
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
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
    const adminFlag = read(SESSION_KEYS.admin, false);
    const user = read(SESSION_KEYS.user, null);

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
    write(SESSION_KEYS.admin, true);
    remove(SESSION_KEYS.user);
    return { isAdmin: true, currentUser: null };
  }

  function setUserSession(user) {
    if (!user || !user.empId) {
      clearAuthState();
      return { isAdmin: false, currentUser: null };
    }

    remove(SESSION_KEYS.admin);
    write(SESSION_KEYS.user, user);
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
