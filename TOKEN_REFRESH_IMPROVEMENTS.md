# 🔐 การปรับปรุงระบบ Token Refresh เพื่อป้องกันการหมดอายุ

## 📋 สรุปการเปลี่ยนแปลง

วันที่: 31 สิงหาคม 2026

### ปัญหาที่พบ:
- ผู้ใช้เจอข้อความ "โหลดข้อมูลแดชบอร์ดไม่สำเร็จ (หมดเวลา)" บ่อยครั้ง
- สาเหตุหลัก: **Firebase Authentication Token หมดอายุ** (TTL = 1 ชั่วโมง)
- เมื่อเปิดเว็บทิ้งไว้นาน หรือเปลี่ยนแท็บไปทำอย่างอื่น → token หมดอายุ → ต้อง refresh หน้าเว็บ

---

## ✅ การแก้ไข

### 1️⃣ ลดช่วงเวลา Auto-Refresh Token
**ไฟล์:** `scripts/app-globals.js` (บรรทัด 363-378)

**เดิม:**
```javascript
// Refresh token ทุก 45 นาที
}, 45 * 60 * 1000);
```

**แก้เป็น:**
```javascript
// Refresh token ทุก 30 นาที
}, 30 * 60 * 1000);
```

**เหตุผล:**
- Firebase Custom Token หมดอายุทุก 1 ชั่วโมง (60 นาที)
- Refresh ที่ 30 นาที = มี buffer 30 นาทีก่อนหมดอายุ
- ลดโอกาสที่ token จะหมดอายุก่อนที่จะ refresh ทัน

---

### 2️⃣ เพิ่ม Visibility Change Listener ⭐ สำคัญ!
**ไฟล์:** `scripts/app-globals.js` (บรรทัด 380-410)

**เพิ่มใหม่:**
```javascript
// ตรวจจับเมื่อผู้ใช้กลับมาที่แท็บ
document.addEventListener('visibilitychange', function() {
  if (!document.hidden) {
    var timeSinceLastChange = Date.now() - lastVisibilityChange;
    
    // ถ้าไปทำอย่างอื่นนานกว่า 5 นาที → refresh token ทันที
    if (timeSinceLastChange > 5 * 60 * 1000) {
      firebase.auth().currentUser.getIdToken(true);
      // และ recover session ถ้า refresh ล้มเหลว
    }
  }
});
```

**เหตุผล:**
- Browser มักจะ suspend timers เมื่อแท็บไม่ active
- Auto-refresh (30 นาที) อาจไม่ทำงานถ้าแท็บไม่ได้เปิดค้างไว้
- เมื่อผู้ใช้กลับมา → ตรวจสอบทันทีว่าหายไปนานเท่าไหร่
- ถ้านานกว่า 5 นาที → refresh token ก่อนจะโหลดข้อมูล

---

## 📊 เปรียบเทียบ ก่อน vs หลัง

| สถานการณ์ | ก่อนแก้ | หลังแก้ |
|-----------|---------|---------|
| **เปิดเว็บทิ้งไว้ 1 ชั่วโมง** | Token หมดอายุ → Timeout ❌ | Refresh ที่ 30 นาที → ปลอดภัย ✅ |
| **เปลี่ยนแท็บไป 30 นาที** | Auto-refresh อาจไม่ทำงาน → Token หมดอายุ ❌ | เมื่อกลับมา → Refresh ทันที ✅ |
| **เปิดเว็บทิ้งไว้ข้ามคืน** | Token หมดอายุแน่นอน ❌ | Visibility listener จะ refresh เมื่อกลับมา ✅ |
| **ใช้งานต่อเนื่อง** | Refresh ทุก 45 นาที | Refresh ทุก 30 นาที (ปลอดภัยกว่า) ✅ |

---

## 🔍 การทำงานของระบบ

### Timeline การ Refresh Token:

```
เวลา 0:00  → Login สำเร็จ (Token ใหม่)
       ↓
เวลา 30:00 → Auto-refresh #1 (ยังมี 30 นาทีก่อนหมดอายุ)
       ↓
เวลา 60:00 → Auto-refresh #2 (ป้องกันการหมดอายุ)
       ↓
เวลา 90:00 → Auto-refresh #3 
       ...และวนต่อไป
```

### เมื่อผู้ใช้เปลี่ยนแท็บ:

```
09:00 → อยู่ที่แท็บเว็บ (Token: OK)
09:05 → เปลี่ยนไปแท็บอื่น (เช่น YouTube)
       [Browser suspend timers]
09:35 → Auto-refresh (30 นาที) อาจไม่ทำงาน!
10:00 → Token หมดอายุ (1 ชั่วโมง)
10:15 → กลับมาที่แท็บเว็บ
       ⚡ Visibility Listener ตรวจจับว่าหายไป 70 นาที
       → Refresh token ทันที!
       → ถ้า refresh สำเร็จ → ใช้งานต่อได้
       → ถ้า refresh ล้มเหลว → พยายาม recover session
```

---

## 🧪 การทดสอบ

### ทดสอบ Auto-Refresh (30 นาที):
1. เปิดเว็บและ login
2. เปิด DevTools Console
3. รอ 30 นาที
4. ควรเห็นข้อความ: "Proactive token refresh..." (ไม่มี error)

### ทดสอบ Visibility Listener:
1. เปิดเว็บและ login
2. เปิด DevTools Console
3. เปลี่ยนไปแท็บอื่น 10 นาที
4. กลับมาที่แท็บเว็บ
5. ควรเห็นข้อความ: "Tab became visible after 10 minutes — refreshing token..."
6. จากนั้น: "Token refreshed successfully after tab visibility change"

### ทดสอบการป้องกัน Timeout:
1. เปิดเว็บและ login
2. เปลี่ยนไปแท็บอื่น 30 นาที (พอให้ auto-refresh พลาด)
3. กลับมาที่แท็บเว็บ
4. กดปุ่ม "กลับ" เพื่อโหลดแดชบอร์ด
5. **ผลลัพธ์ที่คาดหวัง:** โหลดสำเร็จ (ไม่เห็น timeout error)

---

## 📝 หมายเหตุสำคัญ

### ข้อดี:
- ✅ ลดโอกาส timeout จากการ token หมดอายุ
- ✅ ไม่ต้องกด F5 หรือ login ใหม่บ่อยๆ
- ✅ UX ดีขึ้น โดยเฉพาะสำหรับผู้ใช้ที่เปิดเว็บทิ้งไว้นาน

### ข้อควรระวัง:
- Visibility listener จะ refresh เมื่อหายไปนานกว่า **5 นาที**
- ถ้าหายไปนานกว่า **1 ชั่วโมง** token อาจหมดอายุแล้ว → จะพยายาม recover
- ถ้า recover ล้มเหลว → แสดง error + แนะนำให้ login ใหม่

### การ Monitor:
เปิด Console (F12) แล้วดูข้อความ:
- `Proactive token refresh failed` → ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
- `Token refresh on visibility change failed` → อาจต้อง login ใหม่
- `Session recovery failed` → Session token หมดอายุ (7 วัน)

---

## 🚀 การ Deploy

ไฟล์ที่เปลี่ยนแปลง:
- ✅ `scripts/app-globals.js` (บรรทัด 363-410)

ขั้นตอนการ deploy:
1. Commit การเปลี่ยนแปลง
2. Push ไปยัง repository
3. Deploy ไปยัง Firebase Hosting หรือ server
4. ทดสอบบนเบราว์เซอร์จริง (Chrome, Safari, Firefox)

---

## 🎓 บทเรียนที่ได้

### สำหรับ Developer:
1. **Browser suspend timers** เมื่อแท็บไม่ active
   - `setInterval` อาจไม่ทำงานตามเวลาที่กำหนด
   - ต้องใช้ `visibilitychange` event เพื่อจัดการเมื่อผู้ใช้กลับมา

2. **Firebase Auth Token TTL = 1 ชั่วโมง**
   - ควร refresh ก่อน 50-60% ของเวลา (30-35 นาที)
   - มี buffer เพื่อป้องกันกรณี network ช้า

3. **Proactive Token Management**
   - ไม่ควรรอให้ error เกิดก่อนแล้วค่อยจัดการ
   - ควร refresh ก่อนหมดอายุเสมอ

4. **Mobile/PWA Considerations**
   - iOS Safari มีปัญหา IndexedDB persistence
   - ควรมีระบบ recovery ที่แข็งแรง

---

## 📚 อ้างอิง

- [Firebase Auth Token Management](https://firebase.google.com/docs/auth/admin/manage-sessions)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Browser Timer Throttling](https://developer.chrome.com/blog/timer-throttling-in-chrome-88/)

---

**สร้างโดย:** Kiro AI  
**วันที่:** 31 สิงหาคม 2026  
**เวอร์ชัน:** 1.0
