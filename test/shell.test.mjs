import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_ROUTE,
  MODULE_ROUTES,
  createInitialViewState,
  normalizeRoute,
  reduceViewState
} from '../js/router.js';

test('normalizes only known module hashes and falls back to the tour', () => {
  assert.equal(normalizeRoute(''), DEFAULT_ROUTE);
  assert.equal(normalizeRoute('#agenda'), 'agenda');
  assert.equal(normalizeRoute('#GROUP-MATRIX'), 'group-matrix');
  assert.equal(normalizeRoute('#%3Cscript%3E'), DEFAULT_ROUTE);
  assert.deepEqual(MODULE_ROUTES.map(({ id }) => id), [
    'tour',
    'agenda',
    'timeline',
    'fan-dashboard',
    'group-matrix'
  ]);
});

test('creates deterministic shell state from route, session, and exact test-mode query', () => {
  assert.deepEqual(
    createInitialViewState({ hash: '#timeline', search: '?testMode=1', hasToken: true }),
    {
      route: 'timeline',
      session: 'authenticated',
      testMode: true,
      loginStatus: 'idle',
      statusMessage: ''
    }
  );

  assert.equal(createInitialViewState({ search: '?testMode=true' }).testMode, false);
  assert.equal(createInitialViewState({ search: '?testMode=1&testMode=0' }).testMode, false);
});

test('view-state reducer handles navigation and session recovery without reload', () => {
  let state = createInitialViewState({ hash: '#agenda', hasToken: true });
  state = reduceViewState(state, { type: 'SESSION_EXPIRED' });
  assert.equal(state.session, 'expired');
  assert.match(state.statusMessage, /expired/i);

  state = reduceViewState(state, { type: 'LOGIN_STARTED' });
  assert.equal(state.loginStatus, 'pending');

  state = reduceViewState(state, { type: 'LOGIN_SUCCEEDED' });
  assert.equal(state.session, 'authenticated');
  assert.equal(state.route, 'agenda');
  assert.equal(state.loginStatus, 'idle');

  state = reduceViewState(state, { type: 'NAVIGATED', route: '#unknown' });
  assert.equal(state.route, DEFAULT_ROUTE);
});

test('view-state reducer keeps an accessible failure message after login errors', () => {
  const initial = createInitialViewState({ hasToken: false });
  const pending = reduceViewState(initial, { type: 'LOGIN_STARTED' });
  const failed = reduceViewState(pending, { type: 'LOGIN_FAILED' });

  assert.equal(failed.session, 'anonymous');
  assert.equal(failed.loginStatus, 'error');
  assert.match(failed.statusMessage, /could not sign in/i);

  const classified = reduceViewState(pending, {
    type: 'LOGIN_FAILED',
    message: 'Could not reach the sign-in service. Check your connection and try again.'
  });
  assert.match(classified.statusMessage, /connection/i);
});
