import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const loadFoamCustomerRepo = async () => {
  const globals = {
    window: {
      PinThipSafe: {},
      db: null
    },
    console: { warn: () => {} }
  };

  const code = await fs.readFile('modules/foam-customer-repo.js', 'utf8');
  vm.runInNewContext(code, globals);
  return globals;
};

test('foam customer repo reads and writes to the dedicated foam_customers path', async () => {
  const sandbox = await loadFoamCustomerRepo();
  const repo = sandbox.window.PinThipSafe.foamCustomerRepo;
  const calls = [];
  const db = {
    ref(path) {
      calls.push(path);
      return {
        once: () => Promise.resolve({ val: () => ({ a1: { name: 'Alpha', phone: '111' } }) }),
        update: () => Promise.resolve(),
        remove: () => Promise.resolve(),
        set: (value, callback) => {
          if (callback) callback(null);
          return Promise.resolve();
        },
        push: () => ({
          key: 'new-customer-id',
          set: (value, callback) => {
            if (callback) callback(null);
            return Promise.resolve();
          }
        })
      };
    }
  };

  sandbox.window.db = db;

  const customers = await repo.fetchAllCustomers();
  assert.equal(customers[0].name, 'Alpha');
  assert.ok(calls.includes('foam_customers'));

  await repo.addCustomer({ name: 'Beta', phone: '222' }, 'E1');
  assert.ok(calls.includes('foam_customers'));
});
