// Bulk Price Import Helper
(function () {
  function showBulkImportForm() {
    const mc = document.getElementById('mainContent');
    mc.innerHTML = `
      <div class="admin-content">
        <h2>📦 นำเข้าข้อมูลจำนวนมาก</h2>

        <!-- CSV File Upload Section -->
        <div style="background:#f0fdf4; border-left:4px solid #16a34a; padding:16px; border-radius:4px; margin:16px 0;">
          <h3 style="margin-top:0;">📂 อัปโหลดไฟล์ CSV</h3>
          <p style="color:#475569;">นำเข้าข้อมูลราคาหมูจากไฟล์ CSV ที่ดาวน์โหลดจาก swinethailand.com</p>
          <p style="color:#16a34a; font-size:13px; margin:8px 0;">✅ รองรับไฟล์ที่มีหลายภาคในคอลัมน์แยก พร้อมคำนวณค่าเฉลี่ยอัตโนมัติ</p>
          
          <div style="margin-top:12px;">
            <input type="file" id="csvFileInput" accept=".csv" 
              style="padding:8px; border:1px solid #cbd5e1; border-radius:4px; margin-bottom:8px;">
            <button onclick="uploadCSVFile()" id="uploadBtn"
              style="padding:8px 24px; background:#16a34a; color:white; border:none; border-radius:4px; cursor:pointer; margin-left:8px;">
              📤 อัปโหลดและประมวลผล
            </button>
          </div>
          
          <div id="csvProgress" style="display:none; margin-top:12px;">
            <div style="background:#f8fafc; padding:12px; border-radius:4px;">
              <div id="csvStatus" style="color:#64748b; margin-bottom:8px;"></div>
              <div style="background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
                <div id="csvProgressBar" style="background:#16a34a; height:100%; width:0%; transition:width 0.3s;"></div>
              </div>
            </div>
          </div>
        </div>

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
              <option value="26">26 สัปดาห์ (6 เดือน)</option>
              <option value="52">52 สัปดาห์ (1 ปี)</option>
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
          <!-- Not "status": index.html already owns a #status element, and
               getElementById would return that one instead of this. -->
          <div id="bulkStatus" style="margin-top: 12px;"></div>
        </div>
        <button class="btn-back" onclick="showPorkPriceAnalytics()">⬅️ กลับ</button>
      </div>
    `;
  }


  // Records who imported a row so entries can be traced later. The rules allow
  // an optional string 'addedBy'; fall back to 'unknown' rather than omitting it.
  function currentUid() {
    try {
      const user = window.firebase && window.firebase.auth
        ? window.firebase.auth().currentUser
        : null;
      return (user && user.uid) || 'unknown';
    } catch {
      return 'unknown';
    }
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
    const st = document.getElementById('bulkStatus');
    if (!st) return;
    const count = window._bulk.length;
    st.innerHTML = '<div style="color: #0ea5e9; padding: 12px;">⏳ กำลังนำเข้า ' + count + ' รายการ...</div>';

    const addedBy = currentUid();
    Promise.all(window._bulk.map(function (d) {
      return window.db.ref('pork_price_data').push({
        date: d.date,
        price: d.price,
        quantity: d.quantity,
        source: d.source,
        addedAt: new Date().toISOString(),
        addedBy: addedBy
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
      
      // Call Firebase Cloud Function instead of direct scraping.
      // Use the region-bound client: scrapePorkPrices is deployed to
      // asia-southeast1, so firebase.functions() (us-central1) would 404.
      const functions = window.firebaseFunctions;
      if (!functions) {
        throw new Error('Firebase Functions not initialized');
      }

      const scrapePorkPrices = functions.httpsCallable('scrapePorkPrices');
      
      statusDiv.textContent = 'กำลังดึงข้อมูล ' + count + ' สัปดาห์...';
      progressBar.style.width = '30%';
      
      const result = await scrapePorkPrices({ count: count });
      
      if (!result.data || !result.data.success) {
        throw new Error('Failed to scrape data');
      }
      
      const priceData = result.data.data;
      
      if (!priceData || priceData.length === 0) {
        // Check if message indicates all data already exists
        if (result.data.message && result.data.message.includes('ไม่มีข้อมูลใหม่')) {
          statusDiv.textContent = '✅ ' + result.data.message;
          statusDiv.style.color = '#16a34a';
          progressBar.style.width = '100%';
          progressBar.style.background = '#16a34a';
          return;
        }
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

      // The callable now rejects non-admins; report that instead of a raw code.
      const code = String((error && error.code) || '');
      if (code.indexOf('permission-denied') !== -1) {
        errorMsg = 'ต้องเป็นผู้ดูแลระบบ (admin) จึงจะดึงข้อมูลได้';
      } else if (code.indexOf('unauthenticated') !== -1) {
        errorMsg = 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่';
      }
      
      statusDiv.textContent = '❌ เกิดข้อผิดพลาด: ' + errorMsg;
      statusDiv.style.color = '#dc2626';
      progressBar.style.background = '#dc2626';
    } finally {
      scrapeBtn.disabled = false;
      scrapeBtn.textContent = '🔄 เริ่มดึงข้อมูล';
    }
  }

  // CSV File Upload Handler
  async function uploadCSVFile() {
    const fileInput = document.getElementById('csvFileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const progressDiv = document.getElementById('csvProgress');
    const statusDiv = document.getElementById('csvStatus');
    const progressBar = document.getElementById('csvProgressBar');
    
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
      alert('กรุณาเลือกไฟล์ CSV ก่อน');
      return;
    }
    
    const file = fileInput.files[0];
    
    if (!file.name.endsWith('.csv')) {
      alert('กรุณาเลือกไฟล์ CSV เท่านั้น');
      return;
    }
    
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ กำลังประมวลผล...';
    progressDiv.style.display = 'block';
    
    try {
      statusDiv.textContent = 'กำลังอ่านไฟล์...';
      statusDiv.style.color = '#64748b';
      progressBar.style.width = '10%';
      progressBar.style.background = '#16a34a';
      
      const text = await file.text();
      const lines = text.split('\n');
      
      statusDiv.textContent = 'กำลังแปลงข้อมูล...';
      progressBar.style.width = '30%';
      
      const data = parseCSVData(lines);
      
      if (!data || data.length === 0) {
        throw new Error('ไม่พบข้อมูลในไฟล์ CSV');
      }
      
      statusDiv.textContent = `พบข้อมูล ${data.length} รายการ - กำลังนำเข้า...`;
      progressBar.style.width = '50%';
      
      // Import to Firebase
      const addedBy = currentUid();
      let imported = 0;
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        await window.db.ref('pork_price_data').push({
          date: item.date,
          price: item.price,
          quantity: item.quantity || 0,
          source: item.source || 'CSV Import',
          addedAt: new Date().toISOString(),
          addedBy: addedBy
        });
        
        imported++;
        const percent = 50 + Math.floor((imported / data.length) * 50);
        progressBar.style.width = percent + '%';
        statusDiv.textContent = `กำลังนำเข้า... ${imported}/${data.length}`;
        
        // Add small delay to avoid overwhelming Firebase
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      progressBar.style.width = '100%';
      statusDiv.textContent = `✅ นำเข้าสำเร็จ ${imported} รายการ`;
      statusDiv.style.color = '#16a34a';
      
      setTimeout(() => {
        showPorkPriceAnalytics();
      }, 2000);
      
    } catch (error) {
      console.error('[CSV Upload] Failed:', error);
      statusDiv.textContent = '❌ เกิดข้อผิดพลาด: ' + error.message;
      statusDiv.style.color = '#dc2626';
      progressBar.style.background = '#dc2626';
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = '📤 อัปโหลดและประมวลผล';
    }
  }

  // Remove old scrapeLatestFromWeb function - no longer needed
  // Parse CSV data with multi-region support
  function parseCSVData(lines) {
    const results = [];
    let headers = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV line (handle quoted values)
      const values = parseCSVLine(line);
      
      if (i === 0) {
        headers = values.map(v => v.toLowerCase());
        continue;
      }
      
      // Find column indices
      const yearIdx = headers.indexOf('yearbe');
      const monthIdx = headers.indexOf('month');
      const dayIdx = headers.indexOf('day');
      
      if (yearIdx === -1 || monthIdx === -1 || dayIdx === -1) continue;
      
      const yearBE = parseInt(values[yearIdx]);
      const month = parseInt(values[monthIdx]);
      const day = parseInt(values[dayIdx]);
      
      if (!yearBE || !month || !day) continue;
      
      // Convert Buddhist year to Christian year
      const year = yearBE - 543;
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Calculate average price from regions
      const regions = ['ภาคตะวันตก', 'ภาคตะวันออก', 'ภาคอีสาน', 'ภาคเหนือ', 'ภาคใต้', 'ภาคกลาง'];
      const prices = [];
      
      regions.forEach(region => {
        const idx = headers.indexOf(region);
        if (idx !== -1 && values[idx]) {
          const priceStr = values[idx].trim();
          if (priceStr && priceStr !== '' && !priceStr.includes('ราคายืน') && !priceStr.includes('รอยืนยัน')) {
            // Handle range like "76-78" or single value
            const rangeParts = priceStr.split('-');
            if (rangeParts.length === 2) {
              const p1 = parseFloat(rangeParts[0]);
              const p2 = parseFloat(rangeParts[1]);
              if (isFinite(p1) && isFinite(p2)) {
                prices.push((p1 + p2) / 2);
              }
            } else {
              const p = parseFloat(priceStr);
              if (isFinite(p) && p > 0) {
                prices.push(p);
              }
            }
          }
        }
      });
      
      if (prices.length > 0) {
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        results.push({
          date: date,
          price: Math.round(avgPrice * 100) / 100,
          quantity: 0,
          source: 'swinethailand.com (CSV)'
        });
      }
    }
    
    return results;
  }
  
  // Parse a single CSV line (handles quoted values)
  function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  // All scraping is now done server-side via Cloud Function

  window.uploadCSVFile = uploadCSVFile;

  window.startAutoScrape = startAutoScrape;
  window.showBulkImportForm = showBulkImportForm;

  window.previewBulk = previewBulk;
  window.processBulk = processBulk;
  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.porkBulk = { parseDate: parseDate };
})();
