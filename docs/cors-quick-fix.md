# วิธีแก้ปัญหา CORS แบบง่ายสุด (สำหรับ Development)

## 🚀 ขั้นตอนเดียว: ติดตั้ง Browser Extension

### สำหรับ Chrome/Edge:

1. เปิด Chrome/Edge
2. ไปที่ https://chromewebstore.google.com/
3. ค้นหา "**CORS Unblock**" หรือ "**Allow CORS**"
4. คลิก **Add to Chrome/Edge**
5. เปิด Extension โดยคลิกที่ไอคอน

**Extension แนะนำ**:
- [CORS Unblock](https://chromewebstore.google.com/detail/cors-unblock/lfhmikememgdcahcdlaciloancbhjino)
- [Allow CORS: Access-Control-Allow-Origin](https://chromewebstore.google.com/detail/allow-cors-access-control/lhobafahddgcelffkeicbaginigeejlf)

### สำหรับ Firefox:

1. เปิด Firefox
2. ไปที่ https://addons.mozilla.org/
3. ค้นหา "**CORS Everywhere**"
4. คลิก **Add to Firefox**

---

## ⚙️ ตั้งค่าโค้ดให้ไม่ใช้ Proxy

หลังจากติดตั้ง Extension แล้ว แก้ไขใน `modules/pork-price-bulk.js`:

```javascript
async function scrapeLatestFromWeb(count, onProgress) {
  // ปิด proxy เพราะใช้ browser extension แทน
  const USE_EXTENSION = true; // ⬅️ เปลี่ยนเป็น true
  
  const indexUrl = 'https://www.swinethailand.com/16866405/ราคาสุกรขุน-ปี-2561-2569';
  
  if (USE_EXTENSION) {
    // ดึงข้อมูลโดยตรง ไม่ผ่าน proxy
    const indexResponse = await fetch(indexUrl);
    if (!indexResponse.ok) throw new Error('ไม่สามารถเชื่อมต่อเว็บไซต์ได้');
    
    const indexHtml = await indexResponse.text();
    
    // ...
  } else {
    // ใช้ proxy (เดิม)
    // ...
  }
}
```

---

## ✅ ทดสอบ

1. เปิด Extension (ให้แสดงสีเขียว)
2. Refresh หน้าเว็บ (Ctrl+Shift+R)
3. ไปที่ **📊 วิเคราะห์ราคาหมูเป็น**
4. คลิก **📦 นำเข้าจำนวนมาก**
5. เลือก **4 สัปดาห์**
6. คลิก **🔄 เริ่มดึงข้อมูล**

**ควรเห็น**:
```
[Scraper] Success - Direct fetch (no proxy)
✅ ดึงข้อมูลสำเร็จ 4 รายการ
```

---

## ⚠️ ข้อควรระวัง

- ✅ **Dev only**: ใช้เฉพาะขณะพัฒนา
- ⚠️ **ความปลอดภัย**: อาจทำให้เว็บไซต์อื่นเข้าถึงข้อมูล cross-origin ได้
- 🔒 **Production**: ใช้ Firebase Cloud Function แทน

---

## 🆚 เปรียบเทียบ 3 วิธี

| วิธี | ความเร็ว | ความยาก | Production Ready |
|------|----------|---------|------------------|
| Browser Extension | ⚡⚡⚡ เร็วสุด | ⭐ ง่ายสุด | ❌ Dev only |
| Public Proxy | 🐌 ช้า | ⭐⭐ ง่าย | ⚠️ ไม่แนะนำ |
| Firebase Function | ⚡⚡ เร็ว | ⭐⭐⭐ ยาก | ✅ แนะนำ |

---

## 💡 สรุป

**สำหรับทดสอบเร็วๆ**: ใช้ Browser Extension (5 นาที)  
**สำหรับ Production**: ใช้ Firebase Cloud Function (ดู `docs/cors-solution.md`)
