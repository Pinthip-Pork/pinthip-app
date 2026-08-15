import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const loadLogsRepo = async () => {
  const globals = { window: {}, console: { warn: () => {} } };
  const code = await fs.readFile('modules/logs-repository.js', 'utf8');
  vm.runInNewContext(code, globals);
  return globals.window.PinThipSafe.logsRepo;
};

// Minimal fake Realtime Database: paths map to plain objects, once('value') resolves a snapshot-like wrapper.
const makeFakeDb = (dataByPath) => ({
  ref(path) {
    return {
      once: () => Promise.resolve({ val: () => dataByPath[path] }),
      push: () => {
        const pushKey = `pushId_${Object.keys(dataByPath).length}`;
        return {
          set: (value, callback) => {
            dataByPath[path] = dataByPath[path] || {};
            dataByPath[path][pushKey] = value;
            if (callback) callback(null);
          }
        };
      }
    };
  }
});

test('getMonthKey extracts YYYY-MM from a date string', async () => {
  const logsRepo = await loadLogsRepo();
  assert.equal(logsRepo.getMonthKey('2026-08-15'), '2026-08');
});

test('getMonthKeysInRange spans multiple months inclusively', async () => {
  const logsRepo = await loadLogsRepo();
  assert.deepEqual([...logsRepo.getMonthKeysInRange('2026-07-20', '2026-09-05')], ['2026-07', '2026-08', '2026-09']);
});

test('getMonthKeysInRange returns a single month when start equals end', async () => {
  const logsRepo = await loadLogsRepo();
  assert.deepEqual([...logsRepo.getMonthKeysInRange('2026-08-15', '2026-08-15')], ['2026-08']);
});

test('fetchLogsForRange only reads the month partitions covering the range', async () => {
  const logsRepo = await loadLogsRepo();
  const db = makeFakeDb({
    'logs/2026-08': { a1: { empId: 'E1', date: '2026-08-31', type: 'เข้างาน' } },
    'logs/2026-09': { b1: { empId: 'E2', date: '2026-09-01', type: 'เข้างาน' } },
    'logs/2026-10': { c1: { empId: 'E3', date: '2026-10-01', type: 'เข้างาน' } }
  });

  const result = await logsRepo.fetchLogsForRange(db, '2026-08-25', '2026-09-05');
  const empIds = Object.values(result).map((entry) => entry.empId).sort();

  assert.deepEqual(empIds, ['E1', 'E2']);
});

test('fetchAllLogs flattens every month partition into one object', async () => {
  const logsRepo = await loadLogsRepo();
  const db = makeFakeDb({
    logs: {
      '2026-08': { a1: { empId: 'E1', date: '2026-08-01' } },
      '2026-09': { b1: { empId: 'E2', date: '2026-09-01' } }
    }
  });

  const result = await logsRepo.fetchAllLogs(db);
  const empIds = Object.values(result).map((entry) => entry.empId).sort();

  assert.deepEqual(empIds, ['E1', 'E2']);
});

test('writeLogEntry stores the entry under its month partition', async () => {
  const logsRepo = await loadLogsRepo();
  const dataByPath = {};
  const db = makeFakeDb(dataByPath);

  await new Promise((resolve) => {
    logsRepo.writeLogEntry(db, { empId: 'E1', date: '2026-08-15', type: 'เข้างาน' }, () => resolve());
  });

  const stored = Object.values(dataByPath['logs/2026-08'])[0];
  assert.equal(stored.empId, 'E1');
});
