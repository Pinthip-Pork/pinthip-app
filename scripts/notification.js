/**
 * notification.js — Sound notification, bell badge management
 * Extracted from index.html inline script
 */

// ===== Notification State =====
var notificationAudioContext = null;
var notificationSoundEnabled = localStorage.getItem('pinthip_notification_sound') !== 'off';

// ===== Notification Sound Controls =====
function updateNotificationSoundButton() {
  var soundBtn = document.getElementById('soundBtn');
  if (!soundBtn) return;
  soundBtn.innerText = notificationSoundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07';
  soundBtn.title = notificationSoundEnabled ? '\u0E1B\u0E34\u0E14\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19' : '\u0E40\u0E1B\u0E34\u0E14\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19';
  soundBtn.setAttribute('aria-label', soundBtn.title);
}

function showNotificationSoundControl(visible) {
  var soundBtn = document.getElementById('soundBtn');
  if (soundBtn) soundBtn.style.display = visible ? 'block' : 'none';
  updateNotificationSoundButton();
}

function getNotificationAudioContext() {
  if (!notificationAudioContext) {
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    notificationAudioContext = new AudioContextClass();
  }
  return notificationAudioContext;
}

function enableNotificationSound() {
  var audioContext = getNotificationAudioContext();
  if (!audioContext) return;
  if (audioContext.state === 'suspended') audioContext.resume().catch(function() {});
}

function toggleNotificationSound() {
  notificationSoundEnabled = !notificationSoundEnabled;
  localStorage.setItem('pinthip_notification_sound', notificationSoundEnabled ? 'on' : 'off');
  updateNotificationSoundButton();
  if (notificationSoundEnabled) {
    enableNotificationSound();
    playNotificationSound();
  }
}

function playNotificationSound() {
  if (!notificationSoundEnabled) return;
  try {
    var audioCtx = getNotificationAudioContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(function() {});

    // Play a two-tone chat-like notification sound (louder)
    var now = audioCtx.currentTime;

    // First tone - higher pitch
    var osc1 = audioCtx.createOscillator();
    var gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.setValueAtTime(1200, now + 0.1);
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Second tone - slightly delayed for the "ding-ding" effect
    var osc2 = audioCtx.createOscillator();
    var gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1000, now + 0.15);
    osc2.frequency.setValueAtTime(1400, now + 0.25);
    gain2.gain.setValueAtTime(0.5, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.4);
  } catch (e) {
    // AudioContext not supported
  }
}

function playNotificationAlert(message) {
  // `message` is reserved for future logging/notification text use.
  void message;
  if (notificationSoundEnabled) playNotificationSound();
}

// ===== Desktop Notifications (keep sending, no UI button) =====
function isWindowsBrowser() {
  var ua = navigator.userAgent;
  return /Windows NT/i.test(ua) && /Chrome|Edg\//i.test(ua) && !/OPR\//i.test(ua);
}

function showDesktopNotification(title, body) {
  if (!isWindowsBrowser() || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body: body, icon: './icon-192.png', tag: 'pinthip-notification' });
  } catch (error) {
    console.warn('Desktop notification failed:', error);
  }
}