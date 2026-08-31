# 🚀 Quick Start - Deploy Pork Price Scraper

## TL;DR

```bash
# 1. Install dependencies
cd functions
npm install

# 2. Deploy Cloud Function
cd ..
firebase deploy --only functions:scrapePorkPrices

# 3. Test in browser
# Open http://localhost:5500
# Go to "📊 วิเคราะห์ราคาหมูเป็น" → "📦 นำเข้าจำนวนมาก"
# Click "🔄 เริ่มดึงข้อมูล"
```

**Expected result**: ✅ ดึงข้อมูลสำเร็จ 4 รายการ

---

## Prerequisites

- [x] Firebase CLI installed (`npm install -g firebase-tools`)
- [x] Logged in (`firebase login`)
- [x] Project: `pinthip-checkin`

---

## Deploy Command

```bash
firebase deploy --only functions:scrapePorkPrices
```

**Output**:
```
✔  functions[scrapePorkPrices(asia-southeast1)] Successful create operation.
Function URL: https://asia-southeast1-pinthip-checkin.cloudfunctions.net/scrapePorkPrices
```

---

## Test

### Option 1: Browser Console (F12)

```javascript
firebase.functions().httpsCallable('scrapePorkPrices')({ count: 2 })
  .then(r => console.log(r.data))
  .catch(e => console.error(e));
```

### Option 2: Web UI

1. **📊 วิเคราะห์ราคาหมูเป็น**
2. **📦 นำเข้าจำนวนมาก**
3. เลือก **4 สัปดาห์**
4. **🔄 เริ่มดึงข้อมูล**

---

## Troubleshooting

### "Firebase Functions not initialized"
→ Wait 2-3 seconds after page load, then retry

### "CORS error"
→ Run: `firebase deploy --only hosting`

### Function not found
→ Run: `firebase deploy --only functions`

---

## Documentation

- **Full Guide**: `docs/deploy-cloud-function.md`
- **Architecture**: `docs/pork-price-architecture.md`
- **Changelog**: `docs/CORS-SOLUTION-CHANGELOG.md`

---

## Support

**Logs**: `firebase functions:log --only scrapePorkPrices`  
**Console**: https://console.firebase.google.com/project/pinthip-checkin/functions
