import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMigrationPlan, isAlreadyMigratedKey } from '../functions/migrate-logs.js';

test('isAlreadyMigratedKey recognizes YYYY-MM month buckets only', () => {
  assert.equal(isAlreadyMigratedKey('2026-08'), true);
  assert.equal(isAlreadyMigratedKey('-Nabc123XYZ'), false);
});

test('buildMigrationPlan maps legacy flat entries into month-partitioned paths', () => {
  const flatLogs = {
    '-Nabc1': { empId: 'E1', date: '2026-08-15', type: 'เข้างาน' },
    '-Nabc2': { empId: 'E2', date: '2026-09-02', type: 'เข้างาน' }
  };

  const { plan, oldKeysToRemove } = buildMigrationPlan(flatLogs);

  assert.deepEqual(plan['logs/2026-08/-Nabc1'], flatLogs['-Nabc1']);
  assert.deepEqual(plan['logs/2026-09/-Nabc2'], flatLogs['-Nabc2']);
  assert.deepEqual([...oldKeysToRemove].sort(), ['logs/-Nabc1', 'logs/-Nabc2']);
});

test('buildMigrationPlan skips keys that already look like month buckets', () => {
  const flatLogs = {
    '2026-08': { someEntryId: { empId: 'E1', date: '2026-08-15' } },
    '-Nabc3': { empId: 'E3', date: '2026-08-20', type: 'เข้างาน' }
  };

  const { plan, oldKeysToRemove } = buildMigrationPlan(flatLogs);

  assert.equal(Object.keys(plan).length, 1);
  assert.deepEqual(plan['logs/2026-08/-Nabc3'], flatLogs['-Nabc3']);
  assert.deepEqual([...oldKeysToRemove], ['logs/-Nabc3']);
});

test('buildMigrationPlan falls back to "unknown" bucket when date is missing', () => {
  const flatLogs = { '-Nabc4': { empId: 'E4', type: 'เข้างาน' } };
  const { plan } = buildMigrationPlan(flatLogs);

  assert.deepEqual(plan['logs/unknown/-Nabc4'], flatLogs['-Nabc4']);
});
