/**
 * admin-holiday-calendar.js
 * ---------------------------------------------------------------------------
 * ปฏิทินวันหยุด / วันพระ สำหรับหน้า Dashboard ผู้ดูแลระบบเท่านั้น
 *
 * มีส่วนประกอบ 2 ส่วน:
 *   1) Thai Buddhist lunar calendar engine (สุริยยาตร์ / Suriyayatra)
 *      - เป็น port จาก pythaidate (MIT (c) 2023 Mark Hollow) ผ่าน thai_lunar.dart
 *        ซึ่งตรวจสอบกับปฏิทินทางการไทยช่วงประมาณ ค.ศ.1900-2050 แล้ว
 *   2) ส่วนแสดงผล UI: ใช้สำหรับแสดงใน #adminHolidayCalendarRoot ของ Dashboard
 * ---------------------------------------------------------------------------
 */
(function () {
  // ===========================================================================
  // 1. สุริยยาตร์ (Suriyayatra) - Thai Buddhist lunar calendar engine
  // ===========================================================================
  // ---- Constants ---------------------------------------------------------------
  const DAYS_IN_800_YEARS = 292207;
  const TIME_UNITS_IN_1_DAY = 800;
  const EPOCH_OFFSET = 373;
  const UCCAPON_CONSTANT = 2611;
  const APOGEE_ROTATION_DAYS = 3232;
  const CS_JULIAN_DAY_OFFSET = 1954167;

  const CAL_TYPE_DAY_COUNTS = { A: 354, B: 355, C: 384, c: 384 };

  const MONTH_CUMULATIVE_DAYS = {
    A: [0, 29, 59, 88, 118, 147, 177, 206, 236, 265, 295, 324, 354, 383],
    B: [0, 29, 59, 89, 119, 148, 178, 207, 237, 266, 296, 325, 355, 384],
    C: [0, 29, 59, 88, 118, 148, 177, 207, 236, 266, 295, 325, 354, 384]
  };

  const LUNAR_MONTHS = [0, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 8, 88, 15, 16];
  const MONTH_POSITION_AB = [null, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 15, 16];
  const MONTH_POSITION_C = [null, 5, 6, 7, 8, 88, 9, 10, 11, 12, 1, 2, 3, 4, 15, 16];

  const FIND_DATE_VALS = {
    A: [[383, 16], [354, 15], [324, 12], [295, 11], [265, 10], [236, 9], [206, 8], [177, 7], [147, 6], [118, 5], [88, 4], [59, 3], [29, 2]],
    B: [[384, 16], [355, 15], [325, 12], [296, 11], [266, 10], [237, 9], [207, 8], [178, 7], [148, 6], [119, 5], [89, 4], [59, 3], [29, 2]],
    C: [[384, 15], [354, 12], [325, 11], [295, 10], [266, 9], [236, 8], [207, 7], [177, 6], [148, 5], [118, 14], [88, 13], [59, 3], [29, 2]]
  };


  // ---- Julian Day conversions (Fliegel / Van Flandern) -------------------------
  function gregorianToJulianDay(year, month, day) {
    let yearp;
    let monthp;
    if (month === 1 || month === 2) {
      yearp = year - 1;
      monthp = month + 12;
    } else {
      yearp = year;
      monthp = month;
    }
    let b;
    if (year < 1582 || (year === 1582 && month < 10) || (year === 1582 && month === 10 && day < 15)) {
      b = 0;
    } else {
      const a = Math.trunc(yearp / 100);
      b = 2 - a + Math.trunc(a / 4);
    }
    const c = yearp < 0 ? Math.trunc(365.25 * yearp - 0.75) : Math.trunc(365.25 * yearp);
    const d = Math.trunc(30.6001 * (monthp + 1));
    return Math.trunc(b + c + d + day + 1720994.5 + 0.5);
  }

  function julianDayToGregorian(jd) {
    const a = Math.trunc((jd - 1867216.25) / 36524.25);
    const b = jd > 2299160 ? (jd + 1 + a - Math.trunc(a / 4)) : jd;
    const c = b + 1524;
    const dd = Math.trunc((c - 122.1) / 365.25);
    const e = Math.trunc(365.25 * dd);
    const g = Math.trunc((c - e) / 30.6001);
    const days = c - e - Math.trunc(30.6001 * g);
    const month = g < 13.5 ? (g - 1) : (g - 13);
    const year = month > 2.5 ? (dd - 4716) : (dd - 4715);
    return { year, month, day: days };
  }

  // ---- Suriyayatra year classification -----------------------------------------
  function LunarYear(year) {
    this.year = year;
    const horakhun = Math.floor((year * DAYS_IN_800_YEARS + EPOCH_OFFSET) / TIME_UNITS_IN_1_DAY) + 1;
    const kammacapon = TIME_UNITS_IN_1_DAY - (year * DAYS_IN_800_YEARS + EPOCH_OFFSET) % TIME_UNITS_IN_1_DAY;
    this.horakhun = horakhun;
    this.kammacapon = kammacapon;
    this.uccapon = (UCCAPON_CONSTANT + horakhun) % APOGEE_ROTATION_DAYS;

    const avoQuot = Math.floor((horakhun * 11 + 650) / 692);
    let avoman = (horakhun * 11 + 650) % 692;
    if (avoman === 0) avoman = 692;
    this.avoman = avoman;
    this.masaken = Math.floor((avoQuot + horakhun) / 30);
    let tithi = (avoQuot + horakhun) % 30;
    if (avoman === 692) tithi -= 1;
    this.tithi = tithi;
    this.weekday = horakhun % 7;

    // Next year's tithi (for the athikamat tithi==25 / next==5 special case)
    const horakhun1 = Math.floor(((year + 1) * DAYS_IN_800_YEARS + EPOCH_OFFSET) / TIME_UNITS_IN_1_DAY) + 1;
    const quot1 = Math.floor((horakhun1 * 11 + 650) / 692);
    this.tithi1 = (quot1 + horakhun1) % 30;

    this.langsak = tithi < 1 ? 1 : tithi;
    let n = this.langsak;
    if (n < 6) n += 29;
    this.nyd = (this.weekday - n + 1 + 35) % 7;

    this.leapday = kammacapon <= 207;

    this.calType = 'A';
    if (tithi > 24 || tithi < 6) this.calType = 'C';
    if (tithi === 25 && this.tithi1 === 5) this.calType = 'A';
    if ((this.leapday && avoman <= 126) || (!this.leapday && avoman <= 137)) {
      this.calType = this.calType !== 'C' ? 'B' : 'c';
    }

    if (this.calType === 'A') this.nextNyd = (this.nyd + 4) % 7;
    else if (this.calType === 'B') this.nextNyd = (this.nyd + 5) % 7;
    else this.nextNyd = (this.nyd + 6) % 7;
    this.caldays = CAL_TYPE_DAY_COUNTS[this.calType];

    // Populated by calculateYear0 for the centre year only.
    this.offset = false;
    this.firstMonth = null;
    this.firstDay = null;
    this.offsetDays = null;
  }

  function calculateYear0(year) {
    const y = [-2, -1, 0, 1, 2].map(function (i) { return new LunarYear(year + i); });

    // tithi 24 -> 6 : force the whole window to C-type and bump next_nyd
    for (let i = 0; i < 5; i++) {
      if (y[2].tithi === 24 && y[3].tithi === 6) {
        y[i].calType = 'C';
        y[i].nextNyd = (y[i].nextNyd + 2) % 7;
      }
    }

    // resolve 'c'-type years (intercalary day + month coincidence)
    for (let i = 1; i <= 3; i++) {
      if (y[i].calType === 'c') {
        const j = y[i].nyd === y[i - 1].nextNyd ? 1 : -1;
        y[i + j].calType = 'B';
        y[i + j].nextNyd = (y[i + j].nextNyd + 1) % 7;
      }
    }

    // new-year-day langsak offset adjustment
    for (let i = 1; i <= 3; i++) {
      if (y[i - 1].nextNyd !== y[i].nyd && y[i].nextNyd !== y[i + 1].nyd) {
        y[i].offset = true;
        y[i].langsak += 1;
        y[i].nyd = (y[i].nyd + 6) % 7;
        y[i].nextNyd = (y[i].nextNyd + 6) % 7;
      }
    }

    for (let i = 0; i < 5; i++) {
      if (y[i].calType === 'c') y[i].calType = 'C';
      y[i].caldays = CAL_TYPE_DAY_COUNTS[y[i].calType];
    }

    const c = y[2];
    c.firstMonth = 'C'; // Caitra
    c.firstDay = c.langsak;
    c.offsetDays = c.langsak;
    if (c.offsetDays < 6 + (c.offset ? 1 : 0)) {
      c.firstMonth = 'V'; // Vaisakha
      c.firstDay = c.offsetDays;
      c.offsetDays += 29;
    }
    return c;
  }


  // ---- Chula Sakarat (CS) lunisolar date ---------------------------------------
  function CsDate(year, month, day) {
    this.year = year;
    this._month = month;
    this._day = day;
    this._initYmd();
    this._calculate();
  }

  CsDate.fromYearDays = function (year, days) {
    let y0 = calculateYear0(year);
    let daysInYear = 365 + (y0.leapday ? 1 : 0);
    let yr = year;
    let d = days;
    while (d > daysInYear) {
      yr += 1;
      d -= daysInYear;
      y0 = calculateYear0(yr);
      daysInYear = 365 + (y0.leapday ? 1 : 0);
    }
    const md = CsDate._findDate(y0.calType, y0.offsetDays + d);
    return new CsDate(yr, md.month, md.day);
  };

  CsDate.fromJulianDay = function (jd) {
    const hk = jd - CS_JULIAN_DAY_OFFSET;
    let year = Math.floor((hk * 800 - 373) / 292207);
    let days;
    if (hk % 292207 === 95333) {
      // Once per 800 years the year formula is off by one; correct it.
      year -= 1;
      days = 365;
    } else {
      const y0 = calculateYear0(year);
      days = hk - y0.horakhun;
    }
    return CsDate.fromYearDays(year, days);
  };

  CsDate.prototype._initYmd = function () {
    this._year0 = calculateYear0(this.year);
    let dateOffset = null;
    if (this._month === 5) dateOffset = this._day;
    else if (this._month === 6) dateOffset = 29 + this._day;

    const mp = this._year0.calType === 'C' ? MONTH_POSITION_C : MONTH_POSITION_AB;
    let tmonth = mp.indexOf(this._month);
    if (dateOffset !== null && dateOffset < this._year0.offsetDays) {
      // A month-5/6 date that wraps to the end of the year.
      tmonth += this._year0.calType === 'C' ? 13 : 12;
      this._month += 10;
    }
    this._days = MONTH_CUMULATIVE_DAYS[this._year0.calType][tmonth - 1] + this._day - this._year0.offsetDays;
  };

  CsDate.prototype._calculate = function () {
    this._horakhun = Math.floor((this.year * DAYS_IN_800_YEARS + EPOCH_OFFSET) / TIME_UNITS_IN_1_DAY) + 1 + this._days;
    this._kammacapon = TIME_UNITS_IN_1_DAY - (this.year * DAYS_IN_800_YEARS + EPOCH_OFFSET) % TIME_UNITS_IN_1_DAY;
    this._uccapon = (this._horakhun + UCCAPON_CONSTANT) % APOGEE_ROTATION_DAYS;
    this._avoman = (this._horakhun * 11 + 650) % 692;
    if (this._avoman === 0) this._avoman = 692;
    const avomanDiv = Math.floor(((this._horakhun + this._days) * 11 + 650) / 692);
    this._masaken = Math.floor((avomanDiv + this._horakhun) / 30);
    const quot = Math.floor((this._horakhun * 11 + 650) / 692);
    this._tithi = (quot + this._horakhun) % 30;
  };

  CsDate._findDate = function (cal, days) {
    const vals = FIND_DATE_VALS[cal];
    let d = days;
    let month = LUNAR_MONTHS[1];
    for (let i = 0; i < vals.length; i++) {
      const a = vals[i][0];
      const b = vals[i][1];
      if (d > a) {
        d -= a;
        month = LUNAR_MONTHS[b];
        break;
      }
      month = LUNAR_MONTHS[1];
    }
    return { month, day: d };
  };

  CsDate.prototype.julianDay = function () { return this._horakhun + CS_JULIAN_DAY_OFFSET; };
  CsDate.prototype.isAthikavar = function () { return this._year0.calType === 'B'; };
  CsDate.prototype.isAthikamat = function () { return this._year0.calType === 'C'; };
  CsDate.prototype.isSecondEighth = function () { return this._month === 88; };
  CsDate.prototype.isoWeekday = function () { return ((this._horakhun % 7) + 5) % 7 + 1; };

  Object.defineProperty(CsDate.prototype, 'month', {
    get() { return this._month === 15 || this._month === 16 ? this._month - 10 : this._month; }
  });
  Object.defineProperty(CsDate.prototype, 'monthRaw', { get() { return this._month; } });
  Object.defineProperty(CsDate.prototype, 'day', { get() { return this._day; } });
  Object.defineProperty(CsDate.prototype, 'calType', { get() { return this._year0.calType; } });

  CsDate.prototype.monthLength = function () {
    const firstJd = this.julianDay() - (this._day - 1);
    let len = 1;
    while (len <= 30) {
      const next = CsDate.fromJulianDay(firstJd + len);
      if (next.day === 1) break;
      len++;
    }
    return len;
  };


  // ---- Public lunar info -------------------------------------------------------
  function getThaiLunarInfo(year, month, day) {
    const jd = gregorianToJulianDay(year, month, day);
    const cs = CsDate.fromJulianDay(jd);
    const next = CsDate.fromJulianDay(jd + 1);
    const phase = cs.day <= 15 ? 'waxing' : 'waning';
    const lunarDay = cs.day <= 15 ? cs.day : cs.day - 15;
    const monthNum = cs.monthRaw === 88 ? 8 : cs.month;
    const isLastDay = next.monthRaw !== cs.monthRaw || next.day === 1;
    const isWanPhra =
      cs.day === 8 || cs.day === 15 || cs.day === 23 ||
      (isLastDay && (cs.day === 29 || cs.day === 30));
    return {
      jd,
      csYear: cs.year,
      beYear: cs.year + 1181,
      month: monthNum,
      monthRaw: cs.monthRaw,
      day: cs.day,               // 1..30 (waxing 1..15, waning 16..30)
      phase,                     // 'waxing' | 'waning'
      lunarDay,                  // 1..15 ค่ำ
      isSecondEighth: cs.isSecondEighth(),
      isLastDay,
      monthLength: cs.monthLength(),
      isWanPhra,
      isAthikamat: cs.isAthikamat(),
      weekday: cs.isoWeekday()   // 1=Mon .. 7=Sun
    };
  }

  // ===========================================================================
  // 2. วันสำคัญ + วันหยุดคงที่
  // ===========================================================================
  // วันหยุดนักขัตฤกษ์/วันสำคัญแบบวันที่คงที่ (ตามที่กำหนดในแต่ละปีสากล)
  const FIXED_HOLIDAYS = {
    '01-01': 'วันขึ้นปีใหม่',
    '04-06': 'วันจักรี',
    '04-13': 'วันสงกรานต์',
    '04-14': 'วันสงกรานต์',
    '04-15': 'วันสงกรานต์',
    '05-01': 'วันแรงงานแห่งชาติ',
    '05-04': 'วันฉัตรมงคล',
    '06-03': 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าฯ พระบรมราชินี',
    '07-28': 'วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว',
    '08-12': 'วันแม่แห่งชาติ',
    '10-13': 'วันคล้ายวันสวรรคต รัชกาลที่ 9',
    '10-23': 'วันปิยมหาราช',
    '12-05': 'วันพ่อแห่งชาติ',
    '12-10': 'วันรัฐธรรมนูญ',
    '12-31': 'วันสิ้นปี'
  };

  // วันสำคัญทางพระพุทธศาสนา (ขึ้น/แรมตามปฏิทินจันทรคติ)
  // ใช้หลักเกณฑ์เดียวกับ fullMoonOf ใน thai_lunar.dart / pythaidate (ที่ผ่านการ
  // ตรวจสอบกับปฏิทินทางการไทย แล้ว) โดยอิงจากปีสุริยคติ (Gregorian year):
  //   - ถ้าปีนั้นมี "เดือน 8 หลัง" (จันทร์เพ็ญของเดือน 8 ที่เกินมา / monthRaw 88)
  //     ถือว่าเป็นปีอธิกมาส -> มาฆบูชา เลื่อนไปเดือน 4, วิสาขบูชา เลื่อนไปเดือน 7
  //   - อาสาฬหบูชา = เดือน 8 หลัง (ถ้ามี) ไม่เช่นนั้นใช้เดือน 8
  //   - เข้าพรรษา = วันถัดจากอาสาฬหบูชา
  //   - ออกพรรษา = ขึ้น 15 ค่ำ เดือน 11
  // คืนค่า object ที่ key เป็น 'YYYY-MM-DD' -> ชื่อเทศกาล ('วัน...')
  function getFestivalsByDate(gregorianYear) {
    const map = {};
    const fullMoons = {};      // เลขเดือน (1..12) -> 'MM-DD' ของวันเพ็ญแรก
    let secondEighthDate = null;
    const isLeapSolar = (gregorianYear % 4 === 0) && (gregorianYear % 100 !== 0 || gregorianYear % 400 === 0);
    const dimArr = [31, isLeapSolar ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    for (let i = 0; i < 12; i++) {
      for (let d = 1; d <= dimArr[i]; d++) {
        const info = getThaiLunarInfo(gregorianYear, i + 1, d);
        if (info.day !== 15) continue; // เฉพาะวันเพ็ญ (ขึ้น 15 ค่ำ)
        const mmdd = pad2(i + 1) + '-' + pad2(d);
        if (info.isSecondEighth) {
          if (!secondEighthDate) secondEighthDate = mmdd;
        } else if (fullMoons[info.month] === undefined) {
          fullMoons[info.month] = mmdd;
        }
      }
    }

    const athikamat = !!secondEighthDate;
    function mark(mmdd, name) { if (mmdd) map[gregorianYear + '-' + mmdd] = name; }

    mark(fullMoons[athikamat ? 4 : 3], 'วันมาฆบูชา');
    mark(fullMoons[athikamat ? 7 : 6], 'วันวิสาขบูชา');

    const asalhaDate = secondEighthDate || fullMoons[8];
    mark(asalhaDate, 'วันอาสาฬหบูชา');
    if (asalhaDate) {
      const parts = asalhaDate.split('-');
      const nm = parseInt(parts[0], 10);
      let nd = parseInt(parts[1], 10) + 1;
      if (nd > dimArr[nm - 1]) { nd = 1; }
      mark(pad2(nm) + '-' + pad2(nd), 'วันเข้าพรรษา');
    }
    mark(fullMoons[11], 'วันออกพรรษา');
    return map;
  }



  // ===========================================================================
  // 3. UI - ปฏิทินบน Dashboard
  // ===========================================================================
  const THAI_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const THAI_DAYS_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

  let displayYear = null;
  let displayMonth = null; // 1..12
  let storeHolidaysCache = {};

  function getTodayLocal() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function loadStoreHolidays(callback) {
    const db = window.db;
    if (!db) { storeHolidaysCache = storeHolidaysCache || {}; if (callback) callback(); return; }
    db.ref('holidays').once('value').then(function (snap) {
      const obj = snap.val() || {};
      const map = {};
      Object.keys(obj).forEach(function (k) {
        const h = obj[k];
        if (h && h.date) map[h.date] = String(h.name || 'วันหยุดร้าน');
      });
      storeHolidaysCache = map;
      if (callback) callback();
    }).catch(function () {
      storeHolidaysCache = storeHolidaysCache || {};
      if (callback) callback();
    });
  }

  function collectDayEvents(year, month, day, festivalsByDate) {
    const events = [];
    const info = getThaiLunarInfo(year, month, day);
    const key = pad2(month) + '-' + pad2(day);
    if (FIXED_HOLIDAYS[key]) events.push({ type: 'holiday', label: FIXED_HOLIDAYS[key] });
    const festival = festivalsByDate[year + '-' + pad2(month) + '-' + pad2(day)];
    if (festival) events.push({ type: 'holiday', label: festival });
    if (info.isWanPhra) {
      const phaseLabel = info.phase === 'waxing' ? 'ขึ้น' : 'แรม';
      events.push({ type: 'wanphra', label: 'วันพระ (' + phaseLabel + ' ' + info.lunarDay + ' ค่ำ)' });
    }
    const storeName = storeHolidaysCache[year + '-' + pad2(month) + '-' + pad2(day)];
    if (storeName) events.push({ type: 'store', label: 'วันหยุดร้าน: ' + storeName });
    return events;
  }

  function buildDayTitle(year, month, day, info, events) {
    const dt = new Date(year, month - 1, day);
    const dow = THAI_DAYS_FULL[dt.getDay()];
    const beYear = year + 543;
    const phaseLabel = info.phase === 'waxing' ? 'ขึ้น' : 'แรม';
    const monthRawLabel = info.monthRaw === 88 ? '8 หลัง' : info.month;
    let title = dow + 'ที่ ' + day + ' ' + THAI_MONTHS_FULL[month - 1] + ' ' + beYear +
      '\n' + phaseLabel + ' ' + info.lunarDay + ' ค่ำ เดือน ' + monthRawLabel;
    events.forEach(function (e) { title += '\n• ' + e.label; });
    return title.replace(/"/g, '&quot;');
  }


  function buildCalendarHtml(year, month, today) {
    const first = new Date(year, month - 1, 1);
    const startWeekday = first.getDay(); // 0=อาทิตย์
    const daysInMonth = new Date(year, month, 0).getDate();
    const beYear = year + 543;
    const monthName = THAI_MONTHS_FULL[month - 1];
    const festivalsByDate = getFestivalsByDate(year);

    // Header
    let header = '';
    for (let w = 0; w < 7; w++) {
      const cls = 'hc-weekday' + (w === 0 ? ' sun' : w === 6 ? ' sat' : '');
      header += '<div class="' + cls + '">' + THAI_DAYS_SHORT[w] + '</div>';
    }

    // Cells
    let cells = '';
    for (let i = 0; i < startWeekday; i++) cells += '<div class="hc-day empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const info = getThaiLunarInfo(year, month, d);
      const events = collectDayEvents(year, month, d, festivalsByDate);
      const hasHoliday = events.some(function (e) { return e.type === 'holiday'; });
      const hasWanPhra = events.some(function (e) { return e.type === 'wanphra'; });
      const hasStore = events.some(function (e) { return e.type === 'store'; });
      const isToday = d === today.day && month === today.month && year === today.year;

      let cls = 'hc-day';
      if (isToday) cls += ' hc-today';
      if (hasHoliday) cls += ' hc-holiday';
      else if (hasWanPhra) cls += ' hc-wanphra';
      else if (hasStore) cls += ' hc-store';
      const dow = new Date(year, month - 1, d).getDay();
      if (dow === 0) cls += ' sun';
      else if (dow === 6) cls += ' sat';

      const phaseLabel = info.phase === 'waxing' ? 'ขึ้น' : 'แรม';
      const sub = phaseLabel + ' ' + info.lunarDay;

      let dots = '';
      if (hasHoliday) dots += '<span class="hc-dot hc-dot-holiday"></span>';
      if (hasWanPhra) dots += '<span class="hc-dot hc-dot-wanphra"></span>';
      if (hasStore) dots += '<span class="hc-dot hc-dot-store"></span>';

      const title = buildDayTitle(year, month, d, info, events);
      cells += '<div class="' + cls + '" title="' + title + '">' +
        '<div class="hc-day-num">' + d + '</div>' +
        '<div class="hc-day-sub">' + sub + '</div>' +
        '<div class="hc-day-dots">' + dots + '</div>' +
        '</div>';
    }
    const totalCells = startWeekday + daysInMonth;
    const trailing = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 0; i < trailing; i++) cells += '<div class="hc-day empty"></div>';

    // List
    let listHtml = '<div class="hc-list-title">📌 วันหยุด / วันพระในเดือนนี้</div>';
    const listRows = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const events = collectDayEvents(year, month, d, festivalsByDate);
      if (events.length === 0) continue;
      const dt = new Date(year, month - 1, d);
      const dateLabel = THAI_DAYS_SHORT[dt.getDay()] + '. ' + d + ' ' + THAI_MONTHS_SHORT[month - 1];
      let chips = '';
      events.forEach(function (e) {
        const chipCls = e.type === 'holiday' ? 'hc-chip-holiday' : (e.type === 'wanphra' ? 'hc-chip-wanphra' : 'hc-chip-store');
        chips += '<span class="hc-list-chip ' + chipCls + '">' + e.label + '</span>';
      });
      listRows.push('<div class="hc-list-item"><span class="hc-list-date">' + dateLabel + '</span><span>' + chips + '</span></div>');
    }
    listHtml += listRows.length ? listRows.join('') : '<div class="no-data">ไม่พบวันหยุดในเดือนนี้</div>';

    return '' +
      '<div class="holiday-calendar-wrap">' +
        '<div class="holiday-calendar-header">' +
          '<button class="btn-admin btn-admin-outline btn-admin-sm" onclick="adminCalendarPrevMonth()">◀ ก่อนหน้า</button>' +
          '<div class="holiday-calendar-title">เดือน ' + monthName + ' ' + beYear + '</div>' +
          '<button class="btn-admin btn-admin-outline btn-admin-sm" onclick="adminCalendarNextMonth()">ถัดไป ▶</button>' +
          '<button class="btn-admin btn-admin-outline btn-admin-sm" onclick="adminCalendarGoToday()">วันนี้</button>' +
        '</div>' +
        '<div class="holiday-calendar-legend">' +
          '<span><i class="hc-dot hc-dot-holiday"></i> วันหยุดสำคัญ</span>' +
          '<span><i class="hc-dot hc-dot-wanphra"></i> วันพระ</span>' +
          '<span><i class="hc-dot hc-dot-store"></i> วันหยุดร้าน</span>' +
          '<span><i class="hc-dot hc-dot-today"></i> วันนี้</span>' +
        '</div>' +
        '<div class="holiday-calendar-grid">' + header + cells + '</div>' +
        '<div class="holiday-calendar-list">' + listHtml + '</div>' +
      '</div>';
  }

function renderAdminHolidayCalendar() {
    const root = document.getElementById('adminHolidayCalendarRoot');
    if (!root) return;
    const today = getTodayLocal();
    if (displayYear === null || displayMonth === null) {
      displayYear = today.year;
      displayMonth = today.month;
    }
    root.innerHTML = '<div class="no-data" style="text-align:center; padding:15px;">กำลังโหลดปฏิทิน...</div>';
    loadStoreHolidays(function () {
      root.innerHTML = buildCalendarHtml(displayYear, displayMonth, today);
    });
  }

  function adminCalendarPrevMonth() {
    if (displayMonth === 1) { displayMonth = 12; displayYear -= 1; } else { displayMonth -= 1; }
    renderAdminHolidayCalendar();
  }

  function adminCalendarNextMonth() {
    if (displayMonth === 12) { displayMonth = 1; displayYear += 1; } else { displayMonth += 1; }
    renderAdminHolidayCalendar();
  }

  function adminCalendarGoToday() {
    const t = getTodayLocal();
    displayYear = t.year;
    displayMonth = t.month;
    renderAdminHolidayCalendar();
  }

  // ===========================================================================
  // Exports
  // ===========================================================================
  window.PinThipSafe = window.PinThipSafe || {};
  window.PinThipSafe.adminCalendar = {
    getThaiLunarInfo: getThaiLunarInfo,
    getFestivalsByDate: getFestivalsByDate,
    gregorianToJulianDay: gregorianToJulianDay,
    renderAdminHolidayCalendar: renderAdminHolidayCalendar,
    adminCalendarPrevMonth: adminCalendarPrevMonth,
    adminCalendarNextMonth: adminCalendarNextMonth,
    adminCalendarGoToday: adminCalendarGoToday
  };
  window.renderAdminHolidayCalendar = renderAdminHolidayCalendar;
  window.adminCalendarPrevMonth = adminCalendarPrevMonth;
  window.adminCalendarNextMonth = adminCalendarNextMonth;
  window.adminCalendarGoToday = adminCalendarGoToday;
})();