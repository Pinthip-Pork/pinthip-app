# 🚀 Deploy Firebase Cloud Function สำหรับ Pork Price Scraper

## ภาพรวม

Cloud Function `scrapePorkPrices` แก้ปัญหา CORS โดยทำการ scrape ข้อมูลฝั่ง server แทนที่จะทำใน browser

## ขั้นตอนการ Deploy

### 1. ติดตั้ง Firebase CLI (ถ้ายังไม่มี)

```bash
npm install -g firebase-tools
```

### 2. Login เข้า Firebase

```bash
firebase login
```

### 3. ตรวจสอบ Project ID

```bash
firebase projects:list
```

ควรเห็น `pinthip-checkin` ในรายการ

### 4. Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions:scrapePorkPrices
```

**หมายเหตุ**: ใช้ `--only functions:scrapePorkPrices` เพื่อ deploy เฉพาะ function นี้ ไม่กระทบ functions อื่นๆ

### 5. ตรวจสอบ Deployment

หลัง deploy สำเร็จ จะเห็น URL:
```
✔  functions[scrapePorkPrices(asia-southeast1)] Successful create operation.
Function URL: https://asia-southeast1-pinthip-checkin.cloudfunctions.net/scrapePorkPrices
```

### 6. ทดสอบ Cloud Function

#### ทดสอบผ่าน Firebase Console:
1. เปิด https://console.firebase.google.com/
2. เลือกโปรเจกต์ `pinthip-checkin`
3. ไปที่ **Functions**
4. คลิกที่ `scrapePorkPrices`
5. ไปที่ **Logs** เพื่อดู execution logs

#### ทดสอบผ่าน CLI:
```bash
firebase functions:config:get
```

### 7. ตรวจสอบใน Web App

1. เปิดเว็บแอป
2. ไปที่ **📊 วิเคราะห์ราคาหมูเป็น**
3. คลิก **📦 นำเข้าจำนวนมาก**
4. เลือก **4 สัปดาห์**
5. คลิก **🔄 เริ่มดึงข้อมูล**

**ผลที่คาดหวัง**:
```
กำลังเชื่อมต่อ Cloud Function...
กำลังดึงข้อมูล 4 สัปดาห์...
กำลังแปลงข้อมูล...
✅ ดึงข้อมูลสำเร็จ 4 รายการ
```

---

## การ Debug

### ดู Logs

```bash
firebase functions:log --only scrapePorkPrices
```

หรือดูผ่าน Console:
https://console.cloud.google.com/logs/query?project=pinthip-checkin

### ปัญหาที่พบบ่อย

#### 1. "Firebase Functions not initialized"

**สาเหตุ**: Firebase SDK ยังไม่โหลดเสร็จ

**แก้ไข**: รอ 2-3 วินาทีหลังเปิดหน้าเว็บแล้วลองใหม่

#### 2. "CORS error" ยังเกิดขึ้น

**สาเหตุ**: CSP header ยังไม่อัปเดต

**แก้ไข**: Deploy hosting ใหม่:
```bash
firebase deploy --only hosting
```

#### 3. "Function took too long"

**สาเหตุ**: ดึงข้อมูลหลายสัปดาห์ เกิน timeout

**แก้ไข**: ลดจำนวนสัปดาห์ หรือเพิ่ม timeout ใน `functions/index.js`:
```javascript
exports.scrapePorkPrices = onCall({ 
  region: 'asia-southeast1', 
  cors: true,
  timeoutSeconds: 300  // เพิ่ม 5 นาที
}, async (request) => {
```

#### 4. "HTTP 429 Too Many Requests"

**สาเหตุ**: เรียก function บ่อยเกินไป

**แก้ไข**: รอ 1-2 นาทีแล้วลองใหม่

---

## API Reference

### Cloud Function: `scrapePorkPrices`

**Endpoint**: `https://asia-southeast1-pinthip-checkin.cloudfunctions.net/scrapePorkPrices`

**Request**:
```javascript
{
  count: 4  // จำนวนสัปดาห์ (1-52)
}
```

**Response**:
```javascript
{
  success: true,
  count: 4,
  data: [
    {
      date: "2026-08-28",
      nationalAverage: 75.5,
      prices: {
        "ตะวันตก": 75.0,
        "ตะวันออก": 75.5,
        "อีสาน": 74.0,
        "เหนือ": 77.0,
        "ใต้": 76.0
      },
      pigletPrice: 2000,
      source: "swinethailand.com"
    },
    // ...
  ]
}
```

**Error**:
```javascript
{
  code: "invalid-argument",
  message: "count must be between 1 and 52"
}
```

---

## ค่าใช้จ่าย (Firebase Pricing)

### Spark Plan (ฟรี):
- **Invocations**: 2,000,000 calls/เดือน
- **Compute time**: 400,000 GB-seconds/เดือน
- **Outbound networking**: 5GB/เดือน

### การประมาณการ:
- แต่ละครั้งใช้เวลา ~5 วินาที
- 1,000 calls = ~$0.05 USD
- **สรุป**: ใช้งานปกติไม่เสียค่าใช้จ่าย (ฟรี)

---

## สรุป

✅ **Cloud Function พร้อมใช้งาน**  
✅ **แก้ปัญหา CORS อย่างถาวร**  
✅ **Server-side scraping = เร็วและปลอดภัย**  
✅ **ไม่เสียค่าใช้จ่าย (Spark Plan)**

**คำสั่ง Deploy**:
```bash
firebase deploy --only functions:scrapePorkPrices
```
