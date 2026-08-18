/**
 * app-globals.js — Firebase init, global variables, core utilities
 * Extracted from index.html inline script
 */

// ===== Firebase Init =====
firebase.initializeApp(window.PinThipSafe.config.firebaseConfig);
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
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
  // Ignore inside modals, drawer, list containers, foam customer list
  if (target.closest('#foamCustomerList, .drawer-menu, .modal-overlay, .modal-box, .list-box')) return true;
  // Ignore form elements to avoid accidental refresh when typing / scrolling within them
  if (target.closest('input, textarea, select, [contenteditable]')) return true;
  // Ignore scrollable containers (elements with overflow auto/scroll that aren't the body)
  var scrollable = target.closest('[style*="overflow"], [class*="scroll"], .list-box, .scroll-container');
  if (scrollable && scrollable.scrollHeight > scrollable.clientHeight + 20) return true;
  return false;
}

(function() {
  var touchStartY = 0;
  var touchStartX = 0;
  var isPulling = false;
  var PULL_THRESHOLD = 80;     // pixels to pull before trigger
  var SNAP_TOP = '12px';       // where indicator rests when ready to refresh
  var HIDDEN_TOP = '-50px';    // hidden position
  var indicator = document.getElementById('pullRefreshIndicator');

  if (!indicator) return;

  // Helper: show/hide indicator and update text
  function resetIndicator(immediate) {
    isPulling = false;
    indicator.style.top = HIDDEN_TOP;
    if (immediate) indicator.style.transition = 'none';
    else indicator.style.transition = '';
  }

  window.addEventListener('touchstart', function(e) {
    if (window.scrollY > 2) return;
    if (shouldIgnorePullRefreshTouch(e.target)) return;
    var touch = e.touches[0];
    touchStartY = touch.clientY;
    touchStartX = touch.clientX;
    isPulling = false;
  }, { passive: true });

  window.addEventListener('touchmove', function(e) {
    if (window.scrollY > 2) {
      if (isPulling) resetIndicator();
      return;
    }
    if (shouldIgnorePullRefreshTouch(e.target)) {
      if (isPulling) resetIndicator();
      return;
    }

    var touch = e.touches[0];
    var diffY = touch.clientY - touchStartY;
    var diffX = Math.abs(touch.clientX - touchStartX);

    // Only activate if pulling downward (diffY > 0) and not swiping sideways
    if (diffY <= 0 || diffX > diffY * 1.5) {
      if (isPulling) resetIndicator();
      return;
    }

    isPulling = true;

    // Smooth follow: move indicator proportionally to finger
    var offset = Math.min(diffY * 0.5, 80);  // dampened follow, max 80px extra
    var currentTop = -50 + offset;
    indicator.style.transition = 'none';
    indicator.style.top = currentTop + 'px';

    if (diffY >= PULL_THRESHOLD) {
      indicator.innerText = '\uD83D\uDD04 \u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E21\u0E37\u0E2D\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A...';
    } else {
      indicator.innerText = '\u2B07\uFE0F \u0E14\u0E36\u0E07\u0E25\u0E07\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A';
    }
  }, { passive: true });

  window.addEventListener('touchend', function(e) {
    if (!isPulling) return;

    var touch = e.changedTouches[0];
    var diffY = touch.clientY - touchStartY;

    if (diffY >= PULL_THRESHOLD) {
      // Trigger refresh
      indicator.innerText = '\u23F3 \u0E01\u0E33\u0E25\u0E31\u0E07\u0E23\u0E35\u0E40\u0E1F\u0E23\u0E0A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25...';
      indicator.style.transition = '';
      indicator.style.top = SNAP_TOP;
      setTimeout(function() {
        window.location.reload();
      }, 400);
    } else {
      // Snap back
      resetIndicator();
    }

    isPulling = false;
  }, { passive: true });

  // On window resize or orientation change, reset indicator if stuck
  window.addEventListener('resize', function() {
    if (indicator.style.top !== HIDDEN_TOP && !isPulling) {
      resetIndicator(true);
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
  document.getElementById('modalBoxContainer').classList.remove('modal-wide', 'modal-medium');
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

  // Try to recover the session using stored credentials before giving up
  var stored = PinThipSafe.session.getStoredSession();
  if (stored) {
    recoverFirebaseSession().then(function(recovered) {
      if (recovered) {
        console.log('Session recovered in requireFirebaseAuth.');
        // Re-render the appropriate dashboard
        var restored = PinThipSafe.session.restoreSession();
        if (restored.isAdmin) {
          isAdmin = true;
          window.isAdmin = true;
          currentUser = null;
          window.currentUser = null;
          if (typeof showAdminDashboard === 'function') showAdminDashboard();
        } else if (restored.currentUser && restored.currentUser.empId) {
          currentUser = restored.currentUser;
          window.currentUser = currentUser;
          isAdmin = false;
          window.isAdmin = false;
          if (typeof showDashboard === 'function') showDashboard();
        }
      } else {
        console.warn('Firebase Auth session is required before accessing protected data.');
        resetExpiredAuthSession();
        if (typeof showLoginForm === 'function') showLoginForm();
        window.alert('เซสชันเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่');
      }
    });
    return false;
  }

  console.warn('Firebase Auth session is required before accessing protected data.');
  resetExpiredAuthSession();
  if (typeof showLoginForm === 'function') showLoginForm();
  window.alert('เซสชันเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  return false;
}

window.PinThipSafe.requireFirebaseAuth = requireFirebaseAuth;

// ===== Session Recovery =====
async function recoverFirebaseSession() {
  var stored = PinThipSafe.session.getStoredSession();
  if (!stored) return false;

  try {
    var deviceId = window.PinThipSafe.utils.getDeviceId();
    var deviceInfo = window.PinThipSafe.utils.getDeviceInfo();

    if (stored.isAdmin && stored.credentials && stored.credentials.username && stored.credentials.pin) {
      // Re-authenticate admin
      var adminCallable = firebase.functions().httpsCallable('adminLogin');
      var adminResult = await adminCallable({
        username: stored.credentials.username,
        pin: stored.credentials.pin,
        deviceId: deviceId,
        deviceInfo: deviceInfo
      });
      await firebase.auth().signInWithCustomToken(adminResult.data.token);
      console.log('Admin session recovered successfully.');
      return true;
    }

    if (!stored.isAdmin && stored.credentials && stored.credentials.empId && stored.credentials.pin) {
      // Re-authenticate employee
      var callable = firebase.functions().httpsCallable('loginWithPin');
      var result = await callable({
        empId: stored.credentials.empId,
        pin: stored.credentials.pin,
        deviceId: deviceId,
        deviceInfo: deviceInfo
      });
      await firebase.auth().signInWithCustomToken(result.data.token);
      console.log('Employee session recovered successfully.');
      return true;
    }
  } catch (e) {
    console.warn('Session recovery failed:', e);
  }

  return false;
}

// ===== Init App =====
function initApp() {
  var isInitialAuthState = true;

  // Proactive token refresh every 45 minutes to keep Firebase Auth session alive
  // (Firebase custom tokens have a 1-hour TTL; refreshing before expiry prevents silent logout)
  setInterval(function() {
    var cu = firebase.auth().currentUser;
    if (cu) {
      cu.getIdToken(true).catch(function(e) {
        console.warn('Proactive token refresh failed:', e);
      });
    }
  }, 45 * 60 * 1000);

  firebase.auth().onIdTokenChanged(function(firebaseUser) {
    if (!isInitialAuthState) {
      if (!firebaseUser) {
        console.warn('Firebase Auth session dropped \u2014 attempting recovery...');
        // Try to force a token refresh before clearing the session.
        // This handles transient failures and iOS PWA IndexedDB issues:
        // firebase.auth().currentUser may still be in memory even when
        // onIdTokenChanged fires with null, so we try to recover first.
        var curUser = firebase.auth().currentUser;
        if (curUser) {
          curUser.getIdToken(true).then(function() {
            console.log('Session recovered after token refresh.');
          }).catch(function(err) {
            console.warn('Token refresh recovery failed:', err);
            // Try to re-authenticate using stored credentials
            recoverFirebaseSession().then(function(recovered) {
              if (!recovered) {
                resetExpiredAuthSession();
                if (typeof showLoginForm === 'function') showLoginForm();
              }
            });
          });
        } else {
          // No currentUser in memory — try to re-authenticate using stored credentials
          recoverFirebaseSession().then(function(recovered) {
            if (!recovered) {
              console.warn('Firebase Auth session ended (no currentUser).');
              resetExpiredAuthSession();
              if (typeof showLoginForm === 'function') showLoginForm();
            }
          });
        }
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
          if (typeof startDevicePresence === 'function') {
            startDevicePresence('admin-' + window.PinThipSafe.utils.getDeviceId(), 'Admin', 'admin');
          }
          if (typeof startDeviceAccessGuard === 'function') startDeviceAccessGuard();
          if (typeof showAdminDashboard === 'function') showAdminDashboard();
          if (typeof startAdminNotificationListener === 'function') startAdminNotificationListener();
        } else {
          // Admin session stored but Firebase Auth not yet ready — try to recover
          console.warn('Admin Firebase Auth session expired, attempting recovery...');
          recoverFirebaseSession().then(function(recovered) {
            if (!recovered) {
              resetExpiredAuthSession();
              if (typeof showLoginForm === 'function') showLoginForm();
            }
          });
        }
      } else if (restored.currentUser && restored.currentUser.empId) {
        if (firebaseUser) {
          currentUser = restored.currentUser;
          window.currentUser = currentUser;
          isAdmin = false;
          window.isAdmin = false;
          if (typeof showNotificationSoundControl === 'function') showNotificationSoundControl(true);
          if (typeof startDevicePresence === 'function') {
            startDevicePresence(window.PinThipSafe.utils.getDeviceId(), currentUser.empName, 'employee');
          }
          if (typeof showDashboard === 'function') showDashboard();
          if (typeof startDeviceAccessGuard === 'function') startDeviceAccessGuard();
          if (typeof startEmployeeNotificationListener === 'function') startEmployeeNotificationListener();
        } else {
          // Employee session stored but Firebase Auth not yet ready — try to recover
          console.warn('Employee Firebase Auth session expired, attempting recovery...');
          recoverFirebaseSession().then(function(recovered) {
            if (!recovered) {
              resetExpiredAuthSession();
              if (typeof showLoginForm === 'function') showLoginForm();
            }
          });
        }
      } else {
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
