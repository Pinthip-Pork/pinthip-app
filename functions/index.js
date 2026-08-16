/* global require, exports */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const crypto = require('crypto');

initializeApp();

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

exports.loginWithPin = onCall(async (request) => {
  const empId = requireText(request.data?.empId, 'empId');
  const pin = requireText(request.data?.pin, 'pin');
  const deviceId = requireText(request.data?.deviceId, 'deviceId');
  const deviceInfo = String(request.data?.deviceInfo || 'Unknown device').slice(0, 120);

  const database = getDatabase();
  const [employeesSnapshot, autoApproveSnapshot, deviceSnapshot] = await Promise.all([
    database.ref('employees').once('value'),
    database.ref('settings/deviceAccessAutoApprove').once('value'),
    database.ref(`device_access/${deviceId}`).once('value')
  ]);

  const employees = employeesSnapshot.val() || {};
  const foundEntry = Object.entries(employees).find(([, employee]) => (
    employee && String(employee.empId || '').trim() === empId && String(employee.pin || '').trim() === pin
  ));
  const foundEmployee = foundEntry ? foundEntry[1] : null;

  if (!foundEmployee) {
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

  const token = await getAuth().createCustomToken(uid, {
    role: String(foundEmployee.role || 'employee'),
    empId,
    deviceId
  });

  return { token, uid, empId, status };
});

exports.adminLogin = onCall(async (request) => {
  const auth = getAuth();
  const database = getDatabase();

  const username = requireText(request.data?.username, 'username');
  const pin = requireText(request.data?.pin, 'pin');
  const deviceId = requireText(request.data?.deviceId, 'deviceId');
  const deviceInfo = String(request.data?.deviceInfo || 'Unknown device').slice(0, 120);

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
      pin: String(setupPin).trim()
    };

    await database.ref('settings/admin').set(adminConfig);
  }

  if (!adminConfig.enabled) {
    throw new HttpsError('permission-denied', 'Admin login is disabled.');
  }

  const storedUsername = String(adminConfig.username || '').trim().toLowerCase();
  const storedPin = String(adminConfig.pin || '').trim();

  if (String(username).trim().toLowerCase() !== storedUsername) {
    throw new HttpsError('unauthenticated', 'Invalid admin credentials.');
  }

  if (String(pin).trim() !== storedPin) {
    throw new HttpsError('unauthenticated', 'Invalid admin credentials.');
  }

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

  return { token, uid, expiresIn: 3600 };
});
