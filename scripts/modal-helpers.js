// Modal Helpers - Replacement for browser alert() and confirm()
// Provides better UX with custom styled modals that match the app's design

(function () {
  'use strict';

  window.PinThipSafe = window.PinThipSafe || {};

  // Registry of pending callbacks, keyed by id. Buttons reference callbacks
  // via this registry instead of serializing the function with toString()
  // and inlining it into an onclick="..." attribute — inlining breaks
  // whenever the callback's source contains a double quote (e.g. a nested
  // string with escaped quotes), producing malformed HTML/JS.
  var callbackRegistry = {};
  var callbackSeq = 0;

  function registerCallback(fn) {
    if (typeof fn !== 'function') return '';
    var id = 'cb' + (++callbackSeq);
    callbackRegistry[id] = fn;
    return id;
  }

  function runCallback(id) {
    var fn = callbackRegistry[id];
    delete callbackRegistry[id];
    if (typeof fn === 'function') fn();
  }

  // Exposed so inline onclick handlers can invoke registered callbacks.
  window.PinThipSafe.__runModalCallback = runCallback;

  function onclickFor(id, extra) {
    var call = id ? "window.PinThipSafe.__runModalCallback('" + id + "');" : '';
    return (extra || '') + call;
  }

  /**
   * Modal helper functions to replace browser alert() and confirm()
   * Uses the existing showModal() and closeModal() functions from app-globals.js
   */
  window.PinThipSafe.modal = {
    
    /**
     * Show a simple alert message (replacement for window.alert)
     * @param {string} message - Message to display
     * @param {function} callback - Optional callback after user clicks OK
     */
    alert: function(message, callback) {
      const id = registerCallback(callback);
      showModal(
        '💬 แจ้งเตือน',
        String(message || ''),
        `<button class="btn-primary" onclick="${onclickFor(id, 'closeModal(); ')}">ตกลง</button>`
      );
    },
    
    /**
     * Show a success message
     * @param {string} message - Success message to display
     * @param {function} callback - Optional callback after user clicks OK
     */
    success: function(message, callback) {
      const id = registerCallback(callback);
      showModal(
        '🎉 สำเร็จ',
        String(message || 'ดำเนินการสำเร็จ'),
        `<button class="btn-success" onclick="${onclickFor(id, 'closeModal(); ')}">ตกลง</button>`
      );
    },
    
    /**
     * Show an error message
     * @param {string} message - Error message to display
     * @param {function} callback - Optional callback after user clicks close
     */
    error: function(message, callback) {
      const id = registerCallback(callback);
      showModal(
        '❌ เกิดข้อผิดพลาด',
        String(message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'),
        `<button class="btn-danger" onclick="${onclickFor(id, 'closeModal(); ')}">ปิด</button>`
      );
    },
    
    /**
     * Show a warning message
     * @param {string} message - Warning message to display
     * @param {function} callback - Optional callback after user clicks OK
     */
    warning: function(message, callback) {
      const id = registerCallback(callback);
      showModal(
        '⚠️ คำเตือน',
        String(message || ''),
        `<button class="btn-warning" onclick="${onclickFor(id, 'closeModal(); ')}">ตกลง</button>`
      );
    },
    
    /**
     * Show a confirmation dialog (replacement for window.confirm)
     */
    confirm: function(message, onConfirm, onCancel, title) {
      const confirmId = registerCallback(onConfirm);
      const cancelId = registerCallback(onCancel);
      
      showModal(
        title || '❓ ยืนยันการทำงาน',
        String(message || 'ต้องการดำเนินการต่อใช่หรือไม่?'),
        `<button class="btn-primary" onclick="${onclickFor(confirmId, 'closeModal(); ')}">ยืนยัน</button>
         <button class="btn-secondary" onclick="${onclickFor(cancelId, 'closeModal(); ')}" style="margin-left:8px;">ยกเลิก</button>`
      );
    },
    
    /**
     * Show a delete confirmation dialog
     */
    confirmDelete: function(message, onConfirm) {
      const confirmId = registerCallback(onConfirm);
      
      showModal(
        '🗑️ ยืนยันการลบ',
        String(message || 'ต้องการลบข้อมูลนี้ใช่หรือไม่?') + '\n\n⚠️ การลบไม่สามารถย้อนกลับได้',
        `<button class="btn-danger" onclick="${onclickFor(confirmId, 'closeModal(); ')}">ยืนยันลบ</button>
         <button class="btn-secondary" onclick="closeModal()" style="margin-left:8px;">ยกเลิก</button>`
      );
    },
    
    /**
     * Show an input prompt dialog
     */
    prompt: function(title, message, onSubmit, defaultValue, placeholder) {
      const inputId = 'modalPromptInput_' + Date.now();
      const submitId = registerCallback(function() {
        var input = document.getElementById(inputId);
        if (typeof onSubmit === 'function') onSubmit(input ? input.value : '');
      });
      const submitOnclick = onclickFor(submitId, '') + ' closeModal();';
      
      showModal(
        title || '📝 กรอกข้อมูล',
        '',
        `<button class="btn-primary" onclick="${submitOnclick}">ตกลง</button>
         <button class="btn-secondary" onclick="closeModal()" style="margin-left:8px;">ยกเลิก</button>`,
        `<p style="margin-bottom:10px;">${message || ''}</p>
         <input type="text" id="${inputId}" class="form-control" value="${defaultValue || ''}"
                placeholder="${placeholder || ''}"
                style="width:100%; padding:10px; border:1px solid #ced4da; border-radius:6px;"
                onkeypress="if(event.key==='Enter'){${submitOnclick}}">`
      );
      
      setTimeout(function() {
        const input = document.getElementById(inputId);
        if (input) { input.focus(); input.select(); }
      }, 100);
    },
    
    /**
     * Close the modal programmatically
     */
    close: function() {
      if (typeof closeModal === 'function') closeModal();
    }
  };
})();
