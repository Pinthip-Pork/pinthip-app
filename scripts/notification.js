/**
 * notification.js — Sound, desktop notification, bell badge management
 * Extracted from index.html inline script
 */

// ===== Notification State =====
var notificationAudioContext = null;
var notificationMode = localStorage.getItem('pinthip_notification_mode') || (localStorage.getItem('pinthip_notification_sound') === 'off' ? 'off' : 'beep');
var desktopNotificationsEnabled = localStorage.getItem('pinthip_desktop_notifications') === 'on';

// ===== Notification Sound Controls =====
function updateNotificationSoundButton() {
  var soundBtn = document.getElementById('soundBtn');
  if (!soundBtn) return;
  soundBtn.innerText = notificationMode === 'off' ? '\uD83D\uDD07' : (notificationMode === 'voice' ? '\uD83D\uDDE3\uFE0F' : '\uD83D\uDD0A');
  soundBtn.title = '\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19';
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
  var options = '\u003Cdiv style=\"display:grid; gap:8px;\"\u003E' +
    '\u003Cbutton class=\"btn-blue\" onclick=\"changeNotificationMode(\'off\'); closeModal();\"\u003E\uD83D\uDD07 \u0E1B\u0E34\u0E14\u0E40\u0E2A\u0E35\u0E22\u0E07\u003C/button\u003E' +
    '\u003Cbutton class=\"btn-blue\" onclick=\"changeNotificationMode(\'beep\'); closeModal();\"\u003E\uD83D\uDD14 \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E18\u0E23\u0E23\u0E21\u0E14\u0E32\u003C/button\u003E' +
    '\u003Cbutton class=\"btn-blue\" onclick=\"changeNotificationMode(\'voice\'); closeModal();\"\u003E\uD83D\uDDE3\uFE0F \u0E40\u0E2A\u0E35\u0E22\u0E07\u0E1E\u0E39\u0E14\u003C/button\u003E' +
    '\u003C/div\u003E';
  showModal('\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19', '\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23', options);
}

function changeNotificationMode(mode) {
  notificationMode = ['off', 'beep', 'voice'].indexOf(mode) !== -1 ? mode : 'beep';
  localStorage.setItem('pinthip_notification_mode', notificationMode);
  updateNotificationSoundButton();
  if (notificationMode !== 'off') {
    enableNotificationSound();
    playNotificationAlert('\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E40\u0E2A\u0E35\u0E22\u0E07\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19');
  }
}

function playNotificationSound() {
  if (notificationMode !== 'beep') return;
  try {
    var audioCtx = getNotificationAudioContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(function() {});
    var oscillator = audioCtx.createOscillator();
    var gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    console.log("AudioContext blocked or not supported", e);
  }
}

function speakNotification(message) {
  if (notificationMode !== 'voice' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  var utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = 'th-TH';
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function playNotificationAlert(message) {
  if (notificationMode === 'beep') playNotificationSound();
  if (notificationMode === 'voice') speakNotification(message);
}

// ===== Desktop Notifications (Windows) =====
function isWindowsBrowser() {
  var ua = navigator.userAgent;
  return /Windows NT/i.test(ua) && /Chrome|Edg\//i.test(ua) && !/OPR\//i.test(ua);
}

function updateDesktopNotificationButton() {
  var button = document.getElementById('desktopNotificationBtn');
  if (!button) return;
  button.innerText = desktopNotificationsEnabled ? '\uD83D\uDDA5\uFE0F' : '\uD83D\uDD15';
  button.title = desktopNotificationsEnabled ? '\u0E1B\u0E34\u0E14\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19 Windows' : '\u0E40\u0E1B\u0E34\u0E14\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19 Windows';
  button.setAttribute('aria-label', button.title);
}

function showDesktopNotificationControl(visible) {
  var button = document.getElementById('desktopNotificationBtn');
  if (!button) return;
  var supported = isWindowsBrowser() && 'Notification' in window;
  button.style.display = visible && supported ? 'block' : 'none';
  updateDesktopNotificationButton();
}

async function enableDesktopNotifications() {
  if (!isWindowsBrowser() || !('Notification' in window)) return;
  if (Notification.permission === 'denied') {
    showModal('\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19 Windows', 'Browser \u0E16\u0E39\u0E01\u0E1B\u0E34\u0E14\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E44\u0E27\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E1B\u0E34\u0E14\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E08\u0E32\u0E01\u0E44\u0E2D\u0E04\u0E2D\u0E19\u0E23\u0E39\u0E1B\u0E01\u0E38\u0E0D\u0E41\u0E08\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E27\u0E47\u0E1A', '\u003Cbutton class=\"btn-ok\" onclick=\"closeModal()\"\u003E\u0E15\u0E01\u0E25\u0E07\u003C/button\u003E');
    return;
  }
  var permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  desktopNotificationsEnabled = permission === 'granted';
  localStorage.setItem('pinthip_desktop_notifications', desktopNotificationsEnabled ? 'on' : 'off');
  updateDesktopNotificationButton();
  if (desktopNotificationsEnabled) showDesktopNotification('\u0E40\u0E1B\u0E34\u0E14\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19 Windows \u0E41\u0E25\u0E49\u0E27', '\u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E30\u0E41\u0E08\u0E49\u0E07\u0E40\u0E15\u0E37\u0E2D\u0E19\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E21\u0E35\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E43\u0E2B\u0E21\u0E48');
}

function showDesktopNotification(title, body) {
  if (!desktopNotificationsEnabled || !isWindowsBrowser() || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body: body, icon: './icon-192.png', tag: 'pinthip-notification' });
  } catch (error) {
    console.warn('Desktop notification failed:', error);
  }
}
