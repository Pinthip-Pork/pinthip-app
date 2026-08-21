/* global require, exports, Buffer */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onValueWritten } = require('firebase-functions/v2/database');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { getMessaging } = require('firebase-admin/messaging');
const crypto = require('crypto');

initializeApp();

// ===== PIN Hashing =====
// New format: "scrypt$<salt>$<hash>" — salt is random per user
// scrypt is a memory-hard KDF (slows brute-force significantly vs SHA-256)
const SCRYPT_PARAMS = {
  keyLength: 64,
  N: 16384,        // CPU/memory cost
  r: 8,            // block size
  p: 1             // parallelization
};

function hashPin(pin, salt) {
  const saltStr = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin).trim(), saltStr, SCRYPT_PARAMS.keyLength, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p
  }).toString('hex');
  return `scrypt$${saltStr}$${hash}`;
}

function verifyPin(inputPin, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = String(storedHash).split('$');
  if (parts.length !== 3) return false;
  const [algo, salt, expectedHash] = parts;
  const inputPinStr = String(inputPin).trim();

  let inputBuffer;
  if (algo === 'sha256') {
    // Legacy format (pre-scrypt) — still supported for backward compatibility
    inputBuffer = Buffer.from(crypto.createHash('sha256').update(`${salt}:${inputPinStr}`).digest('hex'), 'hex');
  } else if (algo === 'scrypt') {
    // New scrypt format
    inputBuffer = crypto.scryptSync(inputPinStr, salt, SCRYPT_PARAMS.keyLength, {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p
    });
  } else {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  if (expectedBuffer.length !== inputBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, inputBuffer);
}

function isPlainPin(value) {
  // Plain PIN is a short numeric/alpha string without the "scrypt$" prefix
  return typeof value === 'string' && !String(value).startsWith('scrypt$') && !String(value).startsWith('sha256$');
}

// ===== Rate Limiting =====
const RATE_LIMIT = {
  maxAttempts: 5,
  lockMs: 5 * 60 * 1000,        // 5 minutes
  maxAttemptsHard: 10,
  lockMsHard: 30 * 60 * 1000,   // 30 minutes
  cleanupAfterMs: 60 * 60 * 1000 // clean old entries after 1 hour
};

async function checkRateLimit(db, key) {
  const path = `login_attempts/${key}`;
  const snapshot = await db.ref(path).once('value');
  const data = snapshot.val() || { count: 0, firstAttemptAt: Date.now(), lockedUntil: 0 };

  const now = Date.now();

  // Clean up old entries
  if (data.firstAttemptAt && now - data.firstAttemptAt > RATE_LIMIT.cleanupAfterMs) {
    await db.ref(path).remove();
    return { allowed: true, remaining: RATE_LIMIT.maxAttempts };
  }

  // Check if currently locked
  if (data.lockedUntil && now < data.lockedUntil) {
    const waitMs = Math.ceil((data.lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSec: waitMs, message: `Too many failed attempts. Try again in ${Math.ceil(waitMs / 60)} minute(s).` };
  }

  return { allowed: true, remaining: Math.max(0, RATE_LIMIT.maxAttempts - (data.count || 0)) };
}

async function recordFailedAttempt(db, key) {
  const path = `login_attempts/${key}`;
  const snapshot = await db.ref(path).once('value');
  const data = snapshot.val() || { count: 0, firstAttemptAt: Date.now(), lockedUntil: 0 };

  const now = Date.now();
  const newCount = (data.count || 0) + 1;
  const update = {
    count: newCount,
    firstAttemptAt: data.firstAttemptAt || now,
    lastAttemptAt: now
  };

  // Apply lockout thresholds
  if (newCount >= RATE_LIMIT.maxAttemptsHard) {
    update.lockedUntil = now + RATE_LIMIT.lockMsHard;
    update.count = 0; // reset counter after hard lock
  } else if (newCount >= RATE_LIMIT.maxAttempts) {
    update.lockedUntil = now + RATE_LIMIT.lockMs;
    update.count = 0; // reset counter after soft lock
  }

  await db.ref(path).set(update);
}

async function clearRateLimit(db, key) {
  await db.ref(`login_attempts/${key}`).remove();
}

// ===== Session Tokens =====
const SESSION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function storeSessionToken(db, token, payload) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await db.ref(`session_tokens/${tokenHash}`).set({
    ...payload,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TOKEN_TTL_MS
  });
}

async function verifySessionToken(db, token) {
  if (!token || typeof token !== 'string') return null;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const snapshot = await db.ref(`session_tokens/${tokenHash}`).once('value');
  const data = snapshot.val();
  if (!data) return null;
  if (!data.expiresAt || data.expiresAt <= Date.now()) {
    await db.ref(`session_tokens/${tokenHash}`).remove();
    return null;
  }
  return data;
}

async function revokeSessionToken(db, token) {
  if (!token) return;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await db.ref(`session_tokens/${tokenHash}`).remove();
}

// ===== Helpers =====
function requireText(value, fieldName) {
  const text = String(value || '').trim();
  if (!text) {
    throw new HttpsError('invalid-argument', `${fieldName} is required.`);
  }
  return text;
}

function getEmployeeUid(empId) {
  const safeId = empId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `employee_${safeId}`.slice(0, 128);
}

function getAdminUid(username) {
  const hash = crypto.createHash('sha256').update(String(username || 'admin')).digest('hex').slice(0, 16);
  return `admin_${hash}`.slice(0, 128);
}

// ===== Login With PIN (Employee) =====
exports.loginWithPin = onCall(async (request) => {
  const empId = requireText(request.data?.empId, 'empId');
  const pin = requireText(request.data?.pin, 'pin');
  const deviceId = requireText(request.data?.deviceId, 'deviceId');
  const deviceInfo = String(request.data?.deviceInfo || 'Unknown device').slice(0, 120);

  const database = getDatabase();

  // Check rate limit for this employee
  const rateCheck = await checkRateLimit(database, `emp_${empId}`);
  if (!rateCheck.allowed) {
    throw new HttpsError('resource-exhausted', rateCheck.message);
  }

  const [employeesSnapshot, autoApproveSnapshot, deviceSnapshot] = await Promise.all([
    database.ref('employees').once('value'),
    database.ref('settings/deviceAccessAutoApprove').once('value'),
    database.ref(`device_access/${deviceId}`).once('value')
  ]);

  const employees = employeesSnapshot.val() || {};
  const foundEntry = Object.entries(employees).find(([, employee]) => (
    employee && String(employee.empId || '').trim() === empId
  ));
  const foundEmployee = foundEntry ? foundEntry[1] : null;

  // Verify PIN — supports both legacy plain PIN and new hashed PIN
  let pinValid = false;
  if (foundEmployee) {
    const storedPin = foundEmployee.pin;
    if (isPlainPin(storedPin)) {
      // Legacy: plain PIN stored — compare directly (will be migrated)
      pinValid = String(storedPin).trim() === String(pin).trim();
    } else {
      // New: hashed PIN
      pinValid = verifyPin(pin, storedPin);
    }
  }

  if (!foundEmployee || !pinValid) {
    await recordFailedAttempt(database, `emp_${empId}`);
    throw new HttpsError('unauthenticated', 'Invalid employee ID or PIN.');
  }

  const existingDevice = deviceSnapshot.val();
  if (existingDevice?.status === 'blocked') {
    // Log blocked device attempt
    const now = new Date().toISOString();
    const monthKey = now.slice(0, 7);
    await database.ref(`logs/device-access/${monthKey}`).push({
      type: 'blocked_login_attempt',
      deviceId,
      deviceInfo,
      empId,
      timestamp: now
    });
    throw new HttpsError('permission-denied', 'This device is blocked.');
  }
  if (existingDevice?.empId && String(existingDevice.empId) !== empId) {
    throw new HttpsError('permission-denied', 'This device is registered to another employee.');
  }

  const autoApprove = autoApproveSnapshot.val() === true;

  // If device already exists and is pending, throw (already saved before)
  if (existingDevice && existingDevice.status === 'pending') {
    throw new HttpsError('permission-denied', 'This device is waiting for admin approval.');
  }

  const uid = getEmployeeUid(empId);
  try {
    await getAuth().getUser(uid);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    await getAuth().createUser({
      uid,
      displayName: String(foundEmployee.empName || empId).slice(0, 100)
    });
  }

  // Save device record FIRST (so admin can see it even if pending)
  const now = new Date().toISOString();
  const status = existingDevice?.status || (autoApprove ? 'active' : 'pending');
  await database.ref(`device_access/${deviceId}`).update({
    uid,
    empId,
    empName: String(foundEmployee.empName || ''),
    deviceInfo,
    status,
    lastSeenAt: now
  });

  // Now throw if pending (device was just saved above)
  if (status === 'pending') {
    throw new HttpsError('permission-denied', 'This device is waiting for admin approval.');
  }

  // Clear rate limit on successful login
  await clearRateLimit(database, `emp_${empId}`);

  // Create custom token with short TTL (1 hour)
  const token = await getAuth().createCustomToken(uid, {
    role: String(foundEmployee.role || 'employee'),
    empId,
    deviceId
  });

  // Generate session token for persistent login (stored in localStorage instead of PIN)
  const sessionToken = generateSessionToken();
  await storeSessionToken(database, sessionToken, {
    type: 'employee',
    uid,
    empId,
    empName: String(foundEmployee.empName || ''),
    role: String(foundEmployee.role || 'employee'),
    deviceId
  });

  return { token, uid, empId, status, sessionToken };
});

// ===== Admin Login =====
exports.adminLogin = onCall(async (request) => {
  const auth = getAuth();
  const database = getDatabase();

  const username = requireText(request.data?.username, 'username');
  const pin = requireText(request.data?.pin, 'pin');
  const deviceId = requireText(request.data?.deviceId, 'deviceId');
  const deviceInfo = String(request.data?.deviceInfo || 'Unknown device').slice(0, 120);

  // Check rate limit for this admin
  const rateCheck = await checkRateLimit(database, `admin_${username}`);
  if (!rateCheck.allowed) {
    throw new HttpsError('resource-exhausted', rateCheck.message);
  }

  // Read admin config from the database
  const adminConfigSnapshot = await database.ref('settings/admin').once('value');
  let adminConfig = adminConfigSnapshot.val();

  // Check if this device is blocked
  const deviceSnapshot = await database.ref(`device_access/${deviceId}`).once('value');
  const existingDevice = deviceSnapshot.val();
  if (existingDevice?.status === 'blocked') {
    // Log blocked device attempt
    const now = new Date().toISOString();
    const monthKey = now.slice(0, 7);
    await database.ref(`logs/device-access/${monthKey}`).push({
      type: 'blocked_login_attempt',
      deviceId,
      deviceInfo,
      username,
      role: 'admin',
      timestamp: now
    });
    throw new HttpsError('permission-denied', 'This device is blocked. Contact another admin.');
  }

  // If no admin config exists in DB, allow one-time setup.
  // Prefer the setup payload from the client (local-admin-config.js), but
  // fall back to default admin/8888 so setup never depends on client cache.
  if (!adminConfig) {
    const setupUsername = String(request.data?.setup?.username || 'admin').trim();
    const setupPin = String(request.data?.setup?.pin || '8888').trim();

    if (setupPin.length < 4) {
      throw new HttpsError('invalid-argument', 'PIN must be at least 4 characters.');
    }
    if (setupUsername.length < 3) {
      throw new HttpsError('invalid-argument', 'Username must be at least 3 characters.');
    }

    adminConfig = {
      enabled: true,
      username: setupUsername,
      pin: hashPin(setupPin),
      // First device to set up becomes the root admin device
      approvedDevices: {
        [deviceId]: {
          approvedAt: Date.now(),
          deviceInfo,
          root: true
        }
      }
    };

    await database.ref('settings/admin').set(adminConfig);
  }

  if (!adminConfig.enabled) {
    throw new HttpsError('permission-denied', 'Admin login is disabled.');
  }

  const storedUsername = String(adminConfig.username || '').trim().toLowerCase();
  const storedPin = adminConfig.pin;

  if (String(username).trim().toLowerCase() !== storedUsername) {
    await recordFailedAttempt(database, `admin_${username}`);
    throw new HttpsError('unauthenticated', 'Invalid admin credentials.');
  }

  // Verify PIN — supports both legacy plain PIN and new hashed PIN
  let pinValid = false;
  if (isPlainPin(storedPin)) {
    // Legacy: plain PIN stored — compare directly (will be migrated)
    pinValid = String(storedPin).trim() === String(pin).trim();
  } else {
    // New: hashed PIN
    pinValid = verifyPin(pin, storedPin);
  }

  if (!pinValid) {
    await recordFailedAttempt(database, `admin_${username}`);
    throw new HttpsError('unauthenticated', 'Invalid admin credentials.');
  }

  // ===== Admin Device Lock (approvedDevices) =====
  // Even with valid PIN, only approved devices may log in as admin.
  // The first device (root) is auto-approved during setup.
  const approvedDevices = adminConfig.approvedDevices || {};
  const isApproved = Boolean(approvedDevices[deviceId]);

  if (!isApproved) {
    // Record this device as pending approval (so an existing admin can approve it)
    const now = new Date().toISOString();
    const monthKey = now.slice(0, 7);
    await database.ref(`settings/admin/pendingDevices/${deviceId}`).set({
      deviceInfo,
      requestedAt: Date.now(),
      lastAttemptAt: now
    });
    // Log the attempt
    await database.ref(`logs/device-access/${monthKey}`).push({
      type: 'admin_device_pending_approval',
      deviceId,
      deviceInfo,
      username,
      role: 'admin',
      timestamp: now
    });
    throw new HttpsError('permission-denied', 'This device is not approved for admin login. Contact an existing admin to approve it.');
  }

  // Clear rate limit on successful login
  await clearRateLimit(database, `admin_${username}`);

  // Ensure Firebase Auth user exists for admin
  const uid = getAdminUid(username);
  try {
    await auth.getUser(uid);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    await auth.createUser({
      uid,
      displayName: 'Admin',
      email: `admin-${uid}@pinthip-app.local`
    });
  }

  // Persist custom claims on the Auth user so they survive ID token refreshes.
  // Without this, role:'admin' only exists in the custom token and is lost
  // when Firebase auto-refreshes the ID token (~1 hour), causing database
  // permission errors on settings/admin/* paths.
  await auth.setCustomUserClaims(uid, {
    role: 'admin',
    username,
    deviceId
  });

  // Record device access for admin presence tracking
  const now = new Date().toISOString();
  await database.ref(`device_access/${deviceId}`).update({
    uid,
    empId: `admin-${username}`,
    empName: 'Admin',
    role: 'admin',
    deviceInfo,
    status: 'active',
    lastSeenAt: now
  });

  // Create custom token with admin role — short TTL (1 hour)
  const token = await auth.createCustomToken(uid, {
    role: 'admin',
    username,
    deviceId
  });

  // Generate session token for persistent login
  const sessionToken = generateSessionToken();
  await storeSessionToken(database, sessionToken, {
    type: 'admin',
    uid,
    username,
    role: 'admin',
    deviceId
  });

  return { token, uid, expiresIn: 3600, sessionToken };
});

// ===== Admin Device Management =====
// Approve a pending device as an admin device (only callable by an approved admin device)
exports.approveAdminDevice = onCall(async (request) => {
  const database = getDatabase();

  const deviceId = requireText(request.data?.deviceId, 'deviceId');
  const deviceInfo = String(request.data?.deviceInfo || 'Unknown device').slice(0, 120);

  // Verify the caller is an approved admin (auth.token.role === 'admin')
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'You must be logged in as an admin.');
  }
  const callerRole = String(request.auth?.token?.role || '');
  if (callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Only approved admins can approve devices.');
  }

  const adminConfigSnapshot = await database.ref('settings/admin').once('value');
  const adminConfig = adminConfigSnapshot.val();
  if (!adminConfig) {
    throw new HttpsError('failed-precondition', 'Admin is not set up yet.');
  }

  // Add to approvedDevices
  const approvedDevices = adminConfig.approvedDevices || {};
  if (approvedDevices[deviceId]) {
    throw new HttpsError('already-exists', 'This device is already approved.');
  }
  approvedDevices[deviceId] = {
    approvedAt: Date.now(),
    deviceInfo,
    root: false
  };

  await database.ref('settings/admin/approvedDevices').set(approvedDevices);
  await database.ref(`settings/admin/pendingDevices/${deviceId}`).remove();

  // Log the approval
  const now = new Date().toISOString();
  const monthKey = now.slice(0, 7);
  await database.ref(`logs/device-access/${monthKey}`).push({
    type: 'admin_device_approved',
    deviceId,
    deviceInfo,
    approvedBy: callerUid,
    timestamp: now
  });

  return { success: true, deviceId };
});

// Revoke an approved admin device (only callable by an approved admin device, cannot revoke root)
exports.revokeAdminDevice = onCall(async (request) => {
  const database = getDatabase();

  const deviceId = requireText(request.data?.deviceId, 'deviceId');

  // Verify the caller is an approved admin
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'You must be logged in as an admin.');
  }
  const callerRole = String(request.auth?.token?.role || '');
  if (callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Only approved admins can revoke devices.');
  }

  const adminConfigSnapshot = await database.ref('settings/admin').once('value');
  const adminConfig = adminConfigSnapshot.val();
  if (!adminConfig) {
    throw new HttpsError('failed-precondition', 'Admin is not set up yet.');
  }

  const approvedDevices = adminConfig.approvedDevices || {};
  if (!approvedDevices[deviceId]) {
    throw new HttpsError('not-found', 'This device is not approved.');
  }
  if (approvedDevices[deviceId].root) {
    throw new HttpsError('permission-denied', 'Cannot revoke the root admin device.');
  }

  delete approvedDevices[deviceId];
  await database.ref('settings/admin/approvedDevices').set(approvedDevices);

  // Also block the device in device_access so it can't use the session
  await database.ref(`device_access/${deviceId}`).update({
    status: 'blocked',
    blockedAt: Date.now()
  });

  // Log the revocation
  const now = new Date().toISOString();
  const monthKey = now.slice(0, 7);
  await database.ref(`logs/device-access/${monthKey}`).push({
    type: 'admin_device_revoked',
    deviceId,
    revokedBy: callerUid,
    timestamp: now
  });

  return { success: true, deviceId };
});

// ===== Refresh Session (re-auth without PIN) =====
exports.refreshSession = onCall(async (request) => {
  const sessionToken = requireText(request.data?.sessionToken, 'sessionToken');
  const deviceId = requireText(request.data?.deviceId, 'deviceId');

  const database = getDatabase();
  const session = await verifySessionToken(database, sessionToken);

  if (!session) {
    throw new HttpsError('unauthenticated', 'Session expired. Please log in again.');
  }

  // Verify device matches
  if (session.deviceId && session.deviceId !== deviceId) {
    throw new HttpsError('permission-denied', 'Session is bound to a different device.');
  }

  // Create fresh custom token
  let token;
  if (session.type === 'admin') {
    const uid = getAdminUid(session.username);
    // Ensure custom claims persist across ID token refreshes
    await getAuth().setCustomUserClaims(uid, {
      role: 'admin',
      username: session.username,
      deviceId
    });
    token = await getAuth().createCustomToken(uid, {
      role: 'admin',
      username: session.username,
      deviceId
    });
  } else {
    const uid = getEmployeeUid(session.empId);
    token = await getAuth().createCustomToken(uid, {
      role: session.role || 'employee',
      empId: session.empId,
      deviceId
    });
  }

  // Refresh session token expiry (sliding window)
  const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
  await database.ref(`session_tokens/${tokenHash}`).update({
    expiresAt: Date.now() + SESSION_TOKEN_TTL_MS,
    lastRefreshedAt: Date.now()
  });

  return {
    token,
    uid: session.uid,
    isAdmin: session.type === 'admin',
    empId: session.empId || null,
    username: session.username || null,
    role: session.role || 'employee'
  };
});

// ===== Logout (revoke session token) =====
exports.logout = onCall(async (request) => {
  const sessionToken = request.data?.sessionToken;
  if (sessionToken) {
    await revokeSessionToken(getDatabase(), sessionToken);
  }
  return { success: true };
});

// ===== Push Notification Helpers =====
// Core multicast sender — shared by admin & employee notification paths.
async function sendPushToTokens(tokens, title, body, tag) {
  if (!tokens || tokens.length === 0) return { sent: 0 };

  const message = {
    data: {
      title: String(title),
      body: String(body),
      tag: String(tag || 'pinthip-notification')
    },
    webpush: {
      notification: {
        title: String(title),
        body: String(body),
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: String(tag || 'pinthip-notification')
      }
    },
    tokens
  };

  try {
    const response = await getMessaging().sendEachForMulticast(message);
    return { sent: response.successCount, response };
  } catch (error) {
    console.warn('sendPushToTokens failed:', error);
    return { sent: 0 };
  }
}

// Prune invalid FCM tokens reported by the messaging API.
async function pruneInvalidTokens(database, devices, tokens, response) {
  if (!response) return;
  const invalidTokens = [];
  response.responses.forEach((resp, index) => {
    if (!resp.success && resp.error && (
      resp.error.code === 'messaging/invalid-registration-token' ||
      resp.error.code === 'messaging/registration-token-not-registered'
    )) {
      invalidTokens.push(tokens[index]);
    }
  });
  if (invalidTokens.length > 0) {
    await Promise.all(Object.entries(devices)
      .filter(([, device]) => device && invalidTokens.includes(String(device.fcmToken)))
      .map(([deviceId]) => database.ref(`device_access/${deviceId}/fcmToken`).remove()));
  }
}

// Notify every admin device that registered an FCM token.
async function notifyAdminDevices(title, body, tag) {
  const database = getDatabase();
  const snapshot = await database.ref('device_access').once('value');
  const devices = snapshot.val() || {};

  const tokens = Object.values(devices)
    .filter((device) => device && device.role === 'admin' && device.fcmToken && device.status !== 'blocked')
    .map((device) => String(device.fcmToken));

  const { sent, response } = await sendPushToTokens(tokens, title, body, tag);
  await pruneInvalidTokens(database, devices, tokens, response);
  return { sent };
}

// Notify the employee(s) who submitted a request — looks up device_access by empId.
async function notifyEmployeeDevice(empId, title, body, tag) {
  if (!empId) return { sent: 0 };
  const database = getDatabase();
  const snapshot = await database.ref('device_access').once('value');
  const devices = snapshot.val() || {};

  const tokens = Object.entries(devices)
    .filter(([, device]) => {
      return device &&
        device.role !== 'admin' &&
        String(device.empId || '') === String(empId) &&
        device.fcmToken &&
        device.status !== 'blocked';
    })
    .map(([, device]) => String(device.fcmToken));

  const { sent, response } = await sendPushToTokens(tokens, title, body, tag);
  await pruneInvalidTokens(database, devices, tokens, response);
  return { sent };
}

function isPendingStatus(status) {
  return String(status || '').includes('รออนุมัติ') || String(status || '').toLowerCase().includes('pending');
}

function isApprovedStatus(status) {
  const s = String(status || '');
  return s.includes('อนุมัติแล้ว') || s.toLowerCase() === 'approved';
}

function isRejectedStatus(status) {
  const s = String(status || '');
  return s.includes('ไม่อนุมัติ') || s.toLowerCase() === 'rejected' || s.toLowerCase() === 'cancelled';
}

// ===== Notification Triggers (Admin → new requests) =====
// Notify admins when an employee submits a leave request.
exports.onLeaveRequestCreated = onValueWritten({ ref: '/leaves/{key}', region: 'asia-southeast1', instance: 'pinthip-checkin-default-rtdb' }, async (event) => {
  const before = event.data.before.val();
  const after = event.data.after.val();

  // Only notify on NEW pending requests (not on status updates)
  if (!after || !isPendingStatus(after.status)) return;
  if (before && isPendingStatus(before.status)) return;

  const empName = String(after.empName || after.empId || 'พนักงาน');
  const leaveType = String(after.leaveType || after.type || 'ลา');
  await notifyAdminDevices(
    '🌴 คำขอลาใหม่รออนุมัติ',
    `${empName} ขอ${leaveType} — แตะเพื่อตรวจสอบ`,
    `leave-${event.params.key}`
  );
});

// Notify admins when an employee submits a fuel/repair request.
exports.onFuelRequestCreated = onValueWritten({ ref: '/fuel_requests/{key}', region: 'asia-southeast1', instance: 'pinthip-checkin-default-rtdb' }, async (event) => {
  const before = event.data.before.val();
  const after = event.data.after.val();

  if (!after || !isPendingStatus(after.status)) return;
  if (before && isPendingStatus(before.status)) return;

  const empName = String(after.empName || after.empId || 'พนักงาน');
  const requestType = String(after.requestType || 'เบิกค่าน้ำมัน/ค่าซ่อม');
  await notifyAdminDevices(
    '⛽ คำขอเบิกจ่ายใหม่รออนุมัติ',
    `${empName} — ${requestType} — แตะเพื่อตรวจสอบ`,
    `fuel-${event.params.key}`
  );
});

// Notify admins when staff submits a foam label delivery request.
exports.onFoamRequestCreated = onValueWritten({ ref: '/foam_delivery_requests/{dateKey}/{key}', region: 'asia-southeast1', instance: 'pinthip-checkin-default-rtdb' }, async (event) => {
  const before = event.data.before.val();
  const after = event.data.after.val();

  if (!after) return;
  const afterStatus = String(after.status || '').toLowerCase();
  if (afterStatus !== 'pending_review' && afterStatus !== 'pending_duplicate_approval') return;
  if (before) return; // only notify on new entries

  const customerName = String(
    (after.customerSnapshot && after.customerSnapshot.name) || after.customerName || 'ลูกค้าใหม่'
  );
  await notifyAdminDevices(
    '📦 รายการป้ายลังโฟมรอยืนยัน',
    `${customerName} — ${event.params.dateKey} — แตะเพื่อตรวจสอบ`,
    `foam-${event.params.dateKey}-${event.params.key}`
  );
});

// ===== Notification Triggers (Admin approval → Employee) =====
// Notify the employee when their leave request is approved or rejected.
exports.onLeaveStatusChanged = onValueWritten({ ref: '/leaves/{key}', region: 'asia-southeast1', instance: 'pinthip-checkin-default-rtdb' }, async (event) => {
  const before = event.data.before.val();
  const after = event.data.after.val();

  if (!after) return; // deleted
  const beforeStatus = String(before?.status || '');
  const afterStatus = String(after.status || '');

  // Only fire when transitioning FROM pending TO approved/rejected
  if (!isPendingStatus(beforeStatus)) return;
  if (!isApprovedStatus(afterStatus) && !isRejectedStatus(afterStatus)) return;

  const empId = String(after.empId || '');
  const empName = String(after.empName || empId || 'พนักงาน');
  const leaveType = String(after.leaveType || after.type || 'ลา');

  if (isApprovedStatus(afterStatus)) {
    await notifyEmployeeDevice(
      empId,
      '✅ คำขอลาได้รับการอนุมัติ',
      `${empName} — คำขอ${leaveType}ของคุณได้รับการอนุมัติแล้ว`,
      `leave-result-${event.params.key}`
    );
  } else {
    await notifyEmployeeDevice(
      empId,
      '❌ คำขอลาไม่อนุมัติ',
      `${empName} — คำขอ${leaveType}ของคุณไม่ได้รับการอนุมัติ กรุณาติดต่อแอดมิน`,
      `leave-result-${event.params.key}`
    );
  }
});

// Notify the employee when their fuel/repair request is approved or rejected.
exports.onFuelStatusChanged = onValueWritten({ ref: '/fuel_requests/{key}', region: 'asia-southeast1', instance: 'pinthip-checkin-default-rtdb' }, async (event) => {
  const before = event.data.before.val();
  const after = event.data.after.val();

  if (!after) return; // deleted
  const beforeStatus = String(before?.status || '');
  const afterStatus = String(after.status || '');

  // ===== Payment-status notification =====
  // Fires when the admin marks an approved request as "ได้รับเงินแล้ว"
  // (paid transitions from false/undefined -> true). This is a separate signal
  // from the approval/rejection notification below so the employee knows the
  // money has actually been handed over.
  const beforePaid = before && before.paid === true;
  const afterPaid = after.paid === true;
  if (!beforePaid && afterPaid) {
    const empId = String(after.empId || '');
    const empName = String(after.empName || empId || 'พนักงาน');
    const requestType = String(after.requestType || 'เบิกจ่าย');
    const amount = after.amount ? ` ${Number(after.amount).toLocaleString()} บาท` : '';
    await notifyEmployeeDevice(
      empId,
      '💰 ได้รับเงินค่าเบิกจ่ายแล้ว',
      `${empName} — ${requestType}${amount} — รับเงินแล้ว`,
      `fuel-paid-${event.params.key}`
    );
  }

  if (!isPendingStatus(beforeStatus)) return;
  if (!isApprovedStatus(afterStatus) && !isRejectedStatus(afterStatus)) return;

  const empId = String(after.empId || '');
  const empName = String(after.empName || empId || 'พนักงาน');
  const requestType = String(after.requestType || 'เบิกจ่าย');
  const amount = after.amount ? ` ${Number(after.amount).toLocaleString()} บาท` : '';

  if (isApprovedStatus(afterStatus)) {
    await notifyEmployeeDevice(
      empId,
      '✅ คำขอเบิกจ่ายได้รับการอนุมัติ',
      `${empName} — ${requestType}${amount} — อนุมัติแล้ว`,
      `fuel-result-${event.params.key}`
    );
  } else {
    await notifyEmployeeDevice(
      empId,
      '❌ คำขอเบิกจ่ายไม่อนุมัติ',
      `${empName} — ${requestType} — ไม่ได้รับการอนุมัติ กรุณาติดต่อแอดมิน`,
      `fuel-result-${event.params.key}`
    );
  }
});

// Notify the employee when their foam delivery request is approved or cancelled.
exports.onFoamStatusChanged = onValueWritten({ ref: '/foam_delivery_requests/{dateKey}/{key}', region: 'asia-southeast1', instance: 'pinthip-checkin-default-rtdb' }, async (event) => {
  const before = event.data.before.val();
  const after = event.data.after.val();

  if (!after) return; // deleted
  const beforeStatus = String(before?.status || '');
  const afterStatus = String(after.status || '').toLowerCase();

  // Only fire when transitioning from a pending state to approved/cancelled
  const wasPending = beforeStatus === 'pending_review' || beforeStatus === 'pending_duplicate_approval' || beforeStatus === '';
  if (!wasPending) return;
  if (afterStatus !== 'approved' && afterStatus !== 'cancelled') return;

  const empId = String(after.employeeId || after.empId || '');
  const customerName = String(
    (after.customerSnapshot && after.customerSnapshot.name) || after.customerName || 'ลูกค้า'
  );

  if (afterStatus === 'approved') {
    await notifyEmployeeDevice(
      empId,
      '✅ รายการป้ายลังโฟมได้รับการอนุมัติ',
      `${customerName} — ${event.params.dateKey} — อนุมัติแล้ว พร้อมพิมพ์ป้าย`,
      `foam-result-${event.params.dateKey}-${event.params.key}`
    );
  } else {
    await notifyEmployeeDevice(
      empId,
      '❌ รายการป้ายลังโฟมถูกยกเลิก',
      `${customerName} — ${event.params.dateKey} — รายการถูกยกเลิก กรุณาติดต่อแอดมิน`,
      `foam-result-${event.params.dateKey}-${event.params.key}`
    );
  }
});
