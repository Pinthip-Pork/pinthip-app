(function () {
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

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.ui = {
    escapeHtml,
    setTextById,
    setHtmlById
  };
})();
