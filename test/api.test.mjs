import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError, AuthenticationError, createApiClient } from '../js/api.js';
import { ENDPOINTS } from '../js/config.js';
import { createSessionStore } from '../js/session.js';

function jwt(payload = { exp: 4_102_444_800 }) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${encoded}.signature`;
}

const TEST_TOKEN = jwt();
const NEW_TOKEN = jwt({ exp: 4_102_444_800, jti: 'new-session' });

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
}

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  });
}

function setup(fetchImpl, overrides = {}) {
  const sessionStorage = new MemoryStorage();
  const cacheStorage = new MemoryStorage();
  const session = createSessionStore(sessionStorage);
  session.setToken(TEST_TOKEN);
  const sleeps = [];
  const client = createApiClient({
    baseUrl: 'https://api.example.test', fetchImpl, session, cacheStorage,
    sleep: async (milliseconds) => { sleeps.push(milliseconds); },
    now: () => new Date('2026-07-13T12:00:00.000Z'),
    ...overrides
  });
  return { client, session, cacheStorage, sleeps };
}

test('adds Bearer JWT, validates and normalizes a successful endpoint response, then caches it', async () => {
  const calls = [];
  const { client } = setup(async (url, options) => {
    calls.push({ url, options });
    return jsonResponse(200, { teams: [{ id: 1, name_en: 'Mexico', groups: 'A' }] });
  });

  const result = await client.apiRequest('teams');

  assert.deepEqual(result, {
    data: [{ id: '1', name: 'Mexico', groupId: 'A', flagUrl: null }],
    source: 'network', stale: false, cachedAt: null
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.example.test/get/teams');
  assert.equal(new Headers(calls[0].options.headers).get('authorization'), `Bearer ${TEST_TOKEN}`);
});

test('adds Bearer JWT to every public data endpoint request', async () => {
  const seen = [];
  const { client } = setup(async (url, options) => {
    seen.push({ url, authorization: new Headers(options.headers).get('authorization') });
    return jsonResponse(200, { [seen.at(-1).url.split('/').at(-1)]: [] });
  });

  for (const endpoint of Object.keys(ENDPOINTS)) {
    await client.apiRequest(endpoint);
  }

  assert.deepEqual(seen, Object.values(ENDPOINTS).map((config) => ({
    url: `https://api.example.test${config.path}`,
    authorization: `Bearer ${TEST_TOKEN}`
  })));
});

test('sends a data request without Authorization when no token exists and still completes it', async () => {
  const calls = [];
  const { client, session } = setup(async (url, options) => {
    calls.push({ url, options });
    return jsonResponse(200, { games: [] });
  });
  session.clear();
  const result = await client.apiRequest('games');
  assert.equal(result.source, 'network');
  assert.equal(calls.length, 1);
  assert.equal(new Headers(calls[0].options.headers).has('authorization'), false);
});

test('omits Authorization once a stored token expires locally, without blocking the request', async () => {
  let currentTime = 2_000_000_000_000;
  let calls = 0;
  const expirations = [];
  const session = createSessionStore(new MemoryStorage(), { now: () => currentTime });
  session.setToken(jwt({ exp: 2_000_000_001 }));
  assert.ok(session.getToken(), 'the session is valid at initial render');
  currentTime = 2_000_000_002_000;
  const client = createApiClient({
    fetchImpl: async (url, options) => {
      calls += 1;
      assert.equal(new Headers(options.headers).has('authorization'), false);
      return jsonResponse(200, { games: [] });
    },
    session,
    cacheStorage: new MemoryStorage(),
    onSessionExpired: (event) => { expirations.push(event); }
  });

  const result = await client.apiRequest('games');
  assert.equal(result.source, 'network');
  assert.equal(calls, 1);
  assert.deepEqual(expirations, []);
});

test('fetches public data for a client that has never had a session', async () => {
  let calls = 0;
  let expirations = 0;
  const client = createApiClient({
    fetchImpl: async (url, options) => {
      calls += 1;
      assert.equal(new Headers(options.headers).has('authorization'), false);
      return jsonResponse(200, { games: [] });
    },
    session: createSessionStore(new MemoryStorage()),
    cacheStorage: new MemoryStorage(),
    onSessionExpired: () => { expirations += 1; }
  });

  const result = await client.apiRequest('games');
  assert.equal(result.source, 'network');
  assert.equal(calls, 1);
  assert.equal(expirations, 0);
});

test('clears the session and reports expiration once on 401 without retrying', async () => {
  let calls = 0;
  let expirations = 0;
  const { client, session, sleeps } = setup(async () => {
    calls += 1;
    return jsonResponse(401, { message: 'expired' });
  }, { onSessionExpired: () => { expirations += 1; } });

  await assert.rejects(client.apiRequest('games'), (error) => error instanceof AuthenticationError && error.status === 401);
  assert.equal(session.getToken(), null);
  assert.equal(calls, 1);
  assert.equal(expirations, 1);
  assert.deepEqual(sleeps, []);
});

test('reports expiration when the request token expires locally before its 401 arrives', async () => {
  let currentTime = 2_000_000_000_000;
  let resolveRequest;
  let expirations = 0;
  const session = createSessionStore(new MemoryStorage(), { now: () => currentTime });
  const requestToken = jwt({ exp: 2_000_000_001 });
  session.setToken(requestToken);
  const client = createApiClient({
    fetchImpl: async () => await new Promise((resolve) => { resolveRequest = resolve; }),
    session,
    cacheStorage: new MemoryStorage(),
    onSessionExpired: () => { expirations += 1; }
  });

  const request = client.apiRequest('games');
  currentTime = 2_000_000_002_000;
  resolveRequest(jsonResponse(401, { message: 'expired' }));

  await assert.rejects(request, (error) => (
    error instanceof AuthenticationError && error.status === 401
  ));
  assert.equal(session.getToken(), null);
  assert.equal(expirations, 1);
});

test('retries 429 exactly with 1s, 2s, 4s backoff and honors a larger Retry-After', async () => {
  const statuses = [429, 429, 429, 200];
  const retryEvents = [];
  const { client, sleeps } = setup(async () => {
    const status = statuses.shift();
    return status === 200
      ? jsonResponse(200, { games: [] })
      : jsonResponse(429, {}, status === 429 && statuses.length === 2 ? { 'retry-after': '3' } : {});
  });

  const result = await client.apiRequest('games', { onRetry: (event) => retryEvents.push(event) });
  assert.equal(result.source, 'network');
  assert.deepEqual(sleeps, [1000, 3000, 4000]);
  assert.deepEqual(retryEvents.map(({ status, attempt, nextAttempt, delayMs }) => ({ status, attempt, nextAttempt, delayMs })), [
    { status: 429, attempt: 1, nextAttempt: 2, delayMs: 1000 },
    { status: 429, attempt: 2, nextAttempt: 3, delayMs: 3000 },
    { status: 429, attempt: 3, nextAttempt: 4, delayMs: 4000 }
  ]);
});

test('retries 500 four total attempts, then falls back to the endpoint cache', async () => {
  let calls = 0;
  const { client, cacheStorage, sleeps } = setup(async () => {
    calls += 1;
    return jsonResponse(500, { message: 'unavailable' });
  });
  cacheStorage.setItem('wc26:cache:v1:groups', JSON.stringify({
    version: 1, endpoint: 'groups', savedAt: '2026-07-13T11:00:00.000Z', data: [{ id: 'A' }]
  }));

  const result = await client.apiRequest('groups');
  assert.deepEqual(result, {
    data: [{ id: 'A' }], source: 'cache', stale: true, cachedAt: '2026-07-13T11:00:00.000Z'
  });
  assert.equal(calls, 4);
  assert.deepEqual(sleeps, [1000, 2000, 4000]);
});

test('uses cache immediately on a network error and otherwise returns a recoverable typed error', async () => {
  const { client, cacheStorage, sleeps } = setup(async () => { throw new TypeError('offline'); });
  cacheStorage.setItem('wc26:cache:v1:stadiums', JSON.stringify({
    version: 1, endpoint: 'stadiums', savedAt: '2026-07-13T11:00:00.000Z', data: []
  }));
  assert.equal((await client.apiRequest('stadiums')).source, 'cache');
  assert.deepEqual(sleeps, []);
  await assert.rejects(client.apiRequest('teams'), (error) => error instanceof ApiError && error.recoverable && error.status === null);
});

test('authenticates separately with the verified payload and stores the returned token', async () => {
  const calls = [];
  const { client, session } = setup(async (url, options) => {
    calls.push({ url, options });
    return jsonResponse(200, { user: { id: 1 }, token: `  ${TEST_TOKEN}  ` });
  });

  const result = await client.authenticate({ email: 'student@example.test', password: 'correct horse battery staple' });
  assert.deepEqual(result, { user: { id: 1 }, token: TEST_TOKEN });
  assert.equal(session.getToken(), TEST_TOKEN);
  assert.equal(calls[0].url, 'https://api.example.test/auth/authenticate');
  assert.equal(calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    email: 'student@example.test', password: 'correct horse battery staple'
  });
  assert.equal(new Headers(calls[0].options.headers).has('authorization'), false);
});

test('classifies rejected credentials separately from sign-in service failures', async () => {
  const denied = setup(async () => jsonResponse(401, { message: 'denied' })).client;
  await assert.rejects(
    denied.authenticate({ email: 'student@example.test', password: 'wrong' }),
    (error) => error instanceof AuthenticationError && error.status === 401
  );

  const unavailable = setup(async () => jsonResponse(500, { message: 'down' })).client;
  await assert.rejects(
    unavailable.authenticate({ email: 'student@example.test', password: 'password' }),
    (error) => error instanceof ApiError && !(error instanceof AuthenticationError) && error.status === 500
  );
});

test('does not replace usable network data when cache persistence fails', async () => {
  const cacheStorage = {
    getItem() { return null; },
    setItem() { throw new DOMException('full', 'QuotaExceededError'); },
    removeItem() {}
  };
  const { client } = setup(async () => jsonResponse(200, { teams: [] }), { cacheStorage });
  assert.deepEqual(await client.apiRequest('teams'), {
    data: [], source: 'network', stale: false, cachedAt: null
  });
});

test('does not replace a typed network outcome when cache reads fail', async () => {
  const cacheStorage = {
    getItem() { throw new DOMException('blocked', 'SecurityError'); },
    setItem() {},
    removeItem() {}
  };
  const { client } = setup(async () => { throw new TypeError('offline'); }, { cacheStorage });
  await assert.rejects(client.apiRequest('teams'), (error) => error instanceof ApiError && error.status === null);
});

for (const status of [429, 500]) {
  test(`returns a typed ${status} error after exactly four attempts without cache`, async () => {
    let calls = 0;
    const { client, sleeps } = setup(async () => {
      calls += 1;
      return jsonResponse(status, { message: 'unavailable' });
    });
    await assert.rejects(client.apiRequest('games'), (error) => (
      error instanceof ApiError && error.status === status && error.recoverable
    ));
    assert.equal(calls, 4);
    assert.deepEqual(sleeps, [1000, 2000, 4000]);
  });
}

test('does not retry a non-retryable HTTP error', async () => {
  let calls = 0;
  const { client, sleeps } = setup(async () => {
    calls += 1;
    return jsonResponse(404, { message: 'missing' });
  });
  await assert.rejects(client.apiRequest('games'), (error) => (
    error instanceof ApiError && error.status === 404 && !error.recoverable
  ));
  assert.equal(calls, 1);
  assert.deepEqual(sleeps, []);
});

test('aborts promptly while waiting for retry backoff', async () => {
  const sessionStorage = new MemoryStorage();
  const session = createSessionStore(sessionStorage);
  session.setToken(TEST_TOKEN);
  const controller = new AbortController();
  const client = createApiClient({
    baseUrl: 'https://api.example.test',
    fetchImpl: async () => jsonResponse(429, {}),
    session,
    cacheStorage: new MemoryStorage()
  });
  const startedAt = Date.now();
  await assert.rejects(client.apiRequest('games', {
    signal: controller.signal,
    onRetry: () => { queueMicrotask(() => controller.abort()); }
  }), (error) => error?.name === 'AbortError');
  assert.ok(Date.now() - startedAt < 200, 'abort should not wait for the one-second backoff');
});

test('wraps authentication network failures in a typed recoverable ApiError', async () => {
  const { client } = setup(async () => { throw new TypeError('offline'); });
  await assert.rejects(
    client.authenticate({ email: 'student@example.test', password: 'password' }),
    (error) => error instanceof ApiError && !(error instanceof AuthenticationError) && error.status === null
  );
});

test('does not let a rejected expiration callback mask the 401 AuthenticationError', async () => {
  const { client } = setup(async () => jsonResponse(401, {}), {
    onSessionExpired: async () => { throw new Error('view failed'); }
  });
  await assert.rejects(client.apiRequest('games'), (error) => (
    error instanceof AuthenticationError && error.status === 401
  ));
});

test('deduplicates concurrent expiration callbacks for the same token', async () => {
  let notifications = 0;
  const { client } = setup(async () => jsonResponse(401, {}), {
    onSessionExpired: async () => {
      notifications += 1;
      await new Promise((resolve) => setImmediate(resolve));
    }
  });
  const results = await Promise.allSettled([
    client.apiRequest('games'),
    client.apiRequest('teams')
  ]);
  assert.equal(notifications, 1);
  assert.ok(results.every(({ reason }) => reason instanceof AuthenticationError));
});

test('does not let a late 401 for an old bearer token clear a newly authenticated session', async () => {
  let resolveOldRequest;
  let notifications = 0;
  const { client, session } = setup(async (url) => {
    if (url.endsWith('/get/games')) {
      return await new Promise((resolve) => { resolveOldRequest = resolve; });
    }
    return jsonResponse(200, { user: { id: 1 }, token: NEW_TOKEN });
  }, { onSessionExpired: () => { notifications += 1; } });

  const oldRequest = client.apiRequest('games');
  await client.authenticate({ email: 'student@example.test', password: 'password' });
  resolveOldRequest(jsonResponse(401, {}));

  await assert.rejects(oldRequest, AuthenticationError);
  assert.equal(session.getToken(), NEW_TOKEN);
  assert.equal(notifications, 0);
});

test('treats an aborted data signal as authoritative and never falls back to cache', async () => {
  const reason = { code: 'selection-changed' };
  const controller = new AbortController();
  const { client, cacheStorage } = setup(async () => {
    controller.abort(reason);
    throw new TypeError('fetch masked the abort');
  });
  cacheStorage.setItem('wc26:cache:v1:games', JSON.stringify({
    version: 1, endpoint: 'games', savedAt: '2026-07-13T11:00:00.000Z', data: []
  }));

  await assert.rejects(
    client.apiRequest('games', { signal: controller.signal }),
    (error) => error === reason
  );
});

test('propagates a custom authentication abort reason instead of wrapping it as a network error', async () => {
  const reason = new Error('login superseded');
  const controller = new AbortController();
  const { client } = setup(async () => {
    controller.abort(reason);
    throw new TypeError('fetch masked the abort');
  });

  await assert.rejects(
    client.authenticate(
      { email: 'student@example.test', password: 'password' },
      { signal: controller.signal }
    ),
    (error) => error === reason
  );
});

test('does not cache data when cancellation occurs while reading the response body', async () => {
  const reason = { code: 'body-read-cancelled' };
  const controller = new AbortController();
  const { client, cacheStorage } = setup(async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => {
      controller.abort(reason);
      return { games: [] };
    }
  }));

  await assert.rejects(
    client.apiRequest('games', { signal: controller.signal }),
    (error) => error === reason
  );
  assert.equal(cacheStorage.getItem('wc26:cache:v1:games'), null);
});

test('does not store a token when cancellation occurs while reading the authentication body', async () => {
  const reason = new Error('authentication body cancelled');
  const controller = new AbortController();
  const { client, session } = setup(async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => {
      controller.abort(reason);
      return { user: { id: 1 }, token: 'jwt-must-not-be-stored' };
    }
  }));

  await assert.rejects(
    client.authenticate(
      { email: 'student@example.test', password: 'password' },
      { signal: controller.signal }
    ),
    (error) => error === reason
  );
  assert.equal(session.getToken(), TEST_TOKEN);
});

test('falls back to endpoint cache when a successful response contains invalid JSON', async () => {
  const { client, cacheStorage } = setup(async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => { throw new SyntaxError('invalid JSON'); }
  }));
  cacheStorage.setItem('wc26:cache:v1:games', JSON.stringify({
    version: 1, endpoint: 'games', savedAt: '2026-07-13T11:00:00.000Z', data: [{ id: 'cached' }]
  }));

  assert.deepEqual(await client.apiRequest('games'), {
    data: [{ id: 'cached' }], source: 'cache', stale: true, cachedAt: '2026-07-13T11:00:00.000Z'
  });
});

test('falls back to endpoint cache for a malformed successful endpoint contract', async () => {
  const { client, cacheStorage } = setup(async () => jsonResponse(200, { unexpected: [] }));
  cacheStorage.setItem('wc26:cache:v1:teams', JSON.stringify({
    version: 1, endpoint: 'teams', savedAt: '2026-07-13T11:00:00.000Z', data: [{ id: 'cached' }]
  }));

  assert.equal((await client.apiRequest('teams')).source, 'cache');
});

test('preserves typed 2xx validation errors when no cache exists', async () => {
  const invalidJson = setup(async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => { throw new SyntaxError('invalid JSON'); }
  })).client;
  await assert.rejects(invalidJson.apiRequest('games'), (error) => (
    error instanceof ApiError && error.status === 200 && error.endpoint === 'games'
  ));

  const malformed = setup(async () => jsonResponse(200, { unexpected: [] })).client;
  await assert.rejects(malformed.apiRequest('games'), (error) => (
    error instanceof ApiError && error.status === 200 && error.endpoint === 'games'
  ));
});

test('forceRetry runs a complete 1s, 2s, 4s sequence for retryable network failures', async () => {
  let calls = 0;
  const retryEvents = [];
  const { client, sleeps } = setup(async () => {
    calls += 1;
    if (calls < 4) throw new TypeError('offline');
    return jsonResponse(200, { games: [] });
  });

  const result = await client.apiRequest('games', {
    forceRetry: true,
    onRetry: (event) => retryEvents.push(event)
  });
  assert.equal(result.source, 'network');
  assert.equal(calls, 4);
  assert.deepEqual(sleeps, [1000, 2000, 4000]);
  assert.deepEqual(retryEvents.map(({ status, attempt }) => ({ status, attempt })), [
    { status: null, attempt: 1 },
    { status: null, attempt: 2 },
    { status: null, attempt: 3 }
  ]);
});

test('forceRetry uses cache only after exhausting all four network attempts', async () => {
  let calls = 0;
  const { client, cacheStorage, sleeps } = setup(async () => {
    calls += 1;
    throw new TypeError('offline');
  });
  cacheStorage.setItem('wc26:cache:v1:groups', JSON.stringify({
    version: 1, endpoint: 'groups', savedAt: '2026-07-13T11:00:00.000Z', data: []
  }));

  assert.equal((await client.apiRequest('groups', { forceRetry: true })).source, 'cache');
  assert.equal(calls, 4);
  assert.deepEqual(sleeps, [1000, 2000, 4000]);
});

test('forceRetry preserves a typed network error after exhaustion without cache', async () => {
  let calls = 0;
  const { client } = setup(async () => {
    calls += 1;
    throw new TypeError('offline');
  });
  await assert.rejects(client.apiRequest('teams', { forceRetry: true }), (error) => (
    error instanceof ApiError && error.status === null && error.recoverable
  ));
  assert.equal(calls, 4);
});
