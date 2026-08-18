#!/usr/bin/env node
/* global require, module, process */
/*
 * One-time manual migration: hashes all plain-text PINs stored in the database.
 *
 * This script converts:
 *   employees/{key}/pin  -> "sha256$<salt>$<hash>"
 *   settings/admin/pin   -> "sha256$<salt>$<hash>"
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

function hashPin(pin, salt) {
  const saltStr = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(`${saltStr}:${String(pin).trim()}`).digest('hex');
  return `sha256$${saltStr}$${hash}`;
}

function isPlainPin(value) {
  return typeof value === 'string' && !String(value).startsWith('sha256$');
}

function buildMigrationPlan(employees, adminConfig) {
  const plan = {};

  // Migrate employee PINs
  Object.keys(employees || {}).forEach((key) => {
    const emp = employees[key];
    if (emp && isPlainPin(emp.pin)) {
      plan[`employees/${key}/pin`] = hashPin(emp.pin);
    }
  });

  // Migrate admin PIN
  if (adminConfig && isPlainPin(adminConfig.pin)) {
    plan['settings/admin/pin'] = hashPin(adminConfig.pin);
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