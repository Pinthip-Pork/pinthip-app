/* global require, exports */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');

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
  const foundEmployee = Object.values(employees).find((employee) => (
    employee &&
    String(employee.empId || '').trim() === empId &&
    String(employee.pin || '').trim() === pin
  ));

  if (!foundEmployee) {
    throw new HttpsError('unauthenticated', 'Invalid employee ID or PIN.');
  }

  const existingDevice = deviceSnapshot.val();
  if (existingDevice?.status === 'blocked') {
    throw new HttpsError('permission-denied', 'This device is blocked.');
  }
  if (existingDevice?.empId && String(existingDevice.empId) !== empId) {
    throw new HttpsError('permission-denied', 'This device is registered to another employee.');
  }

  const autoApprove = autoApproveSnapshot.val() !== false;
  const status = existingDevice?.status || (autoApprove ? 'active' : 'pending');
  if (status === 'pending') {
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

  const now = new Date().toISOString();
  await database.ref(`device_access/${deviceId}`).update({
    uid,
    empId,
    empName: String(foundEmployee.empName || ''),
    deviceInfo,
    status,
    lastSeenAt: now
  });

  const token = await getAuth().createCustomToken(uid, {
    role: String(foundEmployee.role || 'employee'),
    empId,
    deviceId
  });

  return { token, uid, empId, status };
});
