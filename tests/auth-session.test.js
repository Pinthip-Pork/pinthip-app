import test from 'node:test';
import assert from 'node:assert/strict';

const securityHelpers = await import('../security-helpers.js');

const makeStorage = () => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear()
  };
};

const loadSessionModule = async () => {
  const storage = makeStorage();
  const globals = {
    localStorage: storage,
    window: {},
    console: { warn: () => {} }
  };

  const vm = await import('node:vm');
  const code = await import('node:fs/promises').then((fs) => fs.readFile('app-state.js', 'utf8'));
  vm.runInNewContext(code, globals);
  return { storage, session: globals.window.PinThipSafe.session };
};

test('restoreSession returns admin when stored flag is true', async () => {
  const { session, storage } = await loadSessionModule();
  storage.setItem('app_is_admin', JSON.stringify(true));

  const result = session.restoreSession();
  assert.equal(result.isAdmin, true);
  assert.equal(result.currentUser, null);
});

test('setUserSession stores a real employee payload', async () => {
  const { session } = await loadSessionModule();
  const result = session.setUserSession({ empId: 'A001', empName: 'Alpha' });

  assert.equal(result.isAdmin, false);
  assert.equal(result.currentUser.empId, 'A001');
  assert.equal(result.currentUser.empName, 'Alpha');
});

test('clearAuthState removes both admin and user state', async () => {
  const { session, storage } = await loadSessionModule();
  storage.setItem('app_is_admin', JSON.stringify(true));
  storage.setItem('app_user_data', JSON.stringify({ empId: 'A001', empName: 'Alpha' }));

  session.clearAuthState();

  assert.equal(storage.getItem('app_is_admin'), null);
  assert.equal(storage.getItem('app_user_data'), null);
  assert.equal(typeof session.clearAuthState, 'function');
});

test('escapeHtml neutralizes script tags and quotes', () => {
  const value = '<script>alert("x")</script> & <b>bold</b>';
  const escaped = securityHelpers.escapeHtml(value);

  assert.match(escaped, /&lt;script&gt;/);
  assert.match(escaped, /alert\(&quot;x&quot;\)/);
  assert.match(escaped, /&amp;/);
});
