import assert from 'node:assert/strict';
import test from 'node:test';

import { ENDPOINTS, LOCAL_TEST_API_URL, UPSTREAM_API_URL, isTestMode, resolveApiBaseUrl } from '../js/config.js';

test('uses the same-origin proxy only for local HTTP app origins unless exact local test mode is enabled', () => {
  assert.equal(resolveApiBaseUrl({
    protocol: 'http:', hostname: '127.0.0.1', origin: 'http://127.0.0.1:4173', search: ''
  }), 'http://127.0.0.1:4173/api');
  assert.equal(resolveApiBaseUrl({
    protocol: 'https:', hostname: 'localhost', origin: 'https://localhost:4173', search: ''
  }), 'https://localhost:4173/api');
  assert.equal(resolveApiBaseUrl({
    protocol: 'http:', hostname: '127.0.0.1', origin: 'http://127.0.0.1:4173', search: '?testMode=1'
  }), LOCAL_TEST_API_URL);
  assert.equal(resolveApiBaseUrl({
    protocol: 'https:', hostname: 'example.test', origin: 'https://example.test', search: '?testMode=1'
  }), UPSTREAM_API_URL);
  assert.equal(resolveApiBaseUrl({
    protocol: 'file:', hostname: '', origin: 'null', search: ''
  }), UPSTREAM_API_URL);
});

test('test mode requires a single exact local flag', () => {
  assert.equal(isTestMode({ protocol: 'http:', hostname: 'localhost', search: '?testMode=1' }), true);
  assert.equal(isTestMode({ protocol: 'http:', hostname: 'localhost', search: '?testMode=true' }), false);
  assert.equal(isTestMode({ protocol: 'http:', hostname: 'localhost', search: '?testMode=1&testMode=1' }), false);
  assert.equal(isTestMode({ protocol: 'https:', hostname: 'example.test', search: '?testMode=1' }), false);
});

test('data endpoint catalog is immutable and method allowlisted', () => {
  assert.deepEqual(Object.keys(ENDPOINTS), ['stadiums', 'games', 'teams', 'groups']);
  for (const endpoint of Object.values(ENDPOINTS)) {
    assert.equal(endpoint.method, 'GET');
    assert.equal(endpoint.cache, true);
    assert.match(endpoint.path, /^\/get\/(stadiums|games|teams|groups)$/);
    assert.equal(Object.isFrozen(endpoint), true);
  }
  assert.equal(Object.isFrozen(ENDPOINTS), true);
});
