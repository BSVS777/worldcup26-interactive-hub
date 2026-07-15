import assert from 'node:assert/strict';
import test from 'node:test';

import { createTestServer, TEST_TOKEN } from '../tools/test-server.mjs';

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

async function json(response) {
  return response.json();
}

test('deterministic test server authenticates and serves normalized fixture roots with bearer auth', async () => {
  await withServer(async (baseUrl) => {
    const auth = await fetch(`${baseUrl}/auth/authenticate`, {
      method: 'POST',
      headers: { Origin: 'http://127.0.0.1:4173', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'student@example.test', password: 'secret' })
    });
    assert.equal(auth.status, 200);
    assert.equal(auth.headers.get('access-control-allow-origin'), 'http://127.0.0.1:4173');
    assert.equal((await json(auth)).token, TEST_TOKEN);

    for (const [path, root] of [['/get/stadiums', 'stadiums'], ['/get/games', 'games'], ['/get/teams', 'teams'], ['/get/groups', 'groups']]) {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { Origin: 'http://127.0.0.1:4173', Authorization: `Bearer ${TEST_TOKEN}` }
      });
      assert.equal(response.status, 200);
      const payload = await json(response);
      assert.ok(Array.isArray(payload[root]), `${root} should be an array`);
      assert.ok(payload[root].length > 0, `${root} should include deterministic fixtures`);
    }
  });
});

test('data fixtures reject missing bearer tokens and do not expose CORS to unapproved origins', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/get/games`, { headers: { Origin: 'https://evil.example' } });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.match((await json(response)).message, /bearer/i);
  });
});

test('429 and 500 deterministic failures recover after configured attempts and reset clears counters', async () => {
  await withServer(async (baseUrl) => {
    const first429 = await fetch(`${baseUrl}/test/429?case=rate&failures=1`);
    assert.equal(first429.status, 429);
    assert.equal(first429.headers.get('retry-after'), '1');
    const second429 = await fetch(`${baseUrl}/test/429?case=rate&failures=1`);
    assert.equal(second429.status, 200);
    assert.equal((await json(second429)).attempts, 2);

    const first500 = await fetch(`${baseUrl}/test/500?case=server&failures=1`);
    assert.equal(first500.status, 500);
    const second500 = await fetch(`${baseUrl}/test/500?case=server&failures=1`);
    assert.equal(second500.status, 200);

    const reset = await fetch(`${baseUrl}/test/reset`, { method: 'POST' });
    assert.equal(reset.status, 200);
    const afterReset = await fetch(`${baseUrl}/test/429?case=rate&failures=1`);
    assert.equal(afterReset.status, 429);
  });
});

test('method and route allowlists remain strict on the deterministic test server', async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/get/games`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${baseUrl}/auth/authenticate`, { method: 'GET' })).status, 405);
    assert.equal((await fetch(`${baseUrl}/get/unknown`, { headers: { Authorization: `Bearer ${TEST_TOKEN}` } })).status, 404);
  });
});
