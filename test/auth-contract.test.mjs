// End-to-end proof of the academic JWT contract: the real app client
// (js/api.js, no mocked fetch) against the real deterministic test server
// (tools/test-server.mjs, a live HTTP server, not a stub). This is the one
// gap a unit test with a fake fetchImpl cannot close: it proves the actual
// bytes sent over the wire carry a real Bearer token issued by the server,
// and that the server truly rejects requests without one.
import assert from 'node:assert/strict';
import test from 'node:test';

import { createTestServer, TEST_TOKEN } from '../tools/test-server.mjs';
import { AuthenticationError, createApiClient } from '../js/api.js';
import { createSessionStore } from '../js/session.js';
import { ENDPOINTS } from '../js/config.js';

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
}

async function withServer(fn) {
  const server = createTestServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test('the real api client authenticates against the live deterministic server and every data endpoint carries a real Bearer token', async () => {
  await withServer(async (baseUrl) => {
    const client = createApiClient({
      baseUrl,
      fetchImpl: fetch,
      session: createSessionStore(new MemoryStorage()),
      cacheStorage: new MemoryStorage()
    });

    const { token } = await client.authenticate({ email: 'student@example.test', password: 'secret' });
    assert.equal(token, TEST_TOKEN, 'the session must hold the exact token the live server issued');

    for (const endpoint of Object.keys(ENDPOINTS)) {
      const result = await client.apiRequest(endpoint);
      assert.equal(result.source, 'network', `${endpoint} must round-trip over the real network, not a fallback`);
      assert.ok(Array.isArray(result.data) && result.data.length > 0, `${endpoint} must return real deterministic fixture rows`);
    }
  });
});

test('the real api client is rejected by the live deterministic server when no Bearer token exists', async () => {
  await withServer(async (baseUrl) => {
    const client = createApiClient({
      baseUrl,
      fetchImpl: fetch,
      session: createSessionStore(new MemoryStorage()),
      cacheStorage: new MemoryStorage()
    });

    await assert.rejects(
      client.apiRequest('games'),
      (error) => error instanceof AuthenticationError && error.status === 401,
      'a request with no Bearer token must be rejected by the live server, proving the header is actually required'
    );
  });
});
