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

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.ui = {
    setTextById,
    setHtmlById
  };
})();
