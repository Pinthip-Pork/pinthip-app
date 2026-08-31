# Pork Price Scraper - Architecture Overview

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ Firebase SDK
       │ httpsCallable('scrapePorkPrices')
       ▼
┌─────────────────────────────────┐
│   Firebase Cloud Function       │
│   (Server-side)                 │
│                                 │
│   - Bypass CORS restrictions    │
│   - Fetch HTML from website     │
│   - Extract price data (Regex)  │
│   - Return JSON response        │
└──────┬──────────────────────────┘
       │ HTTP Request
       │ (No CORS issue)
       ▼
┌──────────────────────────┐
│  swinethailand.com       │
│  (Target website)        │
│                          │
│  - Price reports (HTML)  │
└──────────────────────────┘
```

## 📁 File Structure

```
pinthip-app/
├── functions/
│   ├── index.js              # Cloud Functions (includes scrapePorkPrices)
│   └── package.json
│
├── modules/
│   ├── pork-price-bulk.js    # Frontend: Call Cloud Function
│   ├── pork-price-core.js    # Data analysis & storage
│   ├── pork-price-analytics.js  # Dashboard & charts
│   └── pork-price-forms.js   # Manual input forms
│
├── docs/
│   ├── deploy-cloud-function.md     # Deployment guide
│   ├── pork-price-scraper-readme.md # User guide
│   └── cors-solution.md             # CORS explanation
│
└── firebase.json             # Firebase hosting config
```

## 🔄 Data Flow

1. **User clicks "เริ่มดึงข้อมูล"**
   - Frontend: `modules/pork-price-bulk.js`
   - Calls: `firebase.functions().httpsCallable('scrapePorkPrices')`
   - Sends: `{ count: 4 }`

2. **Cloud Function executes**
   - Server: `functions/index.js`
   - Fetches HTML from swinethailand.com
   - Extracts prices using Regex
   - Returns JSON: `{ success: true, count: 4, data: [...] }`

3. **Frontend processes response**
   - Converts JSON to CSV format
   - Displays in textarea
   - User clicks "นำเข้า" to save to Firebase Realtime Database

## 🔐 Security

### CORS Bypass (Legitimate)
- **Client → Server**: No CORS (same origin)
- **Server → External Site**: No CORS (server-to-server)
- **Result**: CORS restrictions bypassed legally

### Rate Limiting
- 1 second delay between page scrapes
- Maximum 52 weeks per request
- Respectful to target server

### Data Validation
- Input: `count` must be 1-52
- Output: Validates extracted data structure
- Error handling: Graceful failures

## 📊 Performance

### Benchmarks
- 1 week: ~2 seconds
- 4 weeks: ~5 seconds
- 12 weeks: ~15 seconds

### Optimization
- Server-side scraping (faster than browser)
- Async operations (parallel when possible)
- Caching (could be added in future)

## 🚀 Deployment

### Prerequisites
```bash
npm install -g firebase-tools
firebase login
```

### Deploy Cloud Function Only
```bash
firebase deploy --only functions:scrapePorkPrices
```

### Deploy Everything
```bash
firebase deploy
```

## 🧪 Testing

### Test Cloud Function Locally
```bash
cd functions
npm install
firebase emulators:start --only functions
```

### Test in Browser
1. Open DevTools (F12)
2. Console:
```javascript
firebase.functions().httpsCallable('scrapePorkPrices')({ count: 2 })
  .then(result => console.log(result.data))
  .catch(error => console.error(error));
```

## 📝 API Documentation

### `scrapePorkPrices` Cloud Function

**Type**: `onCall` (Firebase Callable Function)

**Request**:
```typescript
{
  count: number  // 1-52 (weeks to scrape)
}
```

**Response**:
```typescript
{
  success: boolean,
  count: number,
  data: Array<{
    date: string,           // "2026-08-28"
    nationalAverage: number, // 75.5
    prices: {
      ตะวันตก: number,
      ตะวันออก: number,
      อีสาน: number,
      เหนือ: number,
      ใต้: number
    },
    pigletPrice: number,    // 2000
    source: string          // "swinethailand.com"
  }>
}
```

**Errors**:
- `invalid-argument`: count out of range
- `not-found`: No price data found
- `internal`: Scraping failed

## 🔧 Maintenance

### Update Regex Patterns
If website HTML structure changes, update:
- `functions/index.js` → `extractPriceData()`

### Monitor Logs
```bash
firebase functions:log --only scrapePorkPrices
```

### Check Usage
https://console.firebase.google.com/project/pinthip-checkin/usage

## 📈 Future Enhancements

1. **Caching**: Cache results for 1 day
2. **Scheduled Scraping**: Auto-scrape daily at 9 AM
3. **Notifications**: Alert admin when prices change significantly
4. **Historical Data**: Export to Google Sheets
5. **Multiple Sources**: Scrape from DLD, OAE websites

## 🆘 Troubleshooting

### Function not found
```bash
firebase deploy --only functions
```

### CORS error persists
```bash
firebase deploy --only hosting
```

### Timeout
Increase in `functions/index.js`:
```javascript
{ timeoutSeconds: 300 }
```

### Rate limit
Wait 1-2 minutes before retry

---

## 📞 Support

**Issues**: Check `docs/deploy-cloud-function.md`  
**Logs**: `firebase functions:log`  
**Console**: https://console.firebase.google.com/
