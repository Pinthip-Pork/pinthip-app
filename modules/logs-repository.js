(function () {
  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function getMonthKey(dateStr) {
    const match = /^(\d{4})-(\d{2})/.exec(String(dateStr || '').trim());
    if (match) return `${match[1]}-${match[2]}`;
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  }

  function getMonthKeysInRange(startDate, endDate) {
    const startKey = getMonthKey(startDate);
    const endKey = getMonthKey(endDate || startDate);
    const [startYear, startMonth] = startKey.split('-').map(Number);
    const [endYear, endMonth] = endKey.split('-').map(Number);

    const keys = [];
    let year = startYear;
    let month = startMonth;
    let guard = 0;
    // guard avoids an infinite loop if callers pass an end date before the start date
    while ((year < endYear || (year === endYear && month <= endMonth)) && guard < 240) {
      keys.push(`${year}-${pad2(month)}`);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      guard += 1;
    }
    return keys.length ? keys : [startKey];
  }

  function mergeMonthSnapshots(monthKeys, snapshots) {
    const merged = {};
    monthKeys.forEach((monthKey, index) => {
      const monthObj = (snapshots[index] && snapshots[index].val()) || {};
      Object.keys(monthObj).forEach((entryKey) => {
        merged[`${monthKey}/${entryKey}`] = monthObj[entryKey];
      });
    });
    return merged;
  }

  function fetchLogsForMonth(db, monthKey) {
    return db.ref(`logs/${monthKey}`).once('value').then((snapshot) => mergeMonthSnapshots([monthKey], [snapshot]));
  }

  function fetchLogsForRange(db, startDate, endDate) {
    const monthKeys = getMonthKeysInRange(startDate, endDate || startDate);
    return Promise.all(monthKeys.map((monthKey) => db.ref(`logs/${monthKey}`).once('value')))
      .then((snapshots) => mergeMonthSnapshots(monthKeys, snapshots));
  }

  // Reads every month partition; only meant for the rare "full history" views.
  function fetchAllLogs(db) {
    return db.ref('logs').once('value').then((snapshot) => {
      const monthsObj = snapshot.val() || {};
      return mergeMonthSnapshots(Object.keys(monthsObj), Object.keys(monthsObj).map((monthKey) => ({
        val: () => monthsObj[monthKey]
      })));
    });
  }

  function writeLogEntry(db, entry, callback) {
    const monthKey = getMonthKey(entry && entry.date);
    return db.ref(`logs/${monthKey}`).push().set(entry, callback);
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.logsRepo = {
    getMonthKey,
    getMonthKeysInRange,
    mergeMonthSnapshots,
    fetchLogsForMonth,
    fetchLogsForRange,
    fetchAllLogs,
    writeLogEntry
  };
})();
