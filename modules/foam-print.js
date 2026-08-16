/**
 * foam-print.js — A4 landscape label print layout
 * Dependencies: none (pure DOM + window.print)
 */
(function () {
  'use strict';

  function escape(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Build a single A4 landscape label as HTML
   * @param {Object} data - { name, phone, address, province, district, subdistrict, postalCode, shipping }
   * @returns {string} HTML string
   */
  function buildLabelHtml(data) {
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

    // Auto-scale font based on content length
    var nameLen = name.length;
    var nameFontSize = nameLen > 30 ? '36px' : nameLen > 20 ? '48px' : '60px';

    var addrLen = addrLines.join(' ').length;
    var addrFontSize = addrLen > 80 ? '22px' : addrLen > 50 ? '28px' : '34px';

    return '<div class="foam-label-page">' +
      // Header row
      '<div class="foam-label-header">' +
        '<div class="foam-label-header-left">กรุณาส่ง</div>' +
        '<div class="foam-label-header-right">' + name + '</div>' +
      '</div>' +

      // Address section
      '<div class="foam-label-address">' +
        addrLines.map(function (line) {
          return '<div class="foam-label-addr-line" style="font-size:' + addrFontSize + ';">' + line + '</div>';
        }).join('') +
        (shipping ? '<div class="foam-label-shipping">🚚 ' + shipping + '</div>' : '') +
      '</div>' +

      // Footer row
      '<div class="foam-label-footer">' +
        '<div class="foam-label-footer-left">โทร</div>' +
        '<div class="foam-label-footer-right">' + phone + '</div>' +
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

    // Build print window content
    var pagesHtml = labels.map(function (data) {
      return buildLabelHtml(data);
    }).join('');

    var fullHtml = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>พิมพ์ป้ายลังโฟม</title>' +
      '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Sarabun", "TH Sarabun New", "Tahoma", sans-serif; }' +

        '@page { size: A4 landscape; margin: 8mm; }' +

        '.foam-label-page {' +
          'width: 100%; height: 100vh;' +
          'display: flex; flex-direction: column;' +
          'justify-content: space-between;' +
          'page-break-after: always;' +
          'padding: 10mm;' +
        '}' +

        '.foam-label-page:last-child { page-break-after: auto; }' +

        '.foam-label-header {' +
          'display: flex; justify-content: space-between; align-items: center;' +
          'border-bottom: 3px solid #000; padding-bottom: 8px;' +
        '}' +

        '.foam-label-header-left {' +
          'font-size: 42px; font-weight: bold; color: #333;' +
        '}' +

        '.foam-label-header-right {' +
          'font-size: 60px; font-weight: bold; color: #000;' +
          'text-align: right;' +
          'word-break: break-word;' +
        '}' +

        '.foam-label-address {' +
          'flex: 1; display: flex; flex-direction: column;' +
          'justify-content: center; padding: 10px 0;' +
        '}' +

        '.foam-label-addr-line {' +
          'font-size: 34px; line-height: 1.6; color: #000;' +
          'word-break: break-word;' +
        '}' +

        '.foam-label-shipping {' +
          'font-size: 28px; color: #0d6efd; font-weight: bold;' +
          'margin-top: 12px; padding: 8px 16px;' +
          'border: 2px dashed #0d6efd; display: inline-block;' +
          'border-radius: 8px;' +
        '}' +

        '.foam-label-footer {' +
          'display: flex; justify-content: space-between; align-items: center;' +
          'border-top: 3px solid #000; padding-top: 8px;' +
        '}' +

        '.foam-label-footer-left {' +
          'font-size: 42px; font-weight: bold; color: #333;' +
        '}' +

        '.foam-label-footer-right {' +
          'font-size: 52px; font-weight: bold; color: #000;' +
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
