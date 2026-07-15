import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CACHE_VERSION,
  endpointCacheKey,
  readEndpointCache,
  writeEndpointCache
} from '../js/cache.js';

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
}

test('stores and reads an isolated, versioned endpoint entry', () => {
  const storage = new MemoryStorage();
  const now = new Date('2026-07-13T12:00:00.000Z');

  writeEndpointCache('games', [{ id: 'g-1' }], { storage, now });

  assert.deepEqual(readEndpointCache('games', { storage }), {
    version: CACHE_VERSION,
    endpoint: 'games',
    savedAt: now.toISOString(),
    data: [{ id: 'g-1' }]
  });
  assert.equal(storage.getItem(endpointCacheKey('teams')), null);
});

test('removes only the corrupt endpoint entry', () => {
  const storage = new MemoryStorage();
  storage.setItem(endpointCacheKey('games'), '{broken');
  storage.setItem(endpointCacheKey('teams'), JSON.stringify({
    version: CACHE_VERSION,
    endpoint: 'teams',
    savedAt: '2026-07-13T12:00:00.000Z',
    data: []
  }));

  assert.equal(readEndpointCache('games', { storage }), null);
  assert.equal(storage.getItem(endpointCacheKey('games')), null);
  assert.notEqual(storage.getItem(endpointCacheKey('teams')), null);
});

test('rejects entries with the wrong version, endpoint, date, or missing data', () => {
  const invalidEntries = [
    { version: 2, endpoint: 'games', savedAt: '2026-07-13T12:00:00.000Z', data: [] },
    { version: 1, endpoint: 'teams', savedAt: '2026-07-13T12:00:00.000Z', data: [] },
    { version: 1, endpoint: 'games', savedAt: 'not-a-date', data: [] },
    { version: 1, endpoint: 'games', savedAt: '2026-02-30T12:00:00.000Z', data: [] },
    { version: 1, endpoint: 'games', savedAt: '2026-07-13', data: [] },
    { version: 1, endpoint: 'games', savedAt: '2026-07-13T12:00:00.000Z' }
  ];

  for (const entry of invalidEntries) {
    const storage = new MemoryStorage();
    storage.setItem(endpointCacheKey('games'), JSON.stringify(entry));
    assert.equal(readEndpointCache('games', { storage }), null);
    assert.equal(storage.getItem(endpointCacheKey('games')), null);
  }
});

test('treats unavailable cache storage as a cache miss without throwing', () => {
  const readFailure = {
    getItem() { throw new DOMException('blocked', 'SecurityError'); },
    removeItem() { throw new DOMException('blocked', 'SecurityError'); }
  };
  assert.equal(readEndpointCache('games', { storage: readFailure }), null);

  const corruptRemovalFailure = {
    getItem() { return '{broken'; },
    removeItem() { throw new DOMException('blocked', 'SecurityError'); }
  };
  assert.equal(readEndpointCache('games', { storage: corruptRemovalFailure }), null);
});

test('returns the validated entry even when cache persistence is unavailable', () => {
  const storage = { setItem() { throw new DOMException('full', 'QuotaExceededError'); } };
  const now = new Date('2026-07-13T12:00:00.000Z');
  assert.deepEqual(writeEndpointCache('games', [], { storage, now }), {
    version: CACHE_VERSION, endpoint: 'games', savedAt: now.toISOString(), data: []
  });
});
test('stores every public endpoint in an isolated cache key', () => {
  const storage = new MemoryStorage();
  const now = new Date('2026-07-13T12:00:00.000Z');
  const endpoints = ['stadiums', 'games', 'teams', 'groups'];

  for (const endpoint of endpoints) {
    writeEndpointCache(endpoint, [{ id: endpoint }], { storage, now });
  }

  for (const endpoint of endpoints) {
    const entry = readEndpointCache(endpoint, { storage });
    assert.equal(entry.endpoint, endpoint);
    assert.deepEqual(entry.data, [{ id: endpoint }]);
    for (const other of endpoints.filter((item) => item !== endpoint)) {
      assert.notEqual(endpointCacheKey(endpoint), endpointCacheKey(other));
    }
  }
});
