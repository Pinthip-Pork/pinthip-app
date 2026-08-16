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
    var db = getDb();
    if (!db) return Promise.reject(new Error('Firebase database not initialized'));
    return db.ref(getCustomerPath()).once('value').then(function (snapshot) {
      var obj = snapshot.val() || {};
      return Object.keys(obj).map(function (k) {
        return Object.assign({ key: k }, obj[k]);
      });
    }).catch(function (err) {
      console.error('Fetch customers error:', err.code, err.message);
      throw err;
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
    }).catch(function (err) {
      console.error('Search customers error:', err);
      throw err;
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
    var db = getDb();
    console.log('[foam-customer-repo] addCustomer called, db:', !!db, 'data:', data, 'createdBy:', createdBy);
    
    if (!db) {
      console.error('[foam-customer-repo] Database not initialized');
      return Promise.reject(new Error('Firebase database not initialized'));
    }
    if (!data || !data.name || !String(data.name || '').trim()) {
      console.error('[foam-customer-repo] Name is required');
      return Promise.reject(new Error('Customer name is required'));
    }
    
    var now = new Date().toISOString();
    var entry = {
      name: String(data.name || '').trim(),
      phone: String(data.phone || '').trim(),
      lineName: String(data.lineName || '').trim(),
      address: String(data.address || '').trim(),
      province: String(data.province || '').trim(),
      district: String(data.district || '').trim(),
      subdistrict: String(data.subdistrict || '').trim(),
      postalCode: String(data.postalCode || '').trim(),
      shipping: String(data.shipping || '').trim(),
      note: String(data.note || '').trim(),
      createdAt: now,
      updatedAt: now,
      createdBy: String(createdBy || 'unknown')
    };
    
    var path = getCustomerPath();
    console.log('[foam-customer-repo] Writing to path:', path);
    var ref = db.ref(path).push();
    
    return new Promise(function (resolve, reject) {
      ref.set(entry, function (err) {
        if (err) {
          console.error('[foam-customer-repo] Write failed. Code:', err.code, 'Message:', err.message);
          if (err.code === 'PERMISSION_DENIED') {
            return reject(new Error('ไม่มีสิทธิ์เขียนข้อมูล กรุณาตรวจสอบสิทธิ์ผู้ใช้'));
          }
          return reject(new Error('Write failed: ' + (err.message || 'Unknown error')));
        }
        console.log('[foam-customer-repo] Write success. Key:', ref.key);
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
    if (data.lineName !== undefined) update.lineName = String(data.lineName || '').trim();
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
