#!/usr/bin/env node
/* global require, module, process */
/*
 * One-time manual migration: hashes all plain-text PINs stored in the database.
 *
 * This script converts:
 *   employees/{key}/pin  -> "scrypt$<salt>$<hash>"   (new, memory-hard KDF)
 *   settings/admin/pin   -> "scrypt$<salt>$<hash>"
 *
 * Legacy "sha256$..." hashes are NOT migrated here because the original PIN
 * cannot be recovered from a hash. Those users can still log in (verifyPin
 * supports both formats) and will be upgraded to scrypt automatically on
 * their next successful login.
 *
 * It is NOT wired into any Cloud Function trigger and does NOT run
 * automatically. Run it by hand, against ONE project at a time, after taking
 * a database export/backup.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   node functions/migrate-pins.js --dry-run          # preview only, no writes
 *   node functions/migrate-pins.js --apply             # perform the migration
 */

const crypto = require('crypto');

// New scrypt format — memory-hard KDF (slows brute-force significantly vs SHA-256)
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

function hashPinLegacy(pin, salt) {
  // Legacy SHA-256 format (pre-scrypt) — used to re-hash old hashed PINs to scrypt
  const saltStr = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(`${saltStr}:${String(pin).trim()}`).digest('hex');
  return `sha256$${saltStr}$${hash}`;
}

function isPlainPin(value) {
  return typeof value === 'string' && !String(value).startsWith('scrypt$') && !String(value).startsWith('sha256$');
}

function isLegacySha256Pin(value) {
  return typeof value === 'string' && String(value).startsWith('sha256$');
}

function buildMigrationPlan(employees, adminConfig) {
  const plan = {};

  // Migrate employee PINs: plain -> scrypt, or legacy sha256 -> scrypt
  Object.keys(employees || {}).forEach((key) => {
    const emp = employees[key];
    if (!emp || !emp.pin) return;
    if (isPlainPin(emp.pin)) {
      plan[`employees/${key}/pin`] = hashPin(emp.pin);
    } else if (isLegacySha256Pin(emp.pin)) {
      // Convert legacy SHA-256 hash to scrypt — keep same salt for traceability
      const parts = String(emp.pin).split('$');
      if (parts.length === 3 && parts[0] === 'sha256') {
        plan[`employees/${key}/pin`] = hashPin(emp.pin, parts[1]);
      }
    }
  });

  // Migrate admin PIN
  if (adminConfig && adminConfig.pin) {
    if (isPlainPin(adminConfig.pin)) {
      plan['settings/admin/pin'] = hashPin(adminConfig.pin);
    } else if (isLegacySha256Pin(adminConfig.pin)) {
      const parts = String(adminConfig.pin).split('$');
      if (parts.length === 3 && parts[0] === 'sha256') {
        plan['settings/admin/pin'] = hashPin(adminConfig.pin, parts[1]);
      }
    }
  }

  return plan;
}

async function run() {
  const { initializeApp, applicationDefault } = require('firebase-admin/app');
  const { getDatabase } = require('firebase-admin/database');

  const args = process.argv.slice(2);
  const apply = args.includes('--apply');

  // When FIREBASE_DATABASE_EMULATOR_HOST is set, target the local emulator instead of a real project.
  const emulatorHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  const projectId = process.env.GCLOUD_PROJECT || 'demo-pinthip-app';
  const appOptions = emulatorHost
    ? { projectId, databaseURL: `http://${emulatorHost}/?ns=${projectId}` }
    : {
        credential: applicationDefault(),
        databaseURL: 'https://pinthip-checkin-default-rtdb.asia-southeast1.firebasedatabase.app',
      };

  initializeApp(appOptions);
  const db = getDatabase();

  const [employeesSnapshot, adminSnapshot] = await Promise.all([
    db.ref('employees').once('value'),
    db.ref('settings/admin').once('value')
  ]);

  const employees = employeesSnapshot.val() || {};
  const adminConfig = adminSnapshot.val();

  const plan = buildMigrationPlan(employees, adminConfig);
  const pinCount = Object.keys(plan).length;

  console.log(`Found ${pinCount} plain-text PIN${pinCount === 1 ? '' : 's'} to hash.`);

  if (pinCount === 0) {
    console.log('Nothing to migrate — all PINs are already hashed.');
    return;
  }

  if (!apply) {
    console.log('Dry run only (pass --apply to write changes). No data was modified.');
    Object.keys(plan).forEach((path) => {
      console.log(`  Would update: ${path}`);
    });
    return;
  }

  await db.ref().update(plan);
  console.log(`Hashed ${pinCount} PIN${pinCount === 1 ? '' : 's'} successfully.`);
}

module.exports = { hashPin, isPlainPin, buildMigrationPlan };

if (require.main === module) {
  run().catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  });
}