/* global require, exports */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const crypto = require('crypto');

initializeApp();

// ===== PIN Hashing =====
// Format: "sha256$<salt>$<hash>" — salt is random per user
function hashPin(pin, salt) {
  const saltStr = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(`${saltStr}:${String(pin).trim()}`).digest('hex');
  return `sha256$${saltStr}$${hash}`;
}

function verifyPin(inputPin, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = String(storedHash).split('$');
  if (parts.length !== 3 || parts[0] !== 'sha256') return false;
  const [, salt, expectedHash] = parts;
  const inputHash = crypto.createHash('sha256').update(`${salt}:${String(inputPin).trim()}`).digest('hex');
  // Timing-safe comparison
  const a = Buffer.from(expectedHash, 'hex');
  const b = Buffer.from(inputHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isPlainPin(value) {
  // Plain PIN is a short numeric/alpha string without the "sha256$" prefix
  return typeof value === 'string' && !String(value).startsWith('sha256$');
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

  // If no admin config exists in DB, allow one-time setup from request
  if (!adminConfig) {
    // Require setup data for first-time initialization
    const setupUsername = requireText(request.data?.setup?.username, 'setup.username');
    const setupPin = requireText(request.data?.setup?.pin, 'setup.pin');

    if (String(setupPin).trim().length < 4) {
      throw new HttpsError('invalid-argument', 'PIN must be at least 4 characters.');
    }
    if (String(setupUsername).trim().length < 3) {
      throw new HttpsError('invalid-argument', 'Username must be at least 3 characters.');
    }

    adminConfig = {
      enabled: true,
      username: String(setupUsername).trim(),
      pin: hashPin(String(setupPin).trim())
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