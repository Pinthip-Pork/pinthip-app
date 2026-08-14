(function () {
  const root = window;

  const safeStorage = {
    get(key, fallback = null) {
      try {
        const raw = root.localStorage?.getItem?.(key);
        if (raw === null || raw === undefined) return fallback;
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        root.localStorage?.setItem?.(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        root.localStorage?.removeItem?.(key);
        return true;
      } catch {
        return false;
      }
    }
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return map[char] || char;
    });
  }

  function safeText(value) {
    return escapeHtml(value);
  }

  function isTruthyAdminFlag(value) {
    return value === true || value === 'true';
  }

  root.PinThipSafe = root.PinThipSafe || {};
  root.PinThipSafe.storage = safeStorage;
  root.PinThipSafe.escapeHtml = escapeHtml;
  root.PinThipSafe.safeText = safeText;
  root.PinThipSafe.isTruthyAdminFlag = isTruthyAdminFlag;
})();
