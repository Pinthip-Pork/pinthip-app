(function () {
  function getLocalDateTimeString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function downloadCSV(filename, rows) {
    let csvContent = '\uFEFF';
    rows.forEach(function (rowArray) {
      let row = rowArray.map((item) => `"${String(item || '').replace(/"/g, '""')}"`).join(',');
      csvContent += row + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let os = ua.indexOf('iPhone') !== -1 ? 'iPhone' : (ua.indexOf('Android') !== -1 ? 'Android' : 'PC/Web');
    let browser = ua.indexOf('Line') !== -1 ? 'Line App' : 'Browser';
    return `${os} (${browser})`;
  }

  function getDeviceId() {
    const storageKey = 'pinthip_device_id';
    try {
      const existingId = localStorage.getItem(storageKey);
      if (existingId) return existingId;

      const newId = window.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(storageKey, newId);
      return newId;
    } catch {
      return `temporary-${Date.now()}`;
    }
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return Math.round(R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.utils = {
    getLocalDateTimeString,
    downloadCSV,
    getDeviceInfo,
    getDeviceId,
    calculateDistance
  };
})();
