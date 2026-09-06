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
    const rows = Object.keys(obj).map(function (key) {
      const row = obj[key] || {};
      return {
        id: key,
        date: String(row.date || ''),
        price: Number(row.price || 0),
        quantity: Number(row.quantity || 0),
        source: row.source || '-',
        addedAt: String(row.addedAt || '')
      };
    }).filter(function (row) {
      return row.date && isFinite(row.price) && row.price > 0;
    }).sort(function (a, b) {
      return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0);
    });

    // Collapse duplicate dates: re-importing the same range pushes new keys
    // rather than overwriting, and two rows on one day skew both the average
    // and the regression. Keep the most recently added row for each date.
    const byDate = Object.create(null);
    rows.forEach(function (row) {
      const kept = byDate[row.date];
      if (!kept || row.addedAt >= kept.addedAt) byDate[row.date] = row;
    });

    return rows.filter(function (row) { return byDate[row.date] === row; });
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
    
    // Get next week prediction only
    const nextWeek = p7.length > 0 ? p7[0] : null;
    
    // Calculate probability of price movement
    const probability = calculatePriceProbability(data, nextWeek);

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
        ${renderPredictionCard(data, nextWeek, probability)}
        ${renderActions()}
        <button class="btn-back" onclick="showAdminDashboard()" style="margin-top:15px;">⬅️ กลับหน้าแดชบอร์ด</button>
      </div>
    `;

    initChart(data, p7);
  }

  // Predictions are spaced like the history, so the heading must not hardcode
  // "7 วัน": weekly scraped data yields 7 weekly points, not 7 daily ones.
  function predictionHeading(data) {
    const c = core();
    const step = (c && c.medianStepDays) ? c.medianStepDays(data) : 1;
    if (step === 1) return 'คาดการณ์สัปดาห์หน้า';
    if (step === 7) return 'คาดการณ์สัปดาห์หน้า';
    return 'คาดการณ์ช่วงถัดไป (ทุก ' + step + ' วัน)';
  }

  // Calculate probability of price movement based on historical data
  function calculatePriceProbability(data, nextWeek) {
    if (!data || data.length < 2 || !nextWeek) {
      return { up: 33.33, down: 33.33, flat: 33.34 };
    }

    // Analyze recent trends (last 10 data points or all if less)
    const recentCount = Math.min(10, data.length - 1);
    const recentData = data.slice(-recentCount - 1);
    
    let upCount = 0;
    let downCount = 0;
    let flatCount = 0;
    
    for (let i = 1; i < recentData.length; i++) {
      const prev = recentData[i - 1].price;
      const curr = recentData[i].price;
      const diff = curr - prev;
      
      if (Math.abs(diff) < 0.5) {
        flatCount++;
      } else if (diff > 0) {
        upCount++;
      } else {
        downCount++;
      }
    }
    
    const total = upCount + downCount + flatCount;
    
    // Calculate base probability from historical patterns
    let upProb = (upCount / total) * 100;
    let downProb = (downCount / total) * 100;
    let flatProb = (flatCount / total) * 100;
    
    // Adjust based on prediction vs current price
    const lastPrice = data[data.length - 1].price;
    const predictedPrice = nextWeek.price;
    const priceDiff = predictedPrice - lastPrice;
    
    // Add weight to prediction direction
    if (priceDiff > 0.5) {
      upProb = Math.min(upProb + 15, 85);
      downProb = Math.max(downProb - 10, 5);
      flatProb = 100 - upProb - downProb;
    } else if (priceDiff < -0.5) {
      downProb = Math.min(downProb + 15, 85);
      upProb = Math.max(upProb - 10, 5);
      flatProb = 100 - upProb - downProb;
    } else {
      flatProb = Math.min(flatProb + 20, 70);
      const remaining = 100 - flatProb;
      upProb = remaining / 2;
      downProb = remaining / 2;
    }
    
    // Ensure total is 100%
    const sum = upProb + downProb + flatProb;
    upProb = (upProb / sum) * 100;
    downProb = (downProb / sum) * 100;
    flatProb = (flatProb / sum) * 100;
    
    return {
      up: Math.round(upProb * 10) / 10,
      down: Math.round(downProb * 10) / 10,
      flat: Math.round(flatProb * 10) / 10
    };
  }

  // Render prediction card with probability
  function renderPredictionCard(data, nextWeek, probability) {
    if (!nextWeek) {
      return `<div style="background: #fff; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <h3>🔮 คาดการณ์สัปดาห์หน้า</h3>
        <div style="padding: 20px; text-align: center; color: #64748b;">ต้องมีข้อมูลอย่างน้อย 2 วัน จึงจะคาดการณ์ได้</div>
      </div>`;
    }

    const c = core();
    const lastPrice = data[data.length - 1].price;
    const predictedPrice = nextWeek.price;
    const diff = predictedPrice - lastPrice;
    const diffPercent = ((diff / lastPrice) * 100).toFixed(2);
    
    let trendIcon = '';
    let trendText = '';
    let trendColor = '';
    let bgColor = '';
    
    if (diff > 0.5) {
      trendIcon = '📈';
      trendText = 'ขึ้น';
      trendColor = '#dc2626';
      bgColor = '#fee2e2';
    } else if (diff < -0.5) {
      trendIcon = '📉';
      trendText = 'ลง';
      trendColor = '#16a34a';
      bgColor = '#dcfce7';
    } else {
      trendIcon = '➡️';
      trendText = 'ยืน';
      trendColor = '#64748b';
      bgColor = '#f1f5f9';
    }

    return `
      <div style="background: ${bgColor}; padding: 20px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid ${trendColor};">
        <h3 style="margin-top: 0; color: ${trendColor};">🔮 คาดการณ์สัปดาห์หน้า</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div style="background: white; padding: 16px; border-radius: 8px;">
            <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">วันที่คาดการณ์</div>
            <div style="font-size: 20px; font-weight: bold; color: #1f2937;">${esc(c.formatThaiDate(nextWeek.date))}</div>
          </div>
          
          <div style="background: white; padding: 16px; border-radius: 8px;">
            <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">ราคาคาดการณ์</div>
            <div style="font-size: 20px; font-weight: bold; color: ${trendColor};">${predictedPrice.toFixed(2)} บาท/กก.</div>
          </div>
        </div>

        <div style="background: white; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">การเปลี่ยนแปลงจากราคาปัจจุบัน</div>
          <div style="font-size: 28px; font-weight: bold; color: ${trendColor};">
            ${trendIcon} ${trendText} ${diff > 0 ? '+' : ''}${diff.toFixed(2)} บาท (${diff > 0 ? '+' : ''}${diffPercent}%)
          </div>
        </div>

        <div style="background: white; padding: 16px; border-radius: 8px;">
          <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 12px;">📊 โอกาสที่จะเกิดขึ้น</div>
          
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">📈 โอกาสที่ราคาจะขึ้น</span>
              <span style="font-weight: bold; color: #dc2626;">${probability.up}%</span>
            </div>
            <div style="background: #f1f5f9; height: 24px; border-radius: 12px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #dc2626, #ef4444); height: 100%; width: ${probability.up}%; transition: width 0.3s;"></div>
            </div>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">📉 โอกาสที่ราคาจะลง</span>
              <span style="font-weight: bold; color: #16a34a;">${probability.down}%</span>
            </div>
            <div style="background: #f1f5f9; height: 24px; border-radius: 12px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #16a34a, #22c55e); height: 100%; width: ${probability.down}%; transition: width 0.3s;"></div>
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">➡️ โอกาสที่ราคาจะยืน</span>
              <span style="font-weight: bold; color: #64748b;">${probability.flat}%</span>
            </div>
            <div style="background: #f1f5f9; height: 24px; border-radius: 12px; overflow: hidden;">
              <div style="background: linear-gradient(90deg, #64748b, #94a3b8); height: 100%; width: ${probability.flat}%; transition: width 0.3s;"></div>
            </div>
          </div>
        </div>

        <div style="margin-top: 12px; padding: 12px; background: rgba(255,255,255,0.5); border-radius: 6px; font-size: 13px; color: #64748b;">
          💡 การคาดการณ์นี้คำนวณจาก Linear Regression และวิเคราะห์แนวโน้มย้อนหลัง 10 ช่วงเวลา
        </div>
      </div>
    `;
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
    let h = '<table style="width: 100%; border-collapse: collapse;"><tr style="background: #f1f5f9;"><th style="padding: 12px; text-align:left;">วันที่</th><th style="padding: 12px; text-align:left;">ราคาคาดการณ์</th><th style="padding: 12px; text-align:left;">แนวโน้ม</th></tr>';
    
    // Calculate trend for each prediction
    pred.forEach(function (p, index) {
      let trendIcon = '';
      let trendText = '';
      let trendColor = '#64748b';
      
      if (index > 0) {
        const prevPrice = pred[index - 1].price;
        const currentPrice = p.price;
        const diff = currentPrice - prevPrice;
        const diffPercent = ((diff / prevPrice) * 100).toFixed(2);
        
        if (diff > 0) {
          trendIcon = '📈';
          trendText = `+${diff.toFixed(2)} บาท (+${diffPercent}%)`;
          trendColor = '#dc2626';
        } else if (diff < 0) {
          trendIcon = '📉';
          trendText = `${diff.toFixed(2)} บาท (${diffPercent}%)`;
          trendColor = '#16a34a';
        } else {
          trendIcon = '➡️';
          trendText = 'ยืน (0%)';
          trendColor = '#64748b';
        }
      } else {
        trendIcon = '🔮';
        trendText = 'จุดเริ่มต้น';
        trendColor = '#0ea5e9';
      }
      
      h += `<tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px;">${esc(c.formatThaiDate(p.date))}</td>
        <td style="padding: 12px; font-weight: bold; color: #0ea5e9;">${p.price.toFixed(2)} บาท/กก.</td>
        <td style="padding: 12px; color: ${trendColor}; font-weight: 600;">${trendIcon} ${trendText}</td>
      </tr>`;
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
