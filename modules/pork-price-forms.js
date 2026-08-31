/**
 * Pork Analytics - Forms
 */
(function () {
  function core() {
    return (window.PinThipSafe && window.PinThipSafe.porkCore) || null;
  }

  function esc(v) {
    return (window.PinThipSafe && window.PinThipSafe.escapeHtml)
      ? window.PinThipSafe.escapeHtml(v)
      : String(v == null ? '' : v);
  }

  function showAddPriceForm() {
    document.getElementById('mainContent').innerHTML = `
      <div class="admin-content">
        <h2>➕ เพิ่มข้อมูลราคาหมู</h2>
        <form id="priceForm" style="max-width: 500px; background: #fff; padding: 24px; border-radius: 8px;">
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px;">วันที่:</label>
            <input type="date" id="priceDate" value="${new Date().toISOString().split('T')[0]}" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px;">ราคา (บาท/กก.):</label>
            <input type="number" id="priceValue" step="0.01" min="0" required style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px;">จำนวนหมู (ตัว):</label>
            <input type="number" id="quantityValue" min="0" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
          </div>
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px;">แหล่งที่มา:</label>
            <select id="sourceValue" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
              <option>สมาคมผู้เลี้ยงสุกรแห่งชาติ</option>
              <option>กรมปศุสัตว์</option>
              <option>ข้อมูลภายใน</option>
            </select>
          </div>
          <button type="submit" style="width: 100%; padding: 12px; background: #16a34a; color: white; border: none; border-radius: 8px; cursor: pointer;">บันทึก</button>
        </form>
        <button class="btn-back" onclick="showPorkPriceAnalytics()" style="margin-top:15px;">⬅️ กลับ</button>
      </div>
    `;
    
    document.getElementById('priceForm').addEventListener('submit', function (e) {
      e.preventDefault();

      const date = document.getElementById('priceDate').value;
      const price = parseFloat(document.getElementById('priceValue').value);
      const quantity = parseInt(document.getElementById('quantityValue').value, 10) || 0;
      const source = document.getElementById('sourceValue').value;

      // Validate before writing: the database rules reject malformed rows, and a
      // bare "เกิดข้อผิดพลาด" alert gave the user nothing to act on.
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        alert('กรุณาเลือกวันที่ให้ถูกต้อง');
        return;
      }
      if (!isFinite(price) || price <= 0 || price >= 10000) {
        alert('กรุณากรอกราคาเป็นตัวเลขระหว่าง 0 - 10000 บาท/กก.');
        return;
      }

      const btn = document.querySelector('#priceForm button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }

      window.db.ref('pork_price_data').push({
        date: date,
        price: price,
        quantity: quantity,
        source: source,
        addedAt: new Date().toISOString()
      })
        .then(function () {
          alert('บันทึกสำเร็จ');
          showPorkPriceAnalytics();
        })
        .catch(function (error) {
          console.error('[PorkPrice] save failed:', error);
          if (btn) { btn.disabled = false; btn.textContent = 'บันทึก'; }
          const denied = String((error && error.code) || (error && error.message) || '')
            .toUpperCase().indexOf('PERMISSION_DENIED') !== -1;
          alert(denied
            ? 'บันทึกไม่สำเร็จ: ต้องเข้าสู่ระบบเป็นผู้ดูแลระบบ (admin) เท่านั้น'
            : 'บันทึกไม่สำเร็จ: ' + ((error && error.message) || 'กรุณาลองอีกครั้ง'));
        });
    });
  }

  function showDataHistory() {
    const mc = document.getElementById('mainContent');
    if (!mc) return;
    mc.innerHTML = '<div class="admin-content" style="text-align:center; padding:40px; color:#64748b;">⏳ กำลังโหลด...</div>';

    window.db.ref('pork_price_data').orderByChild('date').once('value')
      .then(function (snapshot) {
        const obj = snapshot.val() || {};
        const arr = Object.keys(obj).map(function (k) {
          const row = obj[k] || {};
          return {
            id: k,
            date: String(row.date || ''),
            price: Number(row.price || 0),
            quantity: Number(row.quantity || 0),
            source: row.source || '-'
          };
        }).sort(function (a, b) {
          return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0);
        });

        const c = core();
        let h = '<div class="admin-content"><h2>📋 ประวัติข้อมูล</h2>'
          + '<div style="background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 16px; overflow-x:auto;">'
          + '<div style="color:#64748b; margin-bottom:8px;">ทั้งหมด ' + arr.length + ' รายการ</div>'
          + '<table style="width: 100%; border-collapse: collapse;"><tr style="background: #f1f5f9;">'
          + '<th style="padding: 12px; text-align:left;">วันที่</th><th style="padding: 12px; text-align:left;">ราคา</th>'
          + '<th style="padding: 12px; text-align:left;">จำนวน</th><th style="padding: 12px; text-align:left;">แหล่งที่มา</th>'
          + '<th style="padding: 12px; text-align:left;">จัดการ</th></tr>';

        if (!arr.length) {
          h += '<tr><td colspan="5" style="padding:20px; text-align:center; color:#64748b;">ยังไม่มีข้อมูล</td></tr>';
        }

        arr.forEach(function (item) {
          // Escape every stored value: source is free text supplied at import time.
          h += '<tr style="border-bottom: 1px solid #e2e8f0;">'
            + '<td style="padding: 12px;">' + esc(c ? c.formatThaiDate(item.date) : item.date) + '</td>'
            + '<td style="padding: 12px;">' + item.price.toFixed(2) + '</td>'
            + '<td style="padding: 12px;">' + (item.quantity || '-') + '</td>'
            + '<td style="padding: 12px;">' + esc(item.source) + '</td>'
            + '<td style="padding: 12px;"><button onclick="deletePriceData(\'' + esc(item.id) + '\')" '
            + 'style="padding: 4px 12px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor:pointer;">ลบ</button></td>'
            + '</tr>';
        });

        h += '</table></div><button class="btn-back" onclick="showPorkPriceAnalytics()">⬅️ กลับหน้าวิเคราะห์</button></div>';
        mc.innerHTML = h;
      })
      .catch(function (error) {
        console.error('[PorkPrice] history load failed:', error);
        const denied = String((error && error.code) || (error && error.message) || '')
          .toUpperCase().indexOf('PERMISSION_DENIED') !== -1;
        mc.innerHTML = '<div class="admin-content"><div style="padding:20px; color:#b91c1c; background:#fee2e2; border:1px solid #fecaca; border-radius:10px;">⚠️ '
          + esc(denied ? 'ไม่มีสิทธิ์อ่านข้อมูล (ต้องเป็นผู้ดูแลระบบ และ deploy firebase.rules.json แล้ว)' : 'โหลดประวัติไม่สำเร็จ กรุณาลองใหม่')
          + '</div><button class="btn-back" onclick="showPorkPriceAnalytics()" style="margin-top:15px;">⬅️ กลับ</button></div>';
      });
  }

  function deletePriceData(id) {
    if (!confirm('ต้องการลบข้อมูลนี้?')) return;
    window.db.ref('pork_price_data/' + id).remove()
      .then(function () { showDataHistory(); })
      .catch(function (error) {
        console.error('[PorkPrice] delete failed:', error);
        const denied = String((error && error.code) || (error && error.message) || '')
          .toUpperCase().indexOf('PERMISSION_DENIED') !== -1;
        alert(denied ? 'ลบไม่สำเร็จ: ต้องเป็นผู้ดูแลระบบ (admin)' : 'ลบไม่สำเร็จ กรุณาลองใหม่');
      });
  }

  window.showAddPriceForm = showAddPriceForm;
  window.showDataHistory = showDataHistory;
  window.deletePriceData = deletePriceData;
})();
