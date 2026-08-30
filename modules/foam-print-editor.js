/**
 * foam-print-editor.js — Live Preview Print Layout Editor
 * Allows adjusting label layout via UI controls with real-time preview
 * Dependencies: window.PinThipSafe.foamPrint
 */
(function () {
  'use strict';

  var DEFAULT_CONFIG = {
    headerLeftFontSize: '42px',
    headerRightFontSize: '60px',
    addressFontSize: '60px',
    shippingFontSize: '42px',
    footerLeftFontSize: '42px',
    footerRightFontSize: '52px',
    borderWidth: '3px',
    pagePadding: '10mm',
    pageMargin: '8mm',
    headerLeftColor: '#333333',
    headerRightColor: '#000000',
    addressColor: '#000000',
    footerLeftColor: '#333333',
    footerRightColor: '#000000',
    fontWeight: 'bold',
    addressTextAlign: 'center',
    headerLeftText: 'กรุณาส่ง',
    footerLeftText: 'โทร'
  };

  function loadConfig() {
    try {
      var saved = localStorage.getItem('foamPrintLayoutConfig');
      if (saved) {
        var parsed = JSON.parse(saved);
        // Merge with defaults to ensure all keys exist
        var config = {};
        for (var key in DEFAULT_CONFIG) {
          config[key] = Object.prototype.hasOwnProperty.call(parsed, key) ? parsed[key] : DEFAULT_CONFIG[key];
        }
        return config;
      }
    } catch (e) {
      console.warn('Failed to load print layout config:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  function saveConfig(config) {
    try {
      localStorage.setItem('foamPrintLayoutConfig', JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save print layout config:', e);
    }
  }

  function resetConfig() {
    saveConfig(DEFAULT_CONFIG);
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  // Build a preview label HTML using current config
  function buildPreviewHtml(config) {
    var sampleData = {
      name: 'ร้านสมชาย การค้า',
      phone: '088-123-4567',
      address: '123/45 หมู่ 6 ถนนสุขุมวิท',
      subdistrict: 'บางนา',
      district: 'บางนา',
      province: 'กรุงเทพฯ',
      postalCode: '10260',
      shipping: 'บริษัท ไปรษณีย์ไทย จำกัด'
    };

    var name = sampleData.name;
    var phone = sampleData.phone;
    var address = sampleData.address;
    var subdistrict = sampleData.subdistrict;
    var district = sampleData.district;
    var province = sampleData.province;
    var postalCode = sampleData.postalCode;
    var shipping = sampleData.shipping;

    var addrLines = [];
    if (address) addrLines.push(address);
    var line2 = [subdistrict, district].filter(Boolean).join(' ');
    if (line2) addrLines.push(line2);
    var line3 = [province, postalCode].filter(Boolean).join(' ');
    if (line3) addrLines.push(line3);

    return '<div class="foam-label-preview-page">' +
      '<div class="foam-label-preview-header">' +
        '<div class="foam-label-preview-header-left" style="font-size:' + config.headerLeftFontSize + '; color:' + config.headerLeftColor + '; font-weight:' + config.fontWeight + ';">' + config.headerLeftText + '</div>' +
        '<div class="foam-label-preview-header-right" style="font-size:' + config.headerRightFontSize + '; color:' + config.headerRightColor + '; font-weight:' + config.fontWeight + ';">' + name + '</div>' +
      '</div>' +
      '<div class="foam-label-preview-address">' +
        addrLines.map(function (line) {
          return '<div class="foam-label-preview-addr-line" style="font-size:' + config.addressFontSize + '; color:' + config.addressColor + '; font-weight:' + config.fontWeight + '; text-align:' + config.addressTextAlign + ';">' + line + '</div>';
        }).join('') +
        (shipping ? '<div class="foam-label-preview-shipping" style="font-size:' + config.shippingFontSize + '; color:' + config.addressColor + '; font-weight:' + config.fontWeight + '; text-align:' + config.addressTextAlign + ';">ขนส่ง: ' + shipping + '</div>' : '') +
      '</div>' +
      '<div class="foam-label-preview-footer">' +
        '<div class="foam-label-preview-footer-left" style="font-size:' + config.footerLeftFontSize + '; color:' + config.footerLeftColor + '; font-weight:' + config.fontWeight + ';">' + config.footerLeftText + '</div>' +
        '<div class="foam-label-preview-footer-right" style="font-size:' + config.footerRightFontSize + '; color:' + config.footerRightColor + '; font-weight:' + config.fontWeight + ';">' + phone + '</div>' +
      '</div>' +
    '</div>';
  }

  // Generate preview CSS from config
  function buildPreviewCss(config) {
    return '' +
      '.foam-label-preview-page {' +
        'width: 100%;' +
        'display: flex; flex-direction: column;' +
        'justify-content: space-between;' +
        'padding: ' + config.pagePadding + ';' +
        'border: 1px solid #ccc;' +
        'border-radius: 4px;' +
        'background: #fff;' +
        'min-height: 300px;' +
      '}' +
      '.foam-label-preview-header {' +
        'display: flex; justify-content: space-between; align-items: center;' +
        'border-bottom: ' + config.borderWidth + ' solid #000;' +
        'padding-bottom: 8px;' +
      '}' +
      '.foam-label-preview-header-left {' +
        'font-weight: ' + config.fontWeight + ';' +
      '}' +
      '.foam-label-preview-header-right {' +
        'font-weight: ' + config.fontWeight + ';' +
        'text-align: right;' +
        'word-break: break-word;' +
      '}' +
      '.foam-label-preview-address {' +
        'flex: 1; display: flex; flex-direction: column;' +
        'justify-content: center; padding: 10px 0;' +
      '}' +
      '.foam-label-preview-addr-line {' +
        'line-height: 1.25;' +
        'font-weight: ' + config.fontWeight + ';' +
        'word-break: break-word;' +
      '}' +
      '.foam-label-preview-shipping {' +
        'line-height: 1.3;' +
        'font-weight: ' + config.fontWeight + ';' +
        'margin-top: 14px;' +
      '}' +
      '.foam-label-preview-footer {' +
        'display: flex; justify-content: space-between; align-items: center;' +
        'border-top: ' + config.borderWidth + ' solid #000;' +
        'padding-top: 8px;' +
      '}' +
      '.foam-label-preview-footer-left {' +
        'font-weight: ' + config.fontWeight + ';' +
      '}' +
      '.foam-label-preview-footer-right {' +
        'font-weight: ' + config.fontWeight + ';' +
        'text-align: right;' +
      '}';
  }

  // Build the editor UI
  function buildEditorHtml(config) {
    function slider(name, label, min, max, step, unit) {
      var val = parseInt(config[name]) || parseInt(DEFAULT_CONFIG[name]);
      return '<div class="editor-field">' +
        '<label>' + label + ': <span id="editorVal_' + name + '">' + config[name] + '</span></label>' +
        '<input type="range" id="editor_' + name + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" data-unit="' + unit + '" data-label="' + label + '">' +
      '</div>';
    }

    function colorPicker(name, label) {
      return '<div class="editor-field">' +
        '<label>' + label + '</label>' +
        '<input type="color" id="editor_' + name + '" value="' + config[name] + '">' +
      '</div>';
    }

    function textInput(name, label) {
      return '<div class="editor-field">' +
        '<label>' + label + '</label>' +
  '<input type="text" id="editor_' + name + '" value="' + String(config[name] || '').replace(/"/g, '&' + 'quot;') + '" style="width:100%; padding:4px 8px; font-size:14px; border:1px solid #ccc; border-radius:4px;">' +
      '</div>';
    }

    function select(name, label, options) {
      var opts = options.map(function (o) {
        var sel = config[name] === o.value ? ' selected' : '';
        return '<option value="' + o.value + '"' + sel + '>' + o.label + '</option>';
      }).join('');
      return '<div class="editor-field">' +
        '<label>' + label + '</label>' +
        '<select id="editor_' + name + '" style="width:100%; padding:4px 8px; font-size:14px; border:1px solid #ccc; border-radius:4px;">' + opts + '</select>' +
      '</div>';
    }

    return '' +
      '<div class="editor-container">' +
        '<div class="editor-controls">' +
          '<h3 style="margin:0 0 12px; font-size:18px;">🎨 ปรับแต่ง Layout</h3>' +
          '<div class="editor-section">' +
            '<b>ขนาดตัวอักษร</b>' +
            slider('headerLeftFontSize', '"กรุณาส่ง"', 20, 80, 2, 'px') +
            slider('headerRightFontSize', 'ชื่อลูกค้า', 20, 80, 2, 'px') +
            slider('addressFontSize', 'ที่อยู่', 20, 80, 2, 'px') +
            slider('shippingFontSize', 'ขนส่ง', 20, 80, 2, 'px') +
            slider('footerLeftFontSize', '"โทร"', 20, 80, 2, 'px') +
            slider('footerRightFontSize', 'เบอร์โทร', 20, 80, 2, 'px') +
          '</div>' +
          '<div class="editor-section">' +
            '<b>สี</b>' +
            colorPicker('headerLeftColor', 'สี "กรุณาส่ง"') +
            colorPicker('headerRightColor', 'สีชื่อลูกค้า') +
            colorPicker('addressColor', 'สีที่อยู่') +
            colorPicker('footerLeftColor', 'สี "โทร"') +
            colorPicker('footerRightColor', 'สีเบอร์โทร') +
          '</div>' +
          '<div class="editor-section">' +
            '<b>ระยะห่าง & ขอบ</b>' +
            slider('borderWidth', 'ความหนาเส้นขอบ', 1, 8, 1, 'px') +
            slider('pagePadding', 'ระยะห่างภายใน', 2, 20, 1, 'mm') +
            slider('pageMargin', 'ระยะขอบกระดาษ', 2, 20, 1, 'mm') +
          '</div>' +
          '<div class="editor-section">' +
            '<b>การจัดวาง</b>' +
            select('fontWeight', 'น้ำหนักตัวอักษร', [
              { value: 'bold', label: 'ตัวหนา' },
              { value: 'normal', label: 'ปกติ' }
            ]) +
            select('addressTextAlign', 'จัดตำแหน่งที่อยู่', [
              { value: 'center', label: 'กึ่งกลาง' },
              { value: 'left', label: 'ชิดซ้าย' },
              { value: 'right', label: 'ชิดขวา' }
            ]) +
          '</div>' +
          '<div class="editor-section">' +
            '<b>ข้อความ</b>' +
            textInput('headerLeftText', 'ข้อความหัวซ้าย') +
            textInput('footerLeftText', 'ข้อความท้ายซ้าย') +
          '</div>' +
          '<div class="editor-actions">' +
            '<button class="btn-green" onclick="window.PinThipSafe.foamPrintEditor.saveAndClose()" style="flex:1;">💾 บันทึกและปิด</button>' +
            '<button class="btn-blue" onclick="window.PinThipSafe.foamPrintEditor.resetDefaults()" style="flex:1;">↩️ ค่าเริ่มต้น</button>' +
          '</div>' +
          '<div class="editor-actions" style="margin-top:8px;">' +
            '<button class="btn-orange" onclick="window.PinThipSafe.foamPrintEditor.testPrint()" style="flex:1;">🖨️ พิมพ์ทดสอบ</button>' +
            '<button class="btn-back" onclick="window.PinThipSafe.foamPrintEditor.closeEditor()" style="flex:1;">❌ ปิด</button>' +
          '</div>' +
        '</div>' +
        '<div class="editor-preview" id="editorPreviewContainer">' +
          '<div style="font-size:13px; color:#666; margin-bottom:8px; text-align:center;">👁️ ตัวอย่าง (Preview)</div>' +
          '<div id="editorPreviewInner"></div>' +
        '</div>' +
      '</div>';
  }

  // Collect current config from editor controls
  function collectConfigFromControls() {
    var config = {};
    for (var key in DEFAULT_CONFIG) {
      var el = document.getElementById('editor_' + key);
      if (el) {
        if (el.type === 'color') {
          config[key] = el.value;
        } else if (el.type === 'range') {
          var unit = el.getAttribute('data-unit') || 'px';
          config[key] = el.value + unit;
        } else if (el.tagName === 'SELECT') {
          config[key] = el.value;
        } else if (el.type === 'text') {
          config[key] = el.value;
        } else {
          config[key] = el.value;
        }
      } else {
        config[key] = DEFAULT_CONFIG[key];
      }
    }
    return config;
  }

  // Update preview
  function updatePreview() {
    var config = collectConfigFromControls();
    var container = document.getElementById('editorPreviewInner');
    if (!container) return;

    var css = buildPreviewCss(config);
    var html = buildPreviewHtml(config);
    container.innerHTML = '<style>' + css + '</style>' + html;
  }

  // Attach event listeners to all editor controls
  function attachEditorEvents() {
    var container = document.querySelector('.editor-controls');
    if (!container) return;

    container.addEventListener('input', function (e) {
      var target = e.target;
      if (target.id && target.id.indexOf('editor_') === 0) {
        // Update value display for sliders
        if (target.type === 'range') {
          var unit = target.getAttribute('data-unit') || 'px';
          var valSpan = document.getElementById('editorVal_' + target.id.replace('editor_', ''));
          if (valSpan) valSpan.textContent = target.value + unit;
        }
        updatePreview();
      }
    });

    container.addEventListener('change', function (e) {
      var target = e.target;
      if (target.id && target.id.indexOf('editor_') === 0) {
        updatePreview();
      }
    });
  }

  // Main function to show the editor
  function showPrintLayoutEditor() {
    if (!window.PinThipSafe || !window.PinThipSafe.requireFirebaseAuth || !window.PinThipSafe.requireFirebaseAuth()) {
      return;
    }

    var config = loadConfig();

    var mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    var pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.innerText = '🎨 ปรับแต่ง Layout พิมพ์ป้าย';

    var status = document.getElementById('status');
    if (status) status.innerText = '';

    var listBox = document.getElementById('listBox');
    if (listBox) listBox.style.display = 'none';

    mainContent.innerHTML = buildEditorHtml(config);

    // Add editor styles
    var styleEl = document.getElementById('foamPrintEditorStyles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'foamPrintEditorStyles';
      styleEl.textContent = '' +
        '.editor-container {' +
          'display: grid; grid-template-columns: 340px 1fr; gap: 20px;' +
          'align-items: start; max-width: 1100px; margin: 0 auto;' +
        '}' +
        '.editor-controls {' +
          'background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;' +
          'padding: 16px; max-height: 80vh; overflow-y: auto;' +
        '}' +
        '.editor-section {' +
          'margin-bottom: 16px; padding-bottom: 12px;' +
          'border-bottom: 1px solid #e9ecef;' +
        '}' +
        '.editor-section:last-child { border-bottom: none; }' +
        '.editor-section > b { display: block; margin-bottom: 8px; font-size: 14px; color: #495057; }' +
        '.editor-field {' +
          'margin-bottom: 8px;' +
        '}' +
        '.editor-field label {' +
          'display: block; font-size: 13px; color: #666; margin-bottom: 2px;' +
        '}' +
        '.editor-field input[type="range"] {' +
          'width: 100%; margin: 0;' +
        '}' +
        '.editor-field input[type="color"] {' +
          'width: 100%; height: 32px; padding: 2px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;' +
        '}' +
        '.editor-actions {' +
          'display: flex; gap: 8px;' +
        '}' +
        '.editor-preview {' +
          'background: #f0f0f0; border: 1px solid #dee2e6; border-radius: 8px;' +
          'padding: 20px; min-height: 400px;' +
          'display: flex; flex-direction: column;' +
        '}' +
        '#editorPreviewInner {' +
          'flex: 1; display: flex; flex-direction: column; justify-content: center;' +
        '}' +
        '.btn-orange {' +
          'display: inline-block; padding: 10px 16px; font-size: 15px; font-weight: bold;' +
          'border: none; border-radius: 8px; cursor: pointer; color: #fff; background: #f59e0b;' +
        '}' +
        '.btn-orange:hover { background: #d97706; }' +
        '.btn-green {' +
          'display: inline-block; padding: 10px 16px; font-size: 15px; font-weight: bold;' +
          'border: none; border-radius: 8px; cursor: pointer; color: #fff; background: #16a34a;' +
        '}' +
        '.btn-green:hover { background: #15803d; }' +
        '.btn-blue {' +
          'display: inline-block; padding: 10px 16px; font-size: 15px; font-weight: bold;' +
          'border: none; border-radius: 8px; cursor: pointer; color: #fff; background: #2563eb;' +
        '}' +
        '.btn-blue:hover { background: #1d4ed8; }' +
        '.btn-back {' +
          'display: inline-block; padding: 10px 16px; font-size: 15px; font-weight: bold;' +
          'border: none; border-radius: 8px; cursor: pointer; color: #fff; background: #6c757d;' +
        '}' +
        '.btn-back:hover { background: #5a6268; }' +
        '@media (max-width: 768px) {' +
          '.editor-container { grid-template-columns: 1fr; }' +
          '.editor-controls { max-height: none; }' +
        '}';
      document.head.appendChild(styleEl);
    }

    // Initial preview render
    updatePreview();
    attachEditorEvents();
  }

  // Save config and close
  function saveAndClose() {
    var config = collectConfigFromControls();
    saveConfig(config);
    // Show success feedback
    var status = document.getElementById('status');
    if (status) {
      status.innerText = '✅ บันทึกการตั้งค่าเรียบร้อย';
      status.style.color = '#16a34a';
    }
    // Navigate back to foam admin view
    if (typeof showFoamAdminView === 'function') {
      setTimeout(showFoamAdminView, 500);
    }
  }

  // Reset to defaults
  function resetDefaults() {
    resetConfig();
    // Rebuild editor with defaults
    showPrintLayoutEditor();
  }

  // Test print with current config
  function testPrint() {
    var config = collectConfigFromControls();
    // Save temporarily for print
    saveConfig(config);

    // Use the existing print function with sample data
    if (window.PinThipSafe && window.PinThipSafe.foamPrint) {
      var sampleData = {
        name: 'ร้านสมชาย การค้า',
        phone: '088-123-4567',
        address: '123/45 หมู่ 6 ถนนสุขุมวิท',
        subdistrict: 'บางนา',
        district: 'บางนา',
        province: 'กรุงเทพฯ',
        postalCode: '10260',
        shipping: 'บริษัท ไปรษณีย์ไทย จำกัด'
      };
      window.PinThipSafe.foamPrint.printSingleLabel(sampleData);
    } else {
      PinThipSafe.modal.warning('ไม่พบฟังก์ชันพิมพ์');
    }
  }

  // Close editor
  function closeEditor() {
    if (typeof showFoamAdminView === 'function') {
      showFoamAdminView();
    }
  }

  // Export
  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.foamPrintEditor = {
    showPrintLayoutEditor: showPrintLayoutEditor,
    saveAndClose: saveAndClose,
    resetDefaults: resetDefaults,
    testPrint: testPrint,
    closeEditor: closeEditor,
    loadConfig: loadConfig,
    collectConfigFromControls: collectConfigFromControls
  };

  // Global function for easy access
  window.showPrintLayoutEditor = showPrintLayoutEditor;
})();