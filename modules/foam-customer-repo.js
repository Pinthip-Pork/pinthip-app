/**
 * foam-customer-repo.js — CRUD operations for foam label customers
 * Dependencies: window.db (Firebase Realtime Database)
 */
(function () {
  'use strict';

  function getDb() {
    return window.db;
  }

  function getCustomerPath() {
    return 'foam_customers';
  }

  /**
   * Fetch all customers from Firebase
   * @returns {Promise<Array<{key: string, name: string, phone: string, address: string, ...}>>}
   */
  function fetchAllCustomers() {
    return getDb().ref(getCustomerPath()).once('value').then(function (snapshot) {
      var obj = snapshot.val() || {};
      return Object.keys(obj).map(function (k) {
        return Object.assign({ key: k }, obj[k]);
      });
    });
  }

  /**
   * Search customers by name or phone (client-side filter)
   * @param {string} query
   * @returns {Promise<Array>}
   */
  function searchCustomers(query) {
    var q = String(query || '').trim().toLowerCase();
    if (!q) return fetchAllCustomers();
    return fetchAllCustomers().then(function (list) {
      return list.filter(function (c) {
        return (String(c.name || '').toLowerCase().indexOf(q) !== -1) ||
               (String(c.phone || '').toLowerCase().indexOf(q) !== -1);
      });
    });
  }

  /**
   * Get a single customer by key
   * @param {string} key
   * @returns {Promise<Object|null>}
   */
  function getCustomer(key) {
    return getDb().ref(getCustomerPath() + '/' + key).once('value').then(function (snapshot) {
      var val = snapshot.val();
      return val ? Object.assign({ key: key }, val) : null;
    });
  }

  /**
   * Add a new customer
   * @param {Object} data - { name, phone, address, province, district, subdistrict, postalCode, shipping, note }
   * @param {string} createdBy - employee ID who created it
   * @returns {Promise<{key: string}>}
   */
  function addCustomer(data, createdBy) {
    var now = new Date().toISOString();
    var entry = {
      name: String(data.name || '').trim(),
      phone: String(data.phone || '').trim(),
      address: String(data.address || '').trim(),
      province: String(data.province || '').trim(),
      district: String(data.district || '').trim(),
      subdistrict: String(data.subdistrict || '').trim(),
      postalCode: String(data.postalCode || '').trim(),
      shipping: String(data.shipping || '').trim(),
      note: String(data.note || '').trim(),
      createdAt: now,
      updatedAt: now,
      createdBy: String(createdBy || '')
    };
    var ref = getDb().ref(getCustomerPath()).push();
    return new Promise(function (resolve, reject) {
      ref.set(entry, function (err) {
        if (err) return reject(err);
        resolve({ key: ref.key });
      });
    });
  }

  /**
   * Update an existing customer
   * @param {string} key
   * @param {Object} data
   * @returns {Promise<void>}
   */
  function updateCustomer(key, data) {
    var update = {
      name: String(data.name || '').trim(),
      phone: String(data.phone || '').trim(),
      address: String(data.address || '').trim(),
      province: String(data.province || '').trim(),
      district: String(data.district || '').trim(),
      subdistrict: String(data.subdistrict || '').trim(),
      postalCode: String(data.postalCode || '').trim(),
      shipping: String(data.shipping || '').trim(),
      note: String(data.note || '').trim(),
      updatedAt: new Date().toISOString()
    };
    return getDb().ref(getCustomerPath() + '/' + key).update(update);
  }

  /**
   * Delete a customer
   * @param {string} key
   * @returns {Promise<void>}
   */
  function deleteCustomer(key) {
    return getDb().ref(getCustomerPath() + '/' + key).remove();
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.foamCustomerRepo = {
    getCustomerPath: getCustomerPath,
    fetchAllCustomers: fetchAllCustomers,
    searchCustomers: searchCustomers,
    getCustomer: getCustomer,
    addCustomer: addCustomer,
    updateCustomer: updateCustomer,
    deleteCustomer: deleteCustomer
  };
})();
