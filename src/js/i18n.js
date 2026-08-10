/**
 * Internationalization (i18n) Module
 * Handles language translations for Thai (TH) and Myanmar (MM)
 */

export const i18n = {
  TH: {
    // Page Titles
    companyTitle: "บริษัท ปิ่นทิพย์ จำกัด",
    pageTitleLogin: "🔑 เข้าสู่ระบบ",
    pageTitleDashboard: "🏠 เมนูหลัก",
    pageTitleAdminDashboard: "👑 แดสบอร์ดผู้ดูแลระบบ",
    pageTitleClockIn: "📍 ลงเวลาเข้า-ออกงาน",
    pageTitleLeave: "🌴 แบบฟอร์มขอลางาน",
    pageTitleFuel: "⛽ แจ้งเบิกค่าน้ำมัน / ค่าซ่อมรถ",
    pageTitleHistory: "📜 ประวัติการมาทำงานของฉัน",

    // UI Labels
    companyTitle: "บริษัท ปิ่นทิพย์ จำกัด",
    listTitle: "📊 สถานะพนักงานวันนี้:",
    loadingText: "กำลังโหลดข้อมูล...",
    phEmpId: "รหัสเข้าใช้งาน (4 หลัก)",
    phPin: "รหัส PIN (4 หลัก)",
    btnLogin: "เข้าสู่ระบบ",
    welcome: (name) => `👋 สวัสดีครับ: ${name}`,
    
    // Menu Items
    btnClockInMenu: "⏰ ลงเวลาเข้า-ออกงาน",
    btnLeaveMenu: "🌴 ขอลางาน",
    btnFuelMenu: "⛽ เบิกค่าน้ำมัน / ค่าซ่อมรถ",
    btnMyAttendance: "📜 ประวัติการทำงานของฉัน",
    btnHistoryMenu: "📜 ประวัติการขอลางาน / เบิกค่าใช้จ่าย",
    btnLogout: "🚪 ออกจากระบบ",

    // Clock In Options
    optIn: "☀️ เข้างาน",
    btnSubmitClockIn: "กดลงเวลา",
    
    // Leave Types
    optSick: "ลาป่วย",
    optPersonal: "ลากิจ",
    optVacation: "ลาพักร้อน / ลาหยุด",
    
    // Form Fields
    startDate: "เริ่มลานวันที่",
    endDate: "ถึงวันที่",
    phReason: "เหตุผลการลา",
    btnSubmitLeave: "ส่งใบลา",
    btnBack: "⬅️ กลับหน้าหลัก",

    // Status Messages
    checking: "⏳ กำลังตรวจสอบ...",
    emptyInputErr: "⚠️ กรุณากรอกรหัสและ PIN",
    successTitle: "🎉 สำเร็จ!",
    errTitle: "🚫 แจ้งเตือน",
    btnOk: "ตกลง"
  },
  MM: {
    // Page Titles
    companyTitle: "ပင်းသစ် ကုမ္ပဏီ လီမိတက်",
    pageTitleLogin: "🔑 အကောင့်ဝင်ရန်",
    pageTitleDashboard: "🏠 ပင်မစာမျက်နှာ",
    pageTitleAdminDashboard: "👑 အုပ်ချုပ်သူ မီနူး",
    pageTitleClockIn: "📍 အလုပ်ဝင်/ထွက်ချိန် မှတ်တမ်း",
    pageTitleLeave: "🌴 ခွင့်တောင်းလွှာ ဖောင်",
    pageTitleFuel: "⛽ ဆီဘိုး / ကားပြင်စရိတ် တောင်းခံရန်",
    pageTitleHistory: "📜 မှတ်တမ်း",

    // UI Labels
    listTitle: "📊 ယနေ့ ဝန်ထမ်းများ၏ အခြေအနေ:",
    loadingText: "ဒေတာရယူနေသည်...",
    phEmpId: "ID အမှတ်",
    phPin: "PIN နံပါတ်",
    btnLogin: "အကောင့်ဝင်မည်",
    welcome: (name) => `👋 မင်္ဂလာပါ: ${name}`,

    // Menu Items
    btnClockInMenu: "⏰ အလုပ်ဝင်/ထွက်ချိန်",
    btnLeaveMenu: "🌴 ခွင့်တောင်းရန်",
    btnFuelMenu: "⛽ ဆီဘိုး / ကားပြင်စရိတ် တောင်းခံရန်",
    btnMyAttendance: "📜 အလုပ်ချိန် မှတ်တမ်း",
    btnHistoryMenu: "📜 ခွင့်/စရိတ် မှတ်တမ်း",
    btnLogout: "🚪 အကောင့်ထွက်မည်",

    // Clock In Options
    optIn: "☀️ အလုပ်ဝင်",
    btnSubmitClockIn: "အချိန်မှတ်တမ်းတင်ရန်",

    // Leave Types
    optSick: "ဆေးခွင့်",
    optPersonal: "အလုပ်ကိစ္စ ခွင့်",
    optVacation: "အားလပ်ရက် ခွင့်",

    // Form Fields
    startDate: "စတင်သည့် ရက်စွဲ",
    endDate: "ပြီးဆုံးသည့် ရက်စွဲ",
    phReason: "အကြောင်းအရင်း",
    btnSubmitLeave: "ခွင့်တောင်းလွှာ ပို့မည်",
    btnBack: "⬅️ ပြန်သွားရန်",

    // Status Messages
    checking: "⏳ စစ်ဆေးနေသည်...",
    emptyInputErr: "⚠️ ID နှင့် PIN ဖြည့်စွက်ပါ",
    successTitle: "🎉 အောင်မြင်ပါသည်!",
    errTitle: "🚫 သတိပေးချက်",
    btnOk: "ကောင်းပြီ"
  }
};

/**
 * Current Language Manager
 */
class I18nManager {
  constructor() {
    this.currentLang = this.getSavedLanguage() || 'TH';
  }

  /**
   * Get saved language from localStorage
   */
  getSavedLanguage() {
    return localStorage.getItem('app_language');
  }

  /**
   * Set current language
   */
  setLanguage(lang) {
    if (i18n[lang]) {
      this.currentLang = lang;
      localStorage.setItem('app_language', lang);
      return true;
    }
    console.warn(`Language ${lang} not supported`);
    return false;
  }

  /**
   * Get current language
   */
  getLanguage() {
    return this.currentLang;
  }

  /**
   * Get translation string
   */
  t(key, ...params) {
    const translations = i18n[this.currentLang];
    if (!translations) {
      console.warn(`Language ${this.currentLang} not found`);
      return key;
    }

    const value = translations[key];
    if (!value) {
      console.warn(`Translation key "${key}" not found for language ${this.currentLang}`);
      return key;
    }

    // If value is a function (like welcome), call it with parameters
    if (typeof value === 'function') {
      return value(...params);
    }

    return value;
  }

  /**
   * Get all translations for current language
   */
  getAll() {
    return i18n[this.currentLang] || {};
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return Object.keys(i18n);
  }
}

// Export singleton instance
export const i18nManager = new I18nManager();

export default i18nManager;
