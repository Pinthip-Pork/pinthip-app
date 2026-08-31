/**
 * Pork Analytics - Main
 */
(function () {
  // Resolved lazily: script order means porkCore may not exist at parse time.
  function core() {
    return (window.PinThipSafe && window.PinThipSafe.porkCore) || null;
  }

  function esc(v) {
    return (window.PinThipSafe && window.PinThipSafe.escapeHtml)
      ? window.PinThipSafe.escapeHtml(v)
      : String(v == null ? '' : v);
  }

  // showAdminDashboard() leaves #listBox/#status populated; hide them so this
  // view is not rendered underneath the check-in list.
  function claimAdminView() {
    const listBox = document.getElementById('listBox');
    if (listBox) listBox.style.display = 'none';
    const status = document.getElementById('status');
    if (status) status.innerText = '';
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.innerText = '';
  }

  function fatal(mc, msg) {
    mc.innerHTML = '<div class="admin-content"><div style="padding:20px; color:#b91c1c; background:#fee2e2; border:1px solid #fecaca; border-radius:10px;">⚠️ '
      + esc(msg) + '</div>'
      + '<button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดชบอร์ด</button></div>';
  }

  function normalizeRows(snapshotValue) {
    const obj = snapshotValue || {};
    return Object.keys(obj).map(function (key) {
      const row = obj[key] || {};
      return {
        id: key,
        date: String(row.date || ''),
        price: Number(row.price || 0),
        quantity: Number(row.quantity || 0),
        source: row.source || '-'
      };
    }).filter(function (row) {
      return row.date && isFinite(row.price) && row.price > 0;
    }).sort(function (a, b) {
      return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0);
    });
  }

  function showPorkPriceAnalytics() {
    const mc = document.getElementById('mainContent');
    if (!mc) return;
    claimAdminView();

    if (!core()) {
      fatal(mc, 'โมดูลคำนวณ (pork-price-core.js) ยังไม่ถูกโหลด กรุณารีเฟรชหน้าเว็บ');
      return;
    }
    if (!window.db) {
      fatal(mc, 'ยังเชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    mc.innerHTML = '<div class="admin-content" style="text-align:center; padding:40px; color:#64748b;">⏳ กำลังโหลดข้อมูลราคาหมู...</div>';

    window.db.ref('pork_price_data').orderByChild('date').once('value')
      .then(function (snapshot) {
        renderDashboard(normalizeRows(snapshot.val()));
      })
      .catch(function (error) {
        // Report the actual cause: a permission error and a network error need
        // completely different fixes, so do not collapse them into one message.
        console.error('[PorkPrice] load failed:', error);
        const raw = String((error && error.code) || (error && error.message) || '').toUpperCase();
        const denied = raw.indexOf('PERMISSION_DENIED') !== -1;
        const hint = denied
          ? 'ไม่มีสิทธิ์อ่านข้อมูล: ต้องเข้าสู่ระบบเป็นผู้ดูแล และต้อง deploy firebase.rules.json แล้ว'
          : 'กรุณาตรวจสอบอินเทอร์เน็ต แล้วกดลองใหม่';

        const ui = window.PinThipSafe && window.PinThipSafe.ui;
        if (ui && ui.showAsyncError) {
          mc.innerHTML = '<div class="admin-content"><div id="porkErrorBox"></div>'
            + '<button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดชบอร์ด</button></div>';
          ui.showAsyncError('porkErrorBox', {
            message: 'ไม่สามารถโหลดข้อมูลราคาหมูได้',
            detail: hint,
            retryFn: showPorkPriceAnalytics
          });
        } else {
          fatal(mc, hint);
        }
      });
  }

  function renderDashboard(data) {
    const c = core();
    const st = c.calculateStatistics(data);
    const p7 = c.predictFuturePrices(data, 7);

    // Empty state: with zero rows an admin previously saw "0.00" cards and a blank
    // canvas, with no hint about what to do next.
    if (!data.length) {
      document.getElementById('mainContent').innerHTML = `
        <div class="admin-content">
          <h2>📊 วิเคราะห์ราคาหมูเป็น</h2>
          <div style="background:#eff6ff; border-left:4px solid #0ea5e9; padding:16px; border-radius:4px; margin-bottom:16px;">
            ยังไม่มีข้อมูลราคา เริ่มด้วยการกด <strong>➕ เพิ่มข้อมูล</strong> หรือ <strong>📦 นำเข้าจำนวนมาก</strong><br>
            <span style="color:#64748b;">ต้องมีข้อมูลอย่างน้อย 2 วัน ระบบจึงจะคาดการณ์ราคาได้</span>
          </div>
          ${renderActions()}
          <button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดชบอร์ด</button>
        </div>`;
      return;
    }

    document.getElementById('mainContent').innerHTML = `
      <div class="admin-content">
        <h2>📊 วิเคราะห์ราคาหมูเป็น</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
          <div style="background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="font-size: 14px; color: #64748b;">ราคาเฉลี่ย</div>
            <div style="font-size: 24px; font-weight: bold; color: #0ea5e9;">${st.avg.toFixed(2)} บาท/กก.</div>
          </div>
          <div style="background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="font-size: 14px; color: #64748b;">ราคาสูงสุด</div>
            <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${st.max.toFixed(2)} บาท/กก.</div>
          </div>
          <div style="background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="font-size: 14px; color: #64748b;">ราคาต่ำสุด</div>
            <div style="font-size: 24px; font-weight: bold; color: #16a34a;">${st.min.toFixed(2)} บาท/กก.</div>
          </div>
          <div style="background: #fff; padding: 16px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="font-size: 14px; color: #64748b;">แนวโน้ม (${data.length} รายการ)</div>
            <div style="font-size: 20px; font-weight: bold; color: ${st.trend === 'เพิ่มขึ้น' ? '#dc2626' : '#16a34a'};">${esc(st.trend)} (${esc(st.trendPercent)}%)</div>
          </div>
        </div>
        <div style="background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <h3>กราฟราคา</h3>
          <div id="porkChartWrap"><canvas id="porkChart" style="max-height: 400px;"></canvas></div>
        </div>
        <div style="background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <h3>คาดการณ์ 7 วัน</h3>
          ${renderTable(p7)}
        </div>
        ${renderActions()}
        <button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดชบอร์ด</button>
      </div>
    `;

    initChart(data, p7);
  }

  function renderActions() {
    return `
      <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
        <button onclick="showAddPriceForm()" style="padding: 12px 24px; background: #16a34a; color: white; border: none; border-radius: 8px; cursor: pointer;">➕ เพิ่มข้อมูล</button>
        <button onclick="showBulkImportForm()" style="padding: 12px 24px; background: #f59e0b; color: white; border: none; border-radius: 8px; cursor: pointer;">📦 นำเข้าจำนวนมาก</button>
        <button onclick="showDataHistory()" style="padding: 12px 24px; background: #64748b; color: white; border: none; border-radius: 8px; cursor: pointer;">📋 ดูประวัติ</button>
      </div>`;
  }

  function renderTable(pred) {
    if (!pred.length) {
      return '<div style="padding: 20px; text-align: center; color: #64748b;">ต้องมีข้อมูลอย่างน้อย 2 วัน จึงจะคาดการณ์ได้</div>';
    }
    const c = core();
    let h = '<table style="width: 100%; border-collapse: collapse;"><tr style="background: #f1f5f9;"><th style="padding: 12px; text-align:left;">วันที่</th><th style="padding: 12px; text-align:left;">ราคา</th></tr>';
    pred.forEach(function (p) {
      h += `<tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 12px;">${esc(c.formatThaiDate(p.date))}</td><td style="padding: 12px; font-weight: bold; color: #0ea5e9;">${p.price.toFixed(2)} บาท/กก.</td></tr>`;
    });
    return h + '</table>';
  }

  function initChart(data, pred) {
    const ctx = document.getElementById('porkChart');
    if (!ctx) return;
    // Chart.js is a CDN dependency. If it is blocked (CSP) or unavailable
    // (offline), say so instead of leaving an empty box that looks broken.
    if (!window.Chart) {
      const wrap = document.getElementById('porkChartWrap');
      if (wrap) {
        wrap.innerHTML = '<div style="padding:20px; text-align:center; color:#92400e; background:#fffbeb; border:1px solid #fde68a; border-radius:8px;">'
          + 'ไม่สามารถโหลดไลบรารีกราฟ (Chart.js) ได้ — ตารางคาดการณ์ด้านล่างยังใช้งานได้ปกติ</div>';
      }
      return;
    }

    const c = core();
    const labels = data.map(function (d) { return c.formatThaiDate(d.date); });
    const prices = data.map(function (d) { return d.price; });
    const pLabels = pred.map(function (d) { return c.formatThaiDate(d.date); });
    const pPrices = pred.map(function (d) { return d.price; });

    new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.concat(pLabels),
        datasets: [
          { label: 'ราคาจริง', data: prices.concat(new Array(pred.length).fill(null)), borderColor: '#0ea5e9', borderWidth: 2 },
          { label: 'คาดการณ์', data: new Array(prices.length).fill(null).concat(pPrices), borderColor: '#f59e0b', borderWidth: 2, borderDash: [5, 5] }
        ]
      },
      options: { responsive: true, plugins: { legend: { display: true } }, scales: { y: { beginAtZero: false } } }
    });
  }

  window.showPorkPriceAnalytics = showPorkPriceAnalytics;
  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.porkAnalytics = {
    normalizeRows: normalizeRows,
    showPorkPriceAnalytics: showPorkPriceAnalytics
  };
})();
