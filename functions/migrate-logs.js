#!/usr/bin/env node
/* global require, module, process */
/*
 * One-time manual migration: moves old flat `logs/{pushId}` entries into
 * the new `logs/{YYYY-MM}/{pushId}` structure used by the app.
 *
 * This script is NOT wired into any Cloud Function trigger and does NOT run
 * automatically. Run it by hand, against ONE project at a time, after taking
 * a database export/backup.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
 *   node functions/migrate-logs.js --dry-run          # preview only, no writes
 *   node functions/migrate-logs.js --apply             # perform the migration
 *   node functions/migrate-logs.js --apply --delete-old  # also remove old flat entries
 */

const MONTH_KEY_PATTERN = /^\d{4}-\d{2}$/;

function getMonthKey(dateStr) {
  const match = /^(\d{4}-\d{2})/.exec(String(dateStr || ''));
  return match ? match[1] : 'unknown';
}

// Old flat entries are Firebase push IDs (e.g. "-Nabc123..."), never a "YYYY-MM" key.
function isAlreadyMigratedKey(key) {
  return MONTH_KEY_PATTERN.test(key);
}

function buildMigrationPlan(flatLogs) {
  const plan = {};
  const oldKeysToRemove = [];

  Object.keys(flatLogs || {}).forEach((logId) => {
    if (isAlreadyMigratedKey(logId)) return; // already-migrated month bucket, skip

    const entry = flatLogs[logId];
    const monthKey = getMonthKey(entry && entry.date);
    plan[`logs/${monthKey}/${logId}`] = entry;
    oldKeysToRemove.push(`logs/${logId}`);
  });

  return { plan, oldKeysToRemove };
}

async function run() {
  const { initializeApp, applicationDefault } = require('firebase-admin/app');
  const { getDatabase } = require('firebase-admin/database');

  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const deleteOld = args.includes('--delete-old');

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

  const snapshot = await db.ref('logs').once('value');
  const flatLogs = snapshot.val() || {};

  const { plan, oldKeysToRemove } = buildMigrationPlan(flatLogs);
  const entryCount = Object.keys(plan).length;

  console.log(`Found ${entryCount} legacy log entr${entryCount === 1 ? 'y' : 'ies'} to migrate.`);

  if (!apply) {
    console.log('Dry run only (pass --apply to write changes). No data was modified.');
    return;
  }

  if (entryCount === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  await db.ref().update(plan);
  console.log(`Wrote ${entryCount} entries under logs/{YYYY-MM}/...`);

  if (deleteOld) {
    const removalUpdate = {};
    oldKeysToRemove.forEach((path) => {
      removalUpdate[path] = null;
    });
    await db.ref().update(removalUpdate);
    console.log(`Removed ${oldKeysToRemove.length} legacy flat entries.`);
  } else {
    console.log('Old flat entries were kept. Re-run with --delete-old once you verified the app works correctly.');
  }
}

module.exports = { getMonthKey, isAlreadyMigratedKey, buildMigrationPlan };

if (require.main === module) {
  run().catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  });
}
