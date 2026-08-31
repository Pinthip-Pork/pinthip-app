/**
 * Pork Price Scraper - Core Functions
 * ดึงข้อมูลราคาหมูจาก swinethailand.com
 */

(function () {
  const SCRAPER_CONFIG = {
    baseUrl: 'https://www.swinethailand.com',
    indexUrl: 'https://www.swinethailand.com/16866405/ราคาสุกรขุน-ปี-2561-2569',
    delayBetweenRequests: 2000, // 2 วินาที
    maxRetries: 3
  };

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function thaiMonthToNumber(monthName) {
    const months = {
      'มกราคม': 1, 'กุมภาพันธ์': 2, 'มีนาคม': 3, 'เมษายน': 4,
      'พฤษภาคม': 5, 'มิถุนายน': 6, 'กรกฎาคม': 7, 'สิงหาคม': 8,
      'กันยายน': 9, 'ตุลาคม': 10, 'พฤศจิกายน': 11, 'ธันวาคม': 12
    };
    return months[monthName] || 1;
  }

  function thaiDateToISO(day, monthName, buddhistYear) {
    const month = thaiMonthToNumber(monthName);
    const year = buddhistYear - 543;
    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  }

  function extractPriceData(html, dateInfo) {
    const data = {
      date: thaiDateToISO(dateInfo.day, dateInfo.month, dateInfo.year),
      prices: {},
      source: 'swinethailand.com'
    };

    // ภาคตะวันตก 74-76
    const regionPattern = /ภาค(ตะวันตก|ตะวันออก|อีสาน|เหนือ|ใต้)\s+(?:-?\s*)?(\d+(?:\.\d+)?)\s*-?\s*(\d+(?:\.\d+)?)?/gi;
    let match;
    
    while ((match = regionPattern.exec(html)) !== null) {
      const region = match[1];
      const price1 = parseFloat(match[2]);
      const price2 = match[3] ? parseFloat(match[3]) : price1;
      const avgPrice = (price1 + price2) / 2;
      
      if (!data.prices[region] || avgPrice > data.prices[region]) {
        data.prices[region] = avgPrice;
      }
    }

    // ลูกสุกรขุนเล็ก 2,000
    const pigletPattern = /ลูกสุกร(?:ขุน)?(?:เล็ก)?\s+([\d,]+)/i;
    const pigletMatch = pigletPattern.exec(html);
    if (pigletMatch) {
      data.pigletPrice = parseFloat(pigletMatch[1].replace(/,/g, ''));
    }

    // คำนวณราคาเฉลี่ยทั้งประเทศ
    const priceValues = Object.values(data.prices);
    if (priceValues.length > 0) {
      data.nationalAverage = priceValues.reduce(function (a, b) { return a + b; }, 0) / priceValues.length;
    }

    return data;
  }

  async function scrapeSinglePage(linkInfo, retries) {
    retries = retries !== undefined ? retries : SCRAPER_CONFIG.maxRetries;
    
    try {
      const response = await fetch(linkInfo.url);
      
      if (!response.ok) {
        if (retries > 0) {
          await sleep(SCRAPER_CONFIG.delayBetweenRequests * 2);
          return scrapeSinglePage(linkInfo, retries - 1);
        }
        throw new Error('HTTP ' + response.status);
      }
      
      const html = await response.text();
      return extractPriceData(html, linkInfo);
      
    } catch (error) {
      console.error('[Scraper] Failed:', linkInfo.url, error);
      return null;
    }
  }

  async function scrapeMultiplePages(links, onProgress) {
    const results = [];
    const total = links.length;
    
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: total,
          percentage: Math.round(((i + 1) / total) * 100),
          currentUrl: link.url
        });
      }
      
      const data = await scrapeSinglePage(link);
      if (data && data.nationalAverage) {
        results.push(data);
      }
      
      if (i < links.length - 1) {
        await sleep(SCRAPER_CONFIG.delayBetweenRequests);
      }
    }
    
    return results;
  }

  function resultsToCSV(results) {
    const lines = results.map(function (r) {
      return r.date + ', ' + r.nationalAverage.toFixed(2) + ', 0, ' + r.source;
    });
    return lines.join('\n');
  }

  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.porkScraper = {
    scrapeMultiplePages: scrapeMultiplePages,
    scrapeSinglePage: scrapeSinglePage,
    resultsToCSV: resultsToCSV,
    extractPriceData: extractPriceData,
    thaiDateToISO: thaiDateToISO,
    sleep: sleep,
    config: SCRAPER_CONFIG
  };
})();
