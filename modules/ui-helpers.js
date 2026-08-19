(function () {
  function setTextById(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = String(value ?? '');
  }

  function setHtmlById(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = String(value ?? '');
  }

  // ================= Async UI helpers (loading / error / retry) =================
  // Shared by both admin views (modules/admin-dashboard.js, modules/admin-operations.js)
  // and employee views (scripts/employee-ui.js), so every async screen gets a
  // consistent "loading..." state and a friendly error + retry UI on failure.

  const retryRegistry = {};
  let retrySeq = 0;

  // Shows a simple loading placeholder inside a container.
  function showLoading(containerId, loadingText) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = String(loadingText || '⏳ กำลังโหลด...');
  }

  // Renders an error box with an optional "🔄 ลองใหม่" retry button.
  // options: { message, detail, retryFn, showDetail, onError }
  function showAsyncError(containerId, options) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const opts = options || {};
    const message = opts.message || 'ไม่สามารถโหลดข้อมูลได้';
    const detail = opts.detail || 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วกดลองใหม่';
    const retryFn = opts.retryFn || null;
    const showDetail = opts.showDetail !== false;

    let html = '<div style="text-align:center; padding:20px; margin:12px 0; background:#fee2e2; border:1px solid #fecaca; border-radius:10px; color:#b91c1c;">';
    html += '<div style="font-size:15px; font-weight:700;">⚠️ ' + String(message) + '</div>';
    if (showDetail) {
      html += '<div style="font-size:12px; color:#7f1d1d; margin-top:4px;">' + String(detail) + '</div>';
    }
    if (typeof retryFn === 'function') {
      const retryId = 'ui_retry_' + (++retrySeq);
      retryRegistry[retryId] = retryFn;
      html += '<button class="btn-admin btn-admin-outline" style="margin-top:10px; width:auto;" onclick="window.PinThipSafe.ui.runRetry(\'' + retryId + '\')">🔄 ลองใหม่</button>';
    }
    html += '</div>';
    el.innerHTML = html;

    if (opts.onError) {
      try {
        opts.onError();
      } catch (e) {
        console.warn('showAsyncError onError failed:', e);
      }
    }
  }

  // Runs a retry callback registered by showAsyncError.
  function runRetry(id) {
    const fn = retryRegistry[id];
    if (typeof fn === 'function') {
      delete retryRegistry[id];
      try {
        fn();
      } catch (e) {
        console.warn('runRetry failed:', e);
      }
    }
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.ui = {
    setTextById,
    setHtmlById,
    showLoading,
    showAsyncError,
    runRetry
  };
})();