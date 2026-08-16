/**
 * foam-delivery-repo.js — CRUD for foam delivery requests
 * Dependencies: window.db, window.PinThipSafe.foamCustomerRepo
 */
(function () {
  'use strict';

  var STATUS = {
    PENDING_REVIEW: 'pending_review',
    PENDING_DUPLICATE: 'pending_duplicate_approval',
    APPROVED: 'approved',
    PRINTED: 'printed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  };

  var STATUS_LABELS = {
    pending_review: 'รอตรวจสอบ',
    pending_duplicate_approval: 'รออนุมัติ (รายการซ้ำ)',
    approved: 'อนุมัติแล้ว',
    printed: 'พิมพ์แล้ว',
    completed: 'เสร็จสิ้น',
    cancelled: 'ยกเลิก'
  };

  function getDb() {
    return window.db;
  }

  function getTodayStr() {
    return (window.PinThipSafe && window.PinThipSafe.utils && window.PinThipSafe.utils.getLocalDateTimeString)
      ? window.PinThipSafe.utils.getLocalDateTimeString()
      : new Date().toISOString().slice(0, 10);
  }

  function statusLabel(status) {
    return STATUS_LABELS[status] || status;
  }

  /**
   * Fetch all delivery requests for a given date
   * @param {string} [dateStr] - YYYY-MM-DD, defaults to today
   * @returns {Promise<Array<{key: string, ...}>>}
   */
  function fetchRequestsByDate(dateStr) {
    var d = dateStr || getTodayStr();
    return getDb().ref('foam_delivery_requests/' + d).once('value').then(function (snapshot) {
      var obj = snapshot.val() || {};
      return Object.keys(obj).map(function (k) {
        return Object.assign({ key: k }, obj[k]);
      });
    });
  }

  /**
   * Check if a customer already has a delivery request today
   * @param {string} customerId
   * @param {string} [dateStr]
   * @returns {Promise<{hasExisting: boolean, existingCount: number, existingRequests: Array}>}
   */
  function checkDuplicateToday(customerId, dateStr) {
    return fetchRequestsByDate(dateStr).then(function (list) {
      var existing = list.filter(function (r) {
        return String(r.customerId) === String(customerId) &&
               r.status !== STATUS.CANCELLED;
      });
      return {
        hasExisting: existing.length > 0,
        existingCount: existing.length,
        existingRequests: existing
      };
    });
  }

  /**
   * Submit a new foam delivery request
   * @param {Object} data
   * @returns {Promise<{key: string, isDuplicate: boolean}>}
   */
  function submitRequest(data) {
    var customerId = String(data.customerId || '');
    var dateStr = data.deliveryDate || getTodayStr();

    return checkDuplicateToday(customerId, dateStr).then(function (dup) {
      var isDuplicate = dup.hasExisting;
      var now = new Date().toISOString();

      var entry = {
        customerId: customerId,
        customerSnapshot: data.customerSnapshot || {},
        employeeId: String(data.employeeId || ''),
        employeeName: String(data.employeeName || ''),
        deliveryDate: dateStr,
        boxCount: Math.max(1, Math.min(10, Number(data.boxCount) || 1)),
        shipping: String(data.shipping || ''),
        status: isDuplicate ? STATUS.PENDING_DUPLICATE : STATUS.PENDING_REVIEW,
        isDuplicate: isDuplicate,
        note: String(data.note || ''),
        createdAt: now,
        reviewedAt: null,
        reviewedBy: null,
        printedAt: null,
        printedBy: null
      };

      var ref = getDb().ref('foam_delivery_requests/' + dateStr).push();
      return new Promise(function (resolve, reject) {
        ref.set(entry, function (err) {
          if (err) return reject(err);
          resolve({ key: ref.key, isDuplicate: isDuplicate });
        });
      });
    });
  }

  /**
   * Update request status
   * @param {string} dateStr
   * @param {string} key
   * @param {string} newStatus
   * @param {string} [reviewedBy]
   * @returns {Promise<void>}
   */
  function updateStatus(dateStr, key, newStatus, reviewedBy) {
    var update = { status: newStatus };
    var now = new Date().toISOString();

    if (newStatus === STATUS.APPROVED || newStatus === STATUS.CANCELLED) {
      update.reviewedAt = now;
      update.reviewedBy = String(reviewedBy || '');
    }
    if (newStatus === STATUS.PRINTED) {
      update.printedAt = now;
      update.printedBy = String(reviewedBy || '');
    }
    if (newStatus === STATUS.COMPLETED) {
      update.printedAt = update.printedAt || now;
    }

    return getDb().ref('foam_delivery_requests/' + dateStr + '/' + key).update(update);
  }

  /**
   * Update request data (address, shipping, boxCount, etc.)
   * @param {string} dateStr
   * @param {string} key
   * @param {Object} data
   * @returns {Promise<void>}
   */
  function updateRequest(dateStr, key, data) {
    var update = {};
    if (data.customerSnapshot !== undefined) update.customerSnapshot = data.customerSnapshot;
    if (data.boxCount !== undefined) update.boxCount = Math.max(1, Math.min(10, Number(data.boxCount) || 1));
    if (data.shipping !== undefined) update.shipping = String(data.shipping || '');
    if (data.note !== undefined) update.note = String(data.note || '');
    return getDb().ref('foam_delivery_requests/' + dateStr + '/' + key).update(update);
  }

  /**
   * Delete a request
   * @param {string} dateStr
   * @param {string} key
   * @returns {Promise<void>}
   */
  function deleteRequest(dateStr, key) {
    return getDb().ref('foam_delivery_requests/' + dateStr + '/' + key).remove();
  }

  /**
   * Listen to today's requests in real-time
   * @param {Function} callback - called with array of requests
   * @returns {Function} unsubscribe function
   */
  function listenTodayRequests(callback) {
    var dateStr = getTodayStr();
    var ref = getDb().ref('foam_delivery_requests/' + dateStr);
    var handler = function (snapshot) {
      var obj = snapshot.val() || {};
      var list = Object.keys(obj).map(function (k) {
        return Object.assign({ key: k }, obj[k]);
      });
      callback(list);
    };
    ref.on('value', handler);
    return function () {
      ref.off('value', handler);
    };
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.foamDeliveryRepo = {
    STATUS: STATUS,
    STATUS_LABELS: STATUS_LABELS,
    statusLabel: statusLabel,
    fetchRequestsByDate: fetchRequestsByDate,
    checkDuplicateToday: checkDuplicateToday,
    submitRequest: submitRequest,
    updateStatus: updateStatus,
    updateRequest: updateRequest,
    deleteRequest: deleteRequest,
    listenTodayRequests: listenTodayRequests
  };
})();
