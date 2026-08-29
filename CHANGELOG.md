# Changelog

All notable changes to the Pinthip App project.

---

## [2026-08-29] - Security Hardening & Performance

### 🔒 Security Improvements

**1. Removed sensitive console.log statements** (12 locations)
- Removed customer data logging (name, phone, address)
- Removed employee data logging (empId, empName)
- Removed session/token information logging
- Kept console.error/warn for error handling
- Files: `foam-admin-ui.js`, `foam-staff-ui.js`, `app-globals.js`, `employee-ui.js`, `admin-operations.js`, `notification.js`

**2. Added Security Headers** (firebase.json)
- **Content-Security-Policy (CSP)** - Prevents XSS attacks
- **X-Content-Type-Options** - Prevents MIME sniffing
- **X-Frame-Options** - Prevents clickjacking (SAMEORIGIN)
- **X-XSS-Protection** - Browser XSS filter enabled
- **Referrer-Policy** - Limits referrer information leakage
- **Permissions-Policy** - Controls browser features (geolocation only)

**3. Updated Firebase SDK**
- Version: 9.23.0 → **10.13.2**
- Fixed known security vulnerabilities in older versions
- Improved performance and stability
- Better error handling and recovery
- Files: `index.html`, `fcm.js`

### 🎨 UI/UX - Foam Staff Interface
- **Full Screen Sticky Search Design**
  - Removed banner/header for cleaner interface
  - Sticky search bar at top with quick action buttons (Add, History, Back)
  - Card-style customer list (6-7 visible cards vs 3 previously)
  - Unlimited scrolling with smooth animations
  - Hover effects on cards (blue border + shadow)
  - Empty state with large icon and add button

### 🐛 Bug Fixes
- **Admin Session Persistence**
  - Auto-refresh on user activity (throttled to 5 min intervals)
  - Token refresh every 45 minutes
  - Sliding window expiry (7 days from last activity)
  - Recovery mechanism for dropped sessions

- **Memory Leak Fixes**
  - Cleanup Firebase listeners on logout
  - Cleanup listeners when switching admin/employee modes
  - Proper disposal of real-time subscriptions

- **Dashboard Loading Errors**
  - Added fallback checks for helper functions
  - Safe rendering with null checks
  - Error boundaries for async operations

### 🔧 Technical Improvements
- **Session Management**
  - `refreshSessionExpiry()` in app-state.js
  - User activity detection (click, keydown, touchstart)
  - Proactive token refresh mechanism
  - Session recovery on auth state changes

- **Performance**
  - Debounced search (300ms delay)
  - Customer list caching
  - Optimized re-renders

---

## Previous Changes

### Features
- Admin dashboard with device access control
- Employee dashboard with attendance tracking
- Foam delivery management system
- Fuel request system
- Leave request system
- Real-time notifications
- PWA support with service worker

### Security
- Firebase Authentication
- Session-based access control
- Device-specific permissions
- Role-based authorization (admin/employee)

---

## Notes

- All UI improvements are mobile-first responsive
- Session expiry uses sliding window (extends on activity)
- Console logging limited to errors/warnings only
- **Firebase SDK version: 10.13.2** (updated from 9.23.0)
- **Security headers active** (CSP, XSS Protection, etc.)

---

## TODO

### Security (Optional - Future Enhancements)
- [ ] Fix innerHTML XSS vulnerabilities (9 locations) - use textContent or escape()
- [ ] Replace alert() with showModal() for better UX (78 locations)
- [ ] Consider encrypting localStorage data

### Performance (Optional)
- [ ] Split admin-operations.js (109 KB - too large)
- [ ] Lazy load admin-holiday-calendar.js (27 KB)
- [ ] Implement code splitting for better load times

### UI/UX (Optional)
- [ ] Recent customers quick access
- [ ] Favorite customers feature
- [ ] Offline mode indicator
- [ ] Pull-to-refresh

---

**Last Updated:** 2026-08-29

