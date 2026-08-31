# แก้ปัญหา CORS สำหรับ Pork Price Scraper

## ปัญหา

```
Access to fetch at 'https://www.swinethailand.com/...' from origin 'http://127.0.0.1:5500' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present 
on the requested resource.
```

**สาเหตุ**: เบราว์เซอร์ป้องกันไม่ให้ JavaScript จาก domain หนึ่ง (เช่น localhost) ดึงข้อมูลจาก domain อื่น (swinethailand.com) เพื่อความปลอดภัย

## วิธีแก้ (เลือก 1 ใน 3)

### ✅ วิธีที่ 1: ใช้ CORS Proxy (แนะนำ - ใช้ได้ทันที)

**สถานะ**: ✅ ใช้งานได้แล้ว

ระบบใช้บริการ **allorigins.win** เป็น proxy ตัวกลาง:

```javascript
const USE_PROXY = true;
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
```

**ข้อดี**:
- ✅ ไม่ต้องติดตั้งอะไรเพิ่ม
- ✅ ใช้งานได้ทันที
- ✅ ฟรี

**ข้อเสีย**:
- ⚠️ ช้ากว่าปกติ (ผ่าน proxy)
- ⚠️ พึ่งพา third-party service
- ⚠️ อาจมี rate limit

**ทางเลือก proxy อื่นๆ**:
- https://corsproxy.io/?url=...
- https://cors-anywhere.herokuapp.com/...
- https://api.codetabs.com/v1/proxy?quest=...

### วิธีที่ 2: สร้าง Backend Proxy เอง (แนะนำสำหรับ production)

สร้าง Firebase Cloud Function:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const fetch = require('node-fetch');

exports.porkPriceScraper = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  
  const url = req.query.url;
  if (!url) {
    return res.status(400).send('Missing url parameter');
  }
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    res.send(html);
  } catch (error) {
    res.status(500).send(error.message);
  }
});
```

จากนั้นเปลี่ยนใน `pork-price-bulk.js`:

```javascript
const PROXY_URL = 'https://us-central1-YOUR-PROJECT.cloudfunctions.net/porkPriceScraper?url=';
```

**ข้อดี**:
- ✅ ควบคุมได้เอง
- ✅ เร็วกว่า public proxy
- ✅ ไม่มี rate limit (ถ้าจ่าย Firebase)

**ข้อเสีย**:
- ❌ ต้องติดตั้ง Firebase CLI
- ❌ อาจมีค่าใช้จ่าย (ถ้าใช้งานมาก)

### วิธีที่ 3: ใช้ Browser Extension (สำหรับ development)

ติดตั้ง extension:
- **Chrome**: [Allow CORS](https://chrome.google.com/webstore/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf)
- **Firefox**: [CORS Everywhere](https://addons.mozilla.org/en-US/firefox/addon/cors-everywhere/)

จากนั้นปิด proxy:

```javascript
const USE_PROXY = false; // ใน pork-price-bulk.js
```

**ข้อดี**:
- ✅ เร็วที่สุด (ไม่ผ่าน proxy)
- ✅ เหมาะสำหรับ development

**ข้อเสีย**:
- ❌ ใช้ได้เฉพาะ development
- ❌ ผู้ใช้ทั่วไปต้องติดตั้ง extension
- ⚠️ มีความเสี่ยงด้านความปลอดภัย

---

## การเปลี่ยน Proxy (ถ้าต้องการ)

แก้ไขใน `modules/pork-price-bulk.js`:

```javascript
async function scrapeLatestFromWeb(count, onProgress) {
  // เปลี่ยน proxy ที่นี่
  const USE_PROXY = true;
  const PROXY_URL = 'https://YOUR-PROXY-URL/?url='; // ⬅️ แก้ตรงนี้
  
  // ...
}
```

---

## ทดสอบ

1. เปิด Console (F12)
2. ลองดึงข้อมูล
3. ดูว่ามี error หรือไม่

**Success**:
```
✅ ดึงข้อมูลสำเร็จ 8 รายการ
```

**Failed**:
```
❌ เกิดข้อผิดพลาด: Failed to fetch
```

---

## FAQ

**Q: ทำไมไม่แก้ที่เว็บ swinethailand.com โดยตรง?**  
A: เว็บนั้นไม่ได้เป็นของเรา ต้องติดต่อเจ้าของเว็บให้เพิ่ม `Access-Control-Allow-Origin: *` header

**Q: Proxy ช้ามาก ทำไง?**  
A: ลองเปลี่ยนไปใช้ proxy อื่น หรือสร้าง proxy เองด้วย Firebase/Vercel

**Q: ใช้ proxy แบบนี้ผิดกฎหมายไหม?**  
A: ไม่ผิดกฎหมาย เพราะ:
1. ข้อมูลเป็นสาธารณะ
2. Proxy แค่เป็นตัวกลาง forward request
3. ไม่ได้ทำอันตรายต่อเซิร์ฟเวอร์ต้นทาง

---

## สรุป

✅ **ปัจจุบัน**: ใช้ allorigins.win proxy (ใช้งานได้ทันที)  
🔧 **แนะนำ**: สร้าง Firebase Cloud Function สำหรับ production  
⚡ **Dev only**: ใช้ browser extension
