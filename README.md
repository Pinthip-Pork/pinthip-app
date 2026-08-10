# ปิ่นทิพย์ เช็กอิน (Pinthip Check-In)

บริหารจัดการการลงเวลา ขอลา และเบิกค่าใช้จ่ายพนักงานของบริษัท ปิ่นทิพย์ จำกัด ผ่าน Progressive Web App (PWA)

## 📋 สารบัญ

- [ฟีเจอร์](#-ฟีเจอร์)
- [เทคโนโลยี](#-เทคโนโลยี)
- [การติดตั้ง](#-การติดตั้ง)
- [การพัฒนา](#-การพัฒนา)
- [การ Deploy](#-การ-deploy)
- [โครงสร้างโปรเจค](#-โครงสร้างโปรเจค)
- [ปัญหาและแก้ไข](#-ปัญหาและแก้ไข)

## 🎯 ฟีเจอร์

### สำหรับพนักงาน
- ✅ ลงเวลาเข้า-ออกงาน (Clock In/Out)
- ✅ ขอลางาน (Sick/Personal/Vacation)
- ✅ เบิกค่าน้ำมัน/ค่าซ่อมรถ
- ✅ ดูประวัติการมาทำงาน
- ✅ ดูสถานะการอนุมัติ
- ✅ รองรับภาษา Thai/Myanmar

### สำหรับผู้ดูแลระบบ (Admin)
- ✅ Dashboard สรุปข้อมูลเรียลไทม์
- ✅ อนุมัติคำขอลาและเบิกค่าใช้จ่าย
- ✅ จัดการจ๊อบส่งของ
- ✅ ดูประวัติสถิติพนักงาน
- ✅ สรุปค่าแรงและค่าใช้จ่ายรายวัน
- ✅ จัดการพนักงาน

## 💻 เทคโนโลยี

| ส่วนประกอบ | เทคโนโลยี |
|-----------|---------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Database** | Firebase Realtime Database |
| **PWA** | Service Worker, Web Manifest |
| **Localization** | Custom i18n (Thai/Myanmar) |
| **Build Tool** | (Planning: Vite/Webpack) |

## 📦 การติดตั้ง

### ข้อกำหนด
- Node.js 16+ (สำหรับการพัฒนา)
- Modern Browser (Chrome, Firefox, Safari, Edge)
- Firebase Account

### ขั้นตอน

1. **Clone Repository**
```bash
git clone https://github.com/Pinthip-Pork/pinthip-app.git
cd pinthip-app
```

2. **ตั้งค่า Environment Variables**
```bash
cp .env.example .env.local
```

แล้วกรอก Firebase credentials ใน `.env.local`:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
# ... อื่นๆ
```

3. **เปิดในเบราว์เซอร์**
- Local: `python -m http.server 8000` แล้วไปที่ `http://localhost:8000`
- หรือ Upload ไป Web Server

## 🚀 การพัฒนา

### Workflow
```bash
# 1. สร้าง branch ใหม่
git checkout -b feature/your-feature-name

# 2. ทำการเปลี่ยนแปลง
# แก้ไข src/ files

# 3. Push และ Create Pull Request
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature-name
```

### โครงสร้างโปรเจค
```
pinthip-app/
├── public/                 # Static files
│   ├── index.html         # Main HTML file
│   ├── icon-192.png       # PWA icon
│   ├── icon-512.png
│   └── manifest.json      # PWA manifest
├── src/
│   ├── styles/
│   │   └── styles.css     # Global styles
│   ├── js/
│   │   ├── app.js         # Main app initialization
│   │   ├── auth.js        # Authentication logic
│   │   ├── ui.js          # UI components & rendering
│   │   ├── db.js          # Database operations
│   │   ├── i18n.js        # Localization
│   │   └── utils.js       # Helper functions
│   └── config/
│       └── firebase.js    # Firebase config (from .env)
├── sw.js                   # Service Worker
├── .env.example           # Environment template
├── .gitignore             # Git ignore file
├── README.md              # This file
└── package.json           # Project metadata
```

## 📝 Credential Management

### ⚠️ IMPORTANT: Security

**ไม่ควร commit ไฟล์เหล่านี้:**
- `.env.local` (ไฟล์จริง)
- `config/firebase.js` (ถ้ามี credentials)

**วิธีการทำงาน:**
1. Copy `.env.example` → `.env.local`
2. กรอก Firebase credentials ใน `.env.local`
3. ไฟล์ `.env.local` ถูก ignore โดย `.gitignore`
4. ใช้ `process.env` หรือตัวแปร global ในไฟล์ app.js

### Default Admin Credentials (Development)
```
ID: admin
PIN: 8888
```

⚠️ **สำหรับ Production:** ต้องเปลี่ยน PIN นี้ใน Firebase Rules

## 🌍 Localization

ระบบรองรับภาษา Thai (TH) และ Myanmar (MM)

ไฟล์ strings อยู่ใน `src/js/i18n.js`:
```javascript
const i18n = {
  TH: { ... },
  MM: { ... }
};
```

## 🔐 Security Best Practices

### ✅ ต้องทำ
- [ ] เปลี่ยน Firebase API Key ให้เป็น Restricted Key
- [ ] ตั้ง Firebase Security Rules ให้ถูกต้อง
- [ ] ใช้ HTTPS สำหรับ Production
- [ ] Implement proper authentication backend
- [ ] Hash password ด้วย bcrypt/argon2
- [ ] Enable CORS restrictions

### ❌ ห้าม
- ไม่ใช้ Hardcoded Passwords ใน Frontend
- ไม่ Commit `.env.local`
- ไม่เก็บข้อมูลอ่อนไหวใน localStorage
- ไม่ Allow Direct Database Access จาก Client

## 🚢 การ Deploy

### Deploy ไป Firebase Hosting
```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Initialize Firebase
firebase init hosting

# 4. Deploy
firebase deploy --only hosting
```

### Deploy ไป GitHub Pages
```bash
# สร้าง docs/ folder และ copy files
# แล้ว enable GitHub Pages ใน Settings
```

### Deploy ไป Web Server
```bash
# Copy public/ และ src/ ไป server
# Setup HTTP server (nginx/apache)
```

## 📊 Project Statistics

- **Lines of Code:** ~15,000 (ปัจจุบัน ยังใน 1 ไฟล์)
- **Languages:** HTML (99.5%), JavaScript (0.5%)
- **Browser Support:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## 🐛 ปัญหาและแก้ไข

### Issue: Firebase Connection Failed
**สาเหตุ:** API Key ไม่ถูก หรือ Database URL ผิด
**วิธีแก้:** ตรวจสอบ `.env.local` และ Firebase Console

### Issue: PWA ไม่ติดตั้งได้
**สาเหตุ:** HTTPS ไม่เปิด หรือ manifest.json ผิด
**วิธีแก้:** ใช้ HTTPS หรือ localhost, ตรวจสอบ manifest.json

### Issue: localStorage ไม่เซฟ
**สาเหตุ:** Private Browsing Mode หรือ Storage ถูก clear
**วิธีแก้:** ใช้ Firefox/Chrome Normal Mode

## 📞 Support

หากมีปัญหา:
1. ตรวจสอบ Browser Console (F12)
2. ดู Network tab สำหรับ Firebase errors
3. สร้าง Issue ใน GitHub

## 📝 License

Private Project - Pinthip Company

## 👥 Contributors

- Pinthip-Pork (Owner)

---

**Last Updated:** 2026-08-10
**Version:** 1.0.0-refactor
