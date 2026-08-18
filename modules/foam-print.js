/**
 * foam-print.js — A4 landscape label print layout
 * Dependencies: none (pure DOM + window.print)
 * Supports custom layout via localStorage key 'foamPrintLayoutConfig'
 */
(function () {
  'use strict';

  function escape(value) {
    return String(value || '').replace(/[&]/g, '&' + 'amp;').replace(/[<]/g, '&' + 'lt;').replace(/[>]/g, '&' + 'gt;').replace(/["]/g, '&' + 'quot;');
  }

  // Default layout config (matches original hardcoded values)
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

  /**
   * Load print layout config from localStorage
   * Falls back to defaults if not saved
   */
  function loadPrintConfig() {
    try {
      var saved = localStorage.getItem('foamPrintLayoutConfig');
      if (saved) {
        var parsed = JSON.parse(saved);
        var config = {};
        for (var key in DEFAULT_CONFIG) {
          config[key] = parsed.hasOwnProperty(key) ? parsed[key] : DEFAULT_CONFIG[key];
        }
        return config;
      }
    } catch (e) {
      console.warn('Failed to load print layout config:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  /**
   * Build a single A4 landscape label as HTML
   * @param {Object} data - { name, phone, address, province, district, subdistrict, postalCode, shipping }
   * @param {Object} [cfg] - optional layout config (loaded from localStorage if not provided)
   * @returns {string} HTML string
   */
  function buildLabelHtml(data, cfg) {
    var config = cfg || loadPrintConfig();

    var name = escape(data.name || '');
    var phone = escape(data.phone || '');
    var address = escape(data.address || '');
    var subdistrict = escape(data.subdistrict || '');
    var district = escape(data.district || '');
    var province = escape(data.province || '');
    var postalCode = escape(data.postalCode || '');
    var shipping = escape(data.shipping || '');

    // Build address lines
    var addrLines = [];
    if (address) addrLines.push(address);
    var line2 = [subdistrict, district].filter(Boolean).join(' ');
    if (line2) addrLines.push(line2);
    var line3 = [province, postalCode].filter(Boolean).join(' ');
    if (line3) addrLines.push(line3);

    // Auto-scale font based on content length (name only)
    var nameLen = name.length;
    var nameFontSize = nameLen > 30 ? '36px' : nameLen > 20 ? '48px' : '60px';

    // Address: per-line auto-shrink from 52px down until fits in one line
    function calcAddrFontSize(line) {
      var maxWidth = 900; // approximate px width on A4 landscape
      var size = 52;
      while (size > 28) {
        if (line.length * size * 0.85 <= maxWidth) break;
        size -= 2;
      }
      return size + 'px';
    }

    return '<div class="foam-label-page">' +
      // Header row
      '<div class="foam-label-header">' +
        '<div class="foam-label-header-left" style="font-size:' + config.headerLeftFontSize + '; color:' + config.headerLeftColor + '; font-weight:' + config.fontWeight + ';">' + config.headerLeftText + '</div>' +
        '<div class="foam-label-header-right" style="font-size:' + nameFontSize + '; color:' + config.headerRightColor + '; font-weight:' + config.fontWeight + ';">' + name + '</div>' +
      '</div>' +

      // Address section
      '<div class="foam-label-address">' +
        addrLines.map(function (line) {
          return '<div class="foam-label-addr-line" style="font-size:' + calcAddrFontSize(line) + '; color:' + config.addressColor + '; font-weight:' + config.fontWeight + '; text-align:' + config.addressTextAlign + ';">' + line + '</div>';
        }).join('') +
        (shipping ? '<div class="foam-label-shipping" style="font-size:' + config.shippingFontSize + '; color:' + config.addressColor + '; font-weight:' + config.fontWeight + '; text-align:' + config.addressTextAlign + ';">ขนส่ง: ' + shipping + '</div>' : '') +
      '</div>' +

      // Footer row
      '<div class="foam-label-footer">' +
        '<div class="foam-label-footer-left" style="font-size:' + config.footerLeftFontSize + '; color:' + config.footerLeftColor + '; font-weight:' + config.fontWeight + ';">' + config.footerLeftText + '</div>' +
        '<div class="foam-label-footer-right" style="font-size:' + config.footerRightFontSize + '; color:' + config.footerRightColor + '; font-weight:' + config.fontWeight + ';">' + phone + '</div>' +
      '</div>' +
    '</div>';
  }

  /**
   * Open print preview for one or more labels
   * @param {Array<Object>} labels - array of label data objects
   */
  function printLabels(labels) {
    if (!labels || labels.length === 0) {
      window.alert('ไม่มีข้อมูลสำหรับพิมพ์');
      return;
    }

    var config = loadPrintConfig();

    // Build print window content
    var pagesHtml = labels.map(function (data) {
      return buildLabelHtml(data, config);
    }).join('');

    var fullHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>พิมพ์ป้ายลังโฟม</title>' +
      '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Sarabun", "TH Sarabun New", "Tahoma", sans-serif; }' +

        '@page { size: A4 landscape; margin: ' + config.pageMargin + '; }' +

        '.foam-label-page {' +
          'width: 100%; height: 100vh;' +
          'display: flex; flex-direction: column;' +
          'justify-content: space-between;' +
          'page-break-after: always;' +
          'padding: ' + config.pagePadding + ';' +
        '}' +

        '.foam-label-page:last-child { page-break-after: auto; }' +

        '.foam-label-header {' +
          'display: flex; justify-content: space-between; align-items: center;' +
          'border-bottom: ' + config.borderWidth + ' solid #000; padding-bottom: 8px;' +
        '}' +

        '.foam-label-header-left {' +
          'font-size: ' + config.headerLeftFontSize + '; font-weight: ' + config.fontWeight + '; color: ' + config.headerLeftColor + ';' +
        '}' +

        '.foam-label-header-right {' +
          'font-size: ' + config.headerRightFontSize + '; font-weight: ' + config.fontWeight + '; color: ' + config.headerRightColor + ';' +
          'text-align: right;' +
          'word-break: break-word;' +
        '}' +

        '.foam-label-address {' +
          'flex: 1; display: flex; flex-direction: column;' +
          'justify-content: center; padding: 10px 0;' +
        '}' +

        '.foam-label-addr-line {' +
          'font-size: ' + config.addressFontSize + '; line-height: 1.25; color: ' + config.addressColor + ';' +
          'font-weight: ' + config.fontWeight + '; text-align: ' + config.addressTextAlign + ';' +
          'word-break: break-word;' +
        '}' +

        '.foam-label-shipping {' +
          'font-size: ' + config.shippingFontSize + '; line-height: 1.3; color: ' + config.addressColor + '; font-weight: ' + config.fontWeight + ';' +
          'text-align: ' + config.addressTextAlign + '; margin-top: 14px;' +
        '}' +

        '.foam-label-footer {' +
          'display: flex; justify-content: space-between; align-items: center;' +
          'border-top: ' + config.borderWidth + ' solid #000; padding-top: 8px;' +
        '}' +

        '.foam-label-footer-left {' +
          'font-size: ' + config.footerLeftFontSize + '; font-weight: ' + config.fontWeight + '; color: ' + config.footerLeftColor + ';' +
        '}' +

        '.foam-label-footer-right {' +
          'font-size: ' + config.footerRightFontSize + '; font-weight: ' + config.fontWeight + '; color: ' + config.footerRightColor + ';' +
          'text-align: right;' +
        '}' +

        '@media print {' +
          'body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }' +
          '.foam-label-page { height: 100vh; }' +
        '}' +
      '</style></head><body>' +
      pagesHtml +
      '<script>window.onload=function(){window.print();}<' + '/script>' +
      '</body></html>';

    var printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      window.alert('กรุณาอนุญาต Pop-up เพื่อเปิดหน้าต่างพิมพ์');
      return;
    }
    printWindow.document.write(fullHtml);
    printWindow.document.close();
  }

  /**
   * Print a single label
   * @param {Object} data
   */
  function printSingleLabel(data) {
    printLabels([data]);
  }

  /**
   * Print multiple labels (one per box)
   * @param {Object} data - single customer data
   * @param {number} count - number of copies
   */
  function printMultipleLabels(data, count) {
    var labels = [];
    for (var i = 0; i < count; i++) {
      labels.push(data);
    }
    printLabels(labels);
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.foamPrint = {
    buildLabelHtml: buildLabelHtml,
    printLabels: printLabels,
    printSingleLabel: printSingleLabel,
    printMultipleLabels: printMultipleLabels
  };

  window.foamPrintLabels = printLabels;
  window.foamPrintSingleLabel = printSingleLabel;
  window.foamPrintMultipleLabels = printMultipleLabels;
})();
