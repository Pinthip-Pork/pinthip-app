// Bulk Price Import Helper
(function () {
  function showBulkImportForm() {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
      <div class="admin-content">
        <h2>📦 นำเข้าข้อมูลจำนวนมาก</h2>

        <!-- Auto Scrape Section -->
        <div style="background:#eff6ff; border-left:4px solid #0ea5e9; padding:16px; border-radius:4px; margin:16px 0;">
          <h3 style="margin-top:0;">🤖 ดึงข้อมูลอัตโนมัติ</h3>
          <p style="color:#475569;">ดึงข้อมูลราคาหมูล่าสุดจาก swinethailand.com ผ่าน Cloud Function</p>
          <p style="color:#16a34a; font-size:13px; margin:8px 0;">✅ ไม่มีปัญหา CORS - ใช้ Server-side scraping</p>
          
          <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-top:12px;">
            <label>จำนวนสัปดาห์:</label>
            <select id="scrapeCount" style="padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
              <option value="4">4 สัปดาห์</option>
              <option value="8" selected>8 สัปดาห์</option>
              <option value="12">12 สัปดาห์</option>
            </select>
            <button onclick="startAutoScrape()" id="scrapeBtn"
              style="padding:8px 24px; background:#0ea5e9; color:white; border:none; border-radius:4px; cursor:pointer;">
              🔄 เริ่มดึงข้อมูล
            </button>
          </div>
          
          <div id="scrapeProgress" style="display:none; margin-top:12px;">
            <div style="background:#f8fafc; padding:12px; border-radius:4px;">
              <div id="scrapeStatus" style="color:#64748b; margin-bottom:8px;"></div>
              <div style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
                <div id="scrapeProgressBar" style="background:#0ea5e9; height:100%; width:0%; transition:width 0.3s;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Manual Input -->
        <div style="background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <h3>✍️ หรือกรอกเอง</h3>
          <p>รูปแบบ: วันที่, ราคา, จำนวน, แหล่งที่มา</p>
          <textarea id="bulkData" rows="10" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-family: monospace;" 
            placeholder="2026-08-28, 85.50, 1500, swinethailand.com"></textarea>
          <div style="margin-top: 12px;">
            <button onclick="previewBulk()" style="padding: 8px 16px; background: #64748b; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px;">ตัวอย่าง</button>
            <button onclick="processBulk()" style="padding: 8px 16px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer;">นำเข้า</button>
          </div>
          <div id="preview" style="display: none; margin-top: 12px;"></div>
          <div id="status" style="margin-top: 12px;"></div>
        </div>
        <button class="btn-back" onclick="showPorkPriceAnalytics()">⬅️ กลับ</button>
      </div>
    `;
  }


  function parseDate(s) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
    return null;
  }

  function previewBulk() {
    const box = document.getElementById('bulkData');
    if (!box) return;
    const txt = box.value.trim();
    if (!txt) { alert('กรุณากรอกข้อมูล'); return; }

    const lines = txt.split('\n').filter(function (l) { return l.trim(); });
    const data = [];
    const err = [];

    lines.forEach(function (l, i) {
      const p = l.split(',').map(function (x) { return x.trim(); });
      if (p.length < 2) { err.push('บรรทัด ' + (i + 1) + ': ข้อมูลไม่ครบ (ต้องมีวันที่และราคา)'); return; }

      const d = parseDate(p[0]);
      const pr = parseFloat(p[1]);
      if (!d) { err.push('บรรทัด ' + (i + 1) + ': รูปแบบวันที่ไม่ถูกต้อง'); return; }
      // Match the database rules so a valid preview cannot fail on write.
      if (!isFinite(pr) || pr <= 0 || pr >= 10000) { err.push('บรรทัด ' + (i + 1) + ': ราคาต้องอยู่ระหว่าง 0 - 10000'); return; }

      const qty = parseInt(p[2], 10);
      data.push({
        date: d,
        price: pr,
        quantity: isFinite(qty) && qty > 0 ? qty : 0,
        source: (p[3] || 'นำเข้า').slice(0, 120)
      });
    });

    const pv = document.getElementById('preview');
    if (err.length) {
      pv.innerHTML = '<div style="color: #dc2626;">' + err.join('<br>') + '</div>';
      window._bulk = null;
    } else {
      pv.innerHTML = '<div style="color: #16a34a;">พร้อมนำเข้า ' + data.length + ' รายการ</div>';
      window._bulk = data;
    }
    pv.style.display = 'block';
  }

  function processBulk() {
    if (!window._bulk || !window._bulk.length) { alert('กรุณาคลิก "ตัวอย่าง" ก่อน'); return; }
    const st = document.getElementById('status');
    const count = window._bulk.length;
    st.innerHTML = '<div style="color: #0ea5e9; padding: 12px;">⏳ กำลังนำเข้า ' + count + ' รายการ...</div>';

    Promise.all(window._bulk.map(function (d) {
      return window.db.ref('pork_price_data').push({
        date: d.date,
        price: d.price,
        quantity: d.quantity,
        source: d.source,
        addedAt: new Date().toISOString()
      });
    }))
      .then(function () {
        st.innerHTML = '<div style="color: #16a34a; padding: 12px;">✅ นำเข้าสำเร็จ ' + count + ' รายการ '
          + '<button onclick="showPorkPriceAnalytics()" style="margin-left: 8px; padding: 4px 12px; cursor:pointer;">ดูผล</button></div>';
        window._bulk = null;
      })
      .catch(function (error) {
        console.error('[PorkPrice] bulk import failed:', error);
        const denied = String((error && error.code) || (error && error.message) || '')
          .toUpperCase().indexOf('PERMISSION_DENIED') !== -1;
        st.innerHTML = '<div style="color: #dc2626; padding: 12px;">❌ '
          + (denied ? 'นำเข้าไม่สำเร็จ: ต้องเป็นผู้ดูแลระบบ (admin)' : 'นำเข้าไม่สำเร็จ กรุณาลองใหม่')
          + '</div>';
      });
  }

  async function startAutoScrape() {
    const countSelect = document.getElementById('scrapeCount');
    const scrapeBtn = document.getElementById('scrapeBtn');
    const progressDiv = document.getElementById('scrapeProgress');
    const statusDiv = document.getElementById('scrapeStatus');
    const progressBar = document.getElementById('scrapeProgressBar');
    const bulkDataTextarea = document.getElementById('bulkData');
    
    if (!countSelect || !scrapeBtn || !progressDiv) return;
    
    const count = parseInt(countSelect.value, 10);
    
    scrapeBtn.disabled = true;
    scrapeBtn.textContent = '⏳ กำลังดึง...';
    progressDiv.style.display = 'block';
    
    try {
      statusDiv.textContent = 'กำลังเชื่อมต่อ Cloud Function...';
      statusDiv.style.color = '#64748b';
      progressBar.style.width = '10%';
      progressBar.style.background = '#0ea5e9';
      
      // Call Firebase Cloud Function instead of direct scraping
      const functions = window.firebaseFunctions;
      if (!functions) {
        throw new Error('Firebase Functions not initialized');
      }
      
      const scrapePorkPrices = window.firebase.functions().httpsCallable('scrapePorkPrices');
      
      statusDiv.textContent = 'กำลังดึงข้อมูล ' + count + ' สัปดาห์...';
      progressBar.style.width = '30%';
      
      const result = await scrapePorkPrices({ count: count });
      
      if (!result.data || !result.data.success) {
        throw new Error('Failed to scrape data');
      }
      
      const priceData = result.data.data;
      
      if (!priceData || priceData.length === 0) {
        throw new Error('ไม่พบข้อมูลราคา');
      }
      
      progressBar.style.width = '80%';
      statusDiv.textContent = 'กำลังแปลงข้อมูล...';
      
      // Convert to CSV format
      const csvLines = priceData.map(function (item) {
        const date = item.date || '';
        const price = item.nationalAverage ? item.nationalAverage.toFixed(2) : '0';
        const piglet = item.pigletPrice || '0';
        const source = item.source || 'swinethailand.com';
        return date + ', ' + price + ', ' + piglet + ', ' + source;
      });
      
      const csv = csvLines.join('\n');
      bulkDataTextarea.value = csv;
      
      progressBar.style.width = '100%';
      statusDiv.textContent = '✅ ดึงข้อมูลสำเร็จ ' + priceData.length + ' รายการ - กด "ตัวอย่าง" เพื่อตรวจสอบ';
      statusDiv.style.color = '#16a34a';
      progressBar.style.background = '#16a34a';
      
    } catch (error) {
      console.error('[AutoScrape] Failed:', error);
      let errorMsg = error.message || 'กรุณาลองอีกครั้ง';
      
      // Show friendly error messages
      if (errorMsg.includes('not-found')) {
        errorMsg = 'ไม่พบข้อมูลราคาในเว็บไซต์';
      } else if (errorMsg.includes('invalid-argument')) {
        errorMsg = 'จำนวนสัปดาห์ไม่ถูกต้อง';
      } else if (errorMsg.includes('Functions not initialized')) {
        errorMsg = 'ยังไม่ได้เชื่อมต่อ Firebase - กรุณารอสักครู่แล้วลองใหม่';
      }
      
      statusDiv.textContent = '❌ เกิดข้อผิดพลาด: ' + errorMsg;
      statusDiv.style.color = '#dc2626';
      progressBar.style.background = '#dc2626';
    } finally {
      scrapeBtn.disabled = false;
      scrapeBtn.textContent = '🔄 เริ่มดึงข้อมูล';
    }
  }

  // Remove old scrapeLatestFromWeb function - no longer needed
  // All scraping is now done server-side via Cloud Function

  window.startAutoScrape = startAutoScrape;
  window.showBulkImportForm = showBulkImportForm;

  window.previewBulk = previewBulk;
  window.processBulk = processBulk;
  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.porkBulk = { parseDate: parseDate };
})();
