import assert from 'node:assert/strict';
import test from 'node:test';

import { createLoginController } from '../js/login-controller.js';

// Fake i18n just echoes the key so assertions can check exactly which
// message key was chosen, without depending on locale copy.
function createFakeI18n() {
  return { t: (key) => key };
}

function createFakeView() {
  const calls = [];
  const busyHistory = [];
  const registerMessages = [];
  const sessionModes = [];
  return {
    calls,
    busyHistory,
    registerMessages,
    sessionModes,
    setSessionBusy(busy) { busyHistory.push(busy); },
    setRegisterMessage(message) { registerMessages.push(message); },
    setSessionMode(mode) { sessionModes.push(mode); },
    focusCurrentView() { calls.push('focusCurrentView'); }
  };
}

// Returns an api whose authenticate()/register() never resolve on their
// own; each call is recorded with its own resolve/reject so the test
// controls resolution order — same pattern as test/tour.test.mjs's
// createControllableApi.
function createControllableApi() {
  const authenticateCalls = [];
  const registerCalls = [];
  function authenticate(credentials) {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    authenticateCalls.push({ credentials, resolve, reject });
    return promise;
  }
  function register(payload) {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    registerCalls.push({ payload, resolve, reject });
    return promise;
  }
  return { authenticate, register, authenticateCalls, registerCalls };
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

function setup() {
  const api = createControllableApi();
  const view = createFakeView();
  const i18n = createFakeI18n();
  const updates = [];
  const update = (action) => updates.push(action);
  let resetCalls = 0;
  const resetModuleViews = () => { resetCalls += 1; };
  let loadCalls = 0;
  const loadActiveModule = () => { loadCalls += 1; };
  const controller = createLoginController({
    api, i18n, update, resetModuleViews, loadActiveModule, getView: () => view
  });
  return { api, view, updates, controller, getResetCalls: () => resetCalls, getLoadCalls: () => loadCalls };
}

test('a successful manual login dispatches LOGIN_STARTED/LOGIN_SUCCEEDED, resets views, focuses, and clears busy', async () => {
  const { api, view, updates, controller, getResetCalls, getLoadCalls } = setup();

  const pending = controller.handleLogin({ email: 'a@example.test', password: 'secret' });
  assert.deepEqual(view.busyHistory, [true]);
  api.authenticateCalls[0].resolve({ token: 'tok' });

  assert.equal(await pending, true);
  assert.deepEqual(updates.map((a) => a.type), ['LOGIN_STARTED', 'LOGIN_SUCCEEDED']);
  assert.equal(getResetCalls(), 1);
  assert.equal(getLoadCalls(), 1);
  assert.deepEqual(view.calls, ['focusCurrentView']);
  assert.deepEqual(view.busyHistory, [true, false]);
});

test('a failed manual login dispatches LOGIN_FAILED and clears busy without focusing or resetting views', async () => {
  const { api, view, updates, controller, getResetCalls } = setup();

  const pending = controller.handleLogin({ email: 'a@example.test', password: 'wrong' });
  api.authenticateCalls[0].reject(new Error('denied'));

  assert.equal(await pending, false);
  assert.deepEqual(updates.map((a) => a.type), ['LOGIN_STARTED', 'LOGIN_FAILED']);
  assert.equal(getResetCalls(), 0);
  assert.deepEqual(view.calls, []);
  assert.deepEqual(view.busyHistory, [true, false]);
});

test('a manual login that resolves after a fresher one already succeeded is dropped silently — no state mutation, no focus', async () => {
  const { api, view, updates, controller } = setup();

  const first = controller.handleLogin({ email: 'a@example.test', password: 'first' });
  const second = controller.handleLogin({ email: 'b@example.test', password: 'second' });

  api.authenticateCalls[1].resolve({ token: 'second-token' });
  assert.equal(await second, true);
  const updatesAfterSecond = updates.length;
  const focusAfterSecond = view.calls.filter((c) => c === 'focusCurrentView').length;

  api.authenticateCalls[0].reject(new Error('stale auth failure'));
  assert.equal(await first, null, 'a superseded attempt must report itself as dropped, not applied');
  assert.equal(updates.length, updatesAfterSecond, 'a stale rejection must not dispatch any further state update');
  assert.equal(
    view.calls.filter((c) => c === 'focusCurrentView').length,
    focusAfterSecond,
    'a stale rejection must not steal focus'
  );
});

test('register() failure never calls authenticate() and never touches busy after clearing it', async () => {
  const { api, view, updates, controller } = setup();

  const pending = controller.handleRegister({ name: 'Student', email: 'a@example.test', password: 'secret' });
  assert.deepEqual(view.busyHistory, [true]);
  api.registerCalls[0].reject(new Error('duplicate'));
  await pending;

  assert.equal(api.authenticateCalls.length, 0, 'a failed registration must never attempt to authenticate');
  assert.equal(view.registerMessages.length, 1);
  assert.deepEqual(view.busyHistory, [true, false]);
  assert.deepEqual(updates, []);
});

test('successful register followed by successful auto-login reuses the same handleLogin path (LOGIN_SUCCEEDED, reset, focus)', async () => {
  const { api, view, updates, controller, getResetCalls, getLoadCalls } = setup();

  const pending = controller.handleRegister({ name: 'Student', email: 'a@example.test', password: 'secret' });
  await flush();
  api.registerCalls[0].resolve({ user: { id: 1 }, token: 'register-token' });
  await flush();
  assert.equal(api.authenticateCalls.length, 1, 'a successful register must chain into a real authenticate() call');

  api.authenticateCalls[0].resolve({ token: 'session-token' });
  await pending;

  assert.deepEqual(updates.map((a) => a.type), ['LOGIN_STARTED', 'LOGIN_SUCCEEDED']);
  assert.equal(getResetCalls(), 1);
  assert.equal(getLoadCalls(), 1);
  assert.deepEqual(view.calls, ['focusCurrentView']);
  assert.equal(view.registerMessages[0], 'register.successCreating');
  assert.equal(view.sessionModes.length, 0, 'a successful auto-login must not force the panel back to the login tab');
});

test('successful register followed by a failed auto-login creates no session, shows the register-specific message, and returns to the login tab', async () => {
  const { api, view, updates, controller } = setup();

  const pending = controller.handleRegister({ name: 'Student', email: 'a@example.test', password: 'secret' });
  await flush();
  api.registerCalls[0].resolve({ user: { id: 1 }, token: 'register-token' });
  await flush();
  api.authenticateCalls[0].reject(new Error('bad credentials'));
  await pending;

  // handleLogin's own catch already dispatches one LOGIN_FAILED (generic
  // message); handleRegister then dispatches a second one overriding the
  // message with the register-specific copy — the last state wins on render.
  assert.deepEqual(updates.map((a) => a.type), ['LOGIN_STARTED', 'LOGIN_FAILED', 'LOGIN_FAILED']);
  assert.equal(updates.at(-1).message, 'register.autoLoginFailed');
  assert.deepEqual(view.sessionModes, ['login']);
  assert.deepEqual(view.calls, [], 'a failed auto-login must never focus the app as if signed in');
});

test('a stale register-triggered auto-login does not overwrite a fresher manual login success or steal focus', async () => {
  const { api, view, updates, controller } = setup();

  const registerPromise = controller.handleRegister({ name: 'Student', email: 'a@example.test', password: 'secret' });
  await flush();
  assert.equal(api.registerCalls.length, 1);
  api.registerCalls[0].resolve({ user: { id: 1 }, token: 'register-token' });
  await flush();
  assert.equal(api.authenticateCalls.length, 1, 'register success must have chained into handleLogin already');

  // A manual login starts (switch to the login tab, different credentials)
  // and succeeds before the register-chained auto-login does.
  const manualLogin = controller.handleLogin({ email: 'b@example.test', password: 'manual' });
  assert.equal(api.authenticateCalls.length, 2);
  api.authenticateCalls[1].resolve({ token: 'manual-token' });
  assert.equal(await manualLogin, true);
  assert.equal(view.calls.filter((c) => c === 'focusCurrentView').length, 1);
  const loginSucceededCountAfterManual = updates.filter((a) => a.type === 'LOGIN_SUCCEEDED').length;
  assert.equal(loginSucceededCountAfterManual, 1);

  // Now the stale auto-login from register fails — must not clobber the
  // fresher authenticated state or steal focus back.
  api.authenticateCalls[0].reject(new Error('stale auto-login failure'));
  await registerPromise;

  assert.equal(
    view.calls.filter((c) => c === 'focusCurrentView').length, 1,
    'the stale auto-login must not steal focus after a fresher login already focused the view'
  );
  assert.equal(view.registerMessages.at(-1), 'register.successCreating', 'no auto-login-failed message should appear for a dropped stale attempt');
  assert.deepEqual(view.sessionModes, [], 'a dropped stale attempt must not force the panel back to the login tab');
  assert.equal(
    updates.filter((a) => a.type === 'LOGIN_FAILED').length, 0,
    'a stale auto-login failure must never dispatch LOGIN_FAILED over a fresher successful session'
  );
  assert.equal(
    updates.filter((a) => a.type === 'LOGIN_SUCCEEDED').length, 1,
    'the fresher LOGIN_SUCCEEDED must remain the only one dispatched'
  );
});
