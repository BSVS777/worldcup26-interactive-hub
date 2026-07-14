import assert from 'node:assert/strict';
import test from 'node:test';

import { UPSTREAM_API_URL, resolveApiBaseUrl } from '../js/config.js';

test('uses the same-origin proxy only for local HTTP app origins', () => {
  assert.equal(resolveApiBaseUrl({
    protocol: 'http:', hostname: '127.0.0.1', origin: 'http://127.0.0.1:4173'
  }), 'http://127.0.0.1:4173/api');
  assert.equal(resolveApiBaseUrl({
    protocol: 'https:', hostname: 'localhost', origin: 'https://localhost:4173'
  }), 'https://localhost:4173/api');
  assert.equal(resolveApiBaseUrl({
    protocol: 'https:', hostname: 'example.test', origin: 'https://example.test'
  }), UPSTREAM_API_URL);
  assert.equal(resolveApiBaseUrl({
    protocol: 'file:', hostname: '', origin: 'null'
  }), UPSTREAM_API_URL);
});
