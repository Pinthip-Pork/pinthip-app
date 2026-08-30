// Modal Helpers - Replacement for browser alert() and confirm()
// Provides better UX with custom styled modals that match the app's design

(function () {
  'use strict';

  window.PinThipSafe = window.PinThipSafe || {};
  
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
      const callbackStr = callback ? `(${callback.toString()})();` : '';
      showModal(
        '💬 แจ้งเตือน',
        String(message || ''),
        `<button class="btn-primary" onclick="closeModal(); ${callbackStr}">ตกลง</button>`
      );
    },
    
    /**
     * Show a success message
     * @param {string} message - Success message to display
     * @param {function} callback - Optional callback after user clicks OK
     */
    success: function(message, callback) {
      const callbackStr = callback ? `(${callback.toString()})();` : '';
      showModal(
        '🎉 สำเร็จ',
        String(message || 'ดำเนินการสำเร็จ'),
        `<button class="btn-success" onclick="closeModal(); ${callbackStr}">ตกลง</button>`
      );
    },
    
    /**
     * Show an error message
     * @param {string} message - Error message to display
     * @param {function} callback - Optional callback after user clicks close
     */
    error: function(message, callback) {
      const callbackStr = callback ? `(${callback.toString()})();` : '';
      showModal(
        '❌ เกิดข้อผิดพลาด',
        String(message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'),
        `<button class="btn-danger" onclick="closeModal(); ${callbackStr}">ปิด</button>`
      );
    },
    
    /**
     * Show a warning message
     * @param {string} message - Warning message to display
     * @param {function} callback - Optional callback after user clicks OK
     */
    warning: function(message, callback) {
      const callbackStr = callback ? `(${callback.toString()})();` : '';
      showModal(
        '⚠️ คำเตือน',
        String(message || ''),
        `<button class="btn-warning" onclick="closeModal(); ${callbackStr}">ตกลง</button>`
      );
    },
    
    /**
     * Show a confirmation dialog (replacement for window.confirm)
     */
    confirm: function(message, onConfirm, onCancel, title) {
      const confirmFn = onConfirm ? `closeModal(); (${onConfirm.toString()})();` : 'closeModal();';
      const cancelFn = onCancel ? `closeModal(); (${onCancel.toString()})();` : 'closeModal();';
      
      showModal(
        title || '❓ ยืนยันการทำงาน',
        String(message || 'ต้องการดำเนินการต่อใช่หรือไม่?'),
        `<button class="btn-primary" onclick="${confirmFn}">ยืนยัน</button>
         <button class="btn-secondary" onclick="${cancelFn}" style="margin-left:8px;">ยกเลิก</button>`
      );
    },
    
    /**
     * Show a delete confirmation dialog
     */
    confirmDelete: function(message, onConfirm) {
      const confirmFn = onConfirm ? `closeModal(); (${onConfirm.toString()})();` : 'closeModal();';
      
      showModal(
        '🗑️ ยืนยันการลบ',
        String(message || 'ต้องการลบข้อมูลนี้ใช่หรือไม่?') + '\n\n⚠️ การลบไม่สามารถย้อนกลับได้',
        `<button class="btn-danger" onclick="${confirmFn}">ยืนยันลบ</button>
         <button class="btn-secondary" onclick="closeModal()" style="margin-left:8px;">ยกเลิก</button>`
      );
    },
    
    /**
     * Show an input prompt dialog
     */
    prompt: function(title, message, onSubmit, defaultValue, placeholder) {
      const inputId = 'modalPromptInput_' + Date.now();
      const submitFn = onSubmit 
        ? `(${onSubmit.toString()})(document.getElementById('${inputId}').value); closeModal();`
        : 'closeModal();';
      
      showModal(
        title || '📝 กรอกข้อมูล',
        '',
        `<button class="btn-primary" onclick="${submitFn}">ตกลง</button>
         <button class="btn-secondary" onclick="closeModal()" style="margin-left:8px;">ยกเลิก</button>`,
        `<p style="margin-bottom:10px;">${message || ''}</p>
         <input type="text" id="${inputId}" class="form-control" value="${defaultValue || ''}"
                placeholder="${placeholder || ''}"
                style="width:100%; padding:10px; border:1px solid #ced4da; border-radius:6px;"
                onkeypress="if(event.key==='Enter'){${submitFn}}">`
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
