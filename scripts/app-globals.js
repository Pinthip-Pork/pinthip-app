/**
 * app-globals.js — Firebase init, global variables, core utilities
 * Extracted from index.html inline script
 */

// ===== Firebase Init =====
firebase.initializeApp(window.PinThipSafe.config.firebaseConfig);
var db = firebase.database();
window.db = db;

// ===== Global State =====
var currentLang = 'TH';
var currentUser = null;
var isAdmin = false;
window.currentLang = currentLang;
window.currentUser = currentUser;
window.isAdmin = isAdmin;

// ===== References to modules =====
var i18n = window.PinThipSafe.i18n;
window.i18n = i18n;

// ===== Utility Functions =====
function safeText(value) {
  return window.PinThipSafe?.escapeHtml?.(value) ?? String(value ?? '');
}

function setStatusText(elementId, message) {
  var el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = String(message ?? '');
}

var getLocalDateTimeString = window.PinThipSafe.utils.getLocalDateTimeString;
var downloadCSV = window.PinThipSafe.utils.downloadCSV;
window.getLocalDateTimeString = getLocalDateTimeString;
window.downloadCSV = downloadCSV;

// ===== Pull-to-Refresh (touch events) =====
function shouldIgnorePullRefreshTouch(target) {
  if (!target || typeof target.closest !== 'function') return false;
  return !!target.closest('#foamCustomerList, .drawer-menu, .modal-overlay, .modal-box');
}

(function() {
  var touchStartY = 0;
  window.addEventListener('touchstart', function(e) {
    if (window.scrollY === 0 && !shouldIgnorePullRefreshTouch(e.target)) {
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchmove', function(e) {
    if (window.scrollY === 0 && !shouldIgnorePullRefreshTouch(e.target)) {
      var touchY = e.touches[0].clientY;
      var diff = touchY - touchStartY;
      var indicator = document.getElementById('pullRefreshIndicator');
      if (diff > 70 && indicator) {
        indicator.style.top = '10px';
        indicator.innerText = "\uD83D\uDD04 \u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E21\u0E37\u0E2D\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A...";
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', function(e) {
    var indicator = document.getElementById('pullRefreshIndicator');
    if (window.scrollY === 0 && !shouldIgnorePullRefreshTouch(e.target) && indicator && indicator.style.top === '10px') {
      indicator.innerText = "\u23F3 \u0E01\u0E33\u0E25\u0E31\u0E07\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25...";
      setTimeout(function() {
        window.location.reload();
      }, 500);
    } else if (indicator) {
      indicator.style.top = '-45px';
    }
  });
})();

// ===== Visibility Change =====
document.addEventListener("visibilitychange", function() {
  if (document.visibilityState === "visible") {
    if (typeof checkCurrentDeviceAccess === 'function') {
      checkCurrentDeviceAccess();
    }
    console.log("App resumed, keeping current state.");
  }
});

// ===== Drawer Menu =====
function toggleDrawer(open) {
  var drawer = document.getElementById('drawerMenu');
  var overlay = document.getElementById('drawerOverlay');
  if (open) {
    drawer.classList.add('open');
    overlay.style.display = 'block';
  } else {
    drawer.classList.remove('open');
    overlay.style.display = 'none';
  }
}

// ===== Language & Navigation =====
function setLanguage(lang) {
  currentLang = lang;
  window.currentLang = lang;
  document.getElementById('btnTH').classList.toggle('active', lang === 'TH');
  document.getElementById('btnMM').classList.toggle('active', lang === 'MM');
  document.getElementById('companyTitle').innerText = i18n[lang].companyTitle;
  document.getElementById('listTitle').innerText = i18n[lang].listTitle;

  if (isAdmin) {
    if (typeof showAdminDashboard === 'function') showAdminDashboard();
  } else if (currentUser) {
    if (typeof showDashboard === 'function') showDashboard();
  } else {
    if (typeof showLoginForm === 'function') showLoginForm();
  }
}

// ===== Modal =====
function showModal(title, text, customHtml, btnsHtml) {
  document.getElementById('modalBoxContainer').classList.remove('modal-wide');
  document.getElementById('modalTitle').innerText = title;
  document.getElementById('modalText').innerText = text;
  document.getElementById('modalCustomContent').innerHTML = customHtml || '';
  document.getElementById('modalBtns').innerHTML = btnsHtml || '';
  document.getElementById('customModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modalBoxContainer').classList.remove('modal-wide');
  document.getElementById('customModal').style.display = 'none';
}

function openWideModal(title, customHtml, btnsHtml) {
  document.getElementById('modalTitle').innerText = title;
  document.getElementById('modalText').innerText = "";
  document.getElementById('modalCustomContent').innerHTML = customHtml;
  document.getElementById('modalBtns').innerHTML = btnsHtml || '';
  document.getElementById('modalBoxContainer').classList.add('modal-wide');
  document.getElementById('customModal').style.display = 'flex';
}

// ===== Device Info Helper =====
function getDeviceInfo() {
  return window.PinThipSafe.utils.getDeviceInfo();
}

// ===== Login Form =====
// NOTE: depends on notification.js, device-access.js loaded first
function showLoginForm() {
  isAdmin = false;
  window.isAdmin = false;
  document.getElementById('mainCard').classList.remove('admin-wide');
  document.getElementById('hamburgerBtn').style.display = 'none';
  document.getElementById('bellBtn').style.display = 'none';
  if (typeof showNotificationSoundControl === 'function') showNotificationSoundControl(false);
  if (typeof showDesktopNotificationControl === 'function') showDesktopNotificationControl(false);
  var t = i18n[currentLang];
  document.getElementById('pageTitle').innerText = t.pageTitleLogin;
  document.getElementById('status').innerText = "";
  document.getElementById('listBox').style.display = "none";
  document.getElementById('mainContent').innerHTML = window.PinThipSafe.employeeDashboard.buildLoginHtml(t);
}

function resetExpiredAuthSession() {
  if (typeof stopDeviceAccessGuard === 'function') stopDeviceAccessGuard();
  if (typeof stopDevicePresence === 'function') stopDevicePresence();
  currentUser = null;
  window.currentUser = null;
  isAdmin = false;
  window.isAdmin = false;
  PinThipSafe.session.clearAuthState();
}

function requireFirebaseAuth() {
  var firebaseUser = firebase.auth().currentUser;
  if (firebaseUser) return true;

  console.warn('Firebase Auth session is required before accessing protected data.');
  resetExpiredAuthSession();
  if (typeof showLoginForm === 'function') showLoginForm();
  window.alert('เซสชันเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  return false;
}

window.PinThipSafe.requireFirebaseAuth = requireFirebaseAuth;

// ===== Init App =====
function initApp() {
  var isInitialAuthState = true;
  firebase.auth().onAuthStateChanged(function(firebaseUser) {
    if (!isInitialAuthState) {
      if (!firebaseUser) {
        console.warn('Firebase Auth session ended');
        resetExpiredAuthSession();
        if (typeof showLoginForm === 'function') showLoginForm();
      }
      return;
    }
    isInitialAuthState = false;

    try {
      var restored = PinThipSafe.session.restoreSession();

      if (restored.isAdmin) {
        if (firebaseUser) {
          isAdmin = true;
          window.isAdmin = true;
          currentUser = null;
          window.currentUser = null;
          if (typeof showNotificationSoundControl === 'function') showNotificationSoundControl(true);
          if (typeof showDesktopNotificationControl === 'function') showDesktopNotificationControl(true);
          if (typeof startDevicePresence === 'function') {
            startDevicePresence('admin-' + window.PinThipSafe.utils.getDeviceId(), 'Admin', 'admin');
          }
          if (typeof startDeviceAccessGuard === 'function') startDeviceAccessGuard();
          if (typeof showAdminDashboard === 'function') showAdminDashboard();
          if (typeof startAdminNotificationListener === 'function') startAdminNotificationListener();
        } else {
          console.warn('Admin Firebase Auth session expired');
          resetExpiredAuthSession();
          if (typeof showLoginForm === 'function') showLoginForm();
        }
      } else if (firebaseUser && restored.currentUser && restored.currentUser.empId) {
        currentUser = restored.currentUser;
        window.currentUser = currentUser;
        isAdmin = false;
        window.isAdmin = false;
        if (typeof showNotificationSoundControl === 'function') showNotificationSoundControl(true);
        if (typeof showDesktopNotificationControl === 'function') showDesktopNotificationControl(true);
        if (typeof startDevicePresence === 'function') {
          startDevicePresence(window.PinThipSafe.utils.getDeviceId(), currentUser.empName, 'employee');
        }
        if (typeof showDashboard === 'function') showDashboard();
        if (typeof startDeviceAccessGuard === 'function') startDeviceAccessGuard();
        if (typeof startEmployeeNotificationListener === 'function') startEmployeeNotificationListener();
      } else {
        if (restored.currentUser && !firebaseUser) console.warn('Employee Firebase Auth session expired');
        resetExpiredAuthSession();
        if (typeof showLoginForm === 'function') showLoginForm();
      }
    } catch (e) {
      console.warn('Init app failed:', e);
      resetExpiredAuthSession();
      if (typeof showLoginForm === 'function') showLoginForm();
    }
  });
}
