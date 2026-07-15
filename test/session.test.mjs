import assert from 'node:assert/strict';
import test from 'node:test';

import { SESSION_TOKEN_KEY, createSessionStore } from '../js/session.js';

function jwt(payload = { exp: 4_102_444_800 }) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${encoded}.signature`;
}

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
}

test('keeps JWT only in memory and clears any legacy persisted token', () => {
  const storage = new MemoryStorage();
  storage.setItem(SESSION_TOKEN_KEY, 'legacy-token');
  const session = createSessionStore(storage);

  const token = jwt();
  session.setToken(`  ${token}  `);

  assert.equal(session.getToken(), token);
  assert.equal(storage.getItem(SESSION_TOKEN_KEY), null, 'JWT must not be persisted');
  assert.equal(createSessionStore(storage).getToken(), null, 'a reload starts anonymous because JWT is memory-only');
});

test('rejects empty tokens and clears the active memory session', () => {
  const storage = new MemoryStorage();
  const session = createSessionStore(storage);
  assert.throws(() => session.setToken(''), /non-empty/);
  session.setToken(jwt());
  session.clear();
  assert.equal(session.getToken(), null);
  assert.equal(storage.getItem(SESSION_TOKEN_KEY), null);
});

test('clears only the session that still owns the expected bearer token', () => {
  const session = createSessionStore(new MemoryStorage());
  const token = jwt();
  session.setToken(token);
  assert.equal(session.clearIfToken('different-token'), false);
  assert.equal(session.getToken(), token);
  assert.equal(session.clearIfToken(token), true);
  assert.equal(session.getToken(), null);
  assert.equal(session.getLocallyInvalidatedToken(), token);
});

test('rejects malformed JWTs and ignores malformed persisted values', () => {
  const storage = new MemoryStorage();
  const session = createSessionStore(storage, { now: () => 2_000_000_000_000 });

  assert.throws(() => session.setToken('not-a-jwt'), /valid unexpired JWT/);
  storage.setItem(SESSION_TOKEN_KEY, 'header.not-base64.signature');
  assert.equal(session.getToken(), null);
  assert.equal(storage.getItem(SESSION_TOKEN_KEY), 'header.not-base64.signature');
});

test('expires an in-memory JWT when exp is no longer in the future', () => {
  let currentTime = 2_000_000_000_000;
  const session = createSessionStore(new MemoryStorage(), { now: () => currentTime });
  session.setToken(jwt({ exp: 2_000_000_001 }));
  assert.ok(session.getToken());

  currentTime = 2_000_000_002_000;
  assert.equal(session.getToken(), null);
  assert.equal(session.getLocallyInvalidatedToken(), jwt({ exp: 2_000_000_001 }));
});
