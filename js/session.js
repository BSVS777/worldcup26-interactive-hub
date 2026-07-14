export const SESSION_TOKEN_KEY = 'wc26:session-token:v1';

function resolveStorage(storage) {
  const target = storage ?? globalThis.sessionStorage;
  if (!target) throw new Error('Session storage is not available');
  return target;
}

function decodePayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => part === '')) return null;
  try {
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    const payload = JSON.parse(globalThis.atob(padded));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

function isUsableJwt(token, now) {
  if (typeof token !== 'string' || token.trim() === '') return false;
  const payload = decodePayload(token.trim());
  return Number.isFinite(payload?.exp) && payload.exp > Math.floor(now() / 1000);
}

export function createSessionStore(storage, { now = () => Date.now() } = {}) {
  const target = resolveStorage(storage);
  let memoryToken;
  let invalidated = false;
  let locallyInvalidatedToken = null;

  function clearSession() {
    invalidated = true;
    locallyInvalidatedToken = null;
    memoryToken = undefined;
    try {
      target.removeItem(SESSION_TOKEN_KEY);
    } catch {
      // In-memory invalidation remains authoritative for this page lifetime.
    }
  }

  function invalidateSession(token) {
    clearSession();
    locallyInvalidatedToken = typeof token === 'string' && token.trim() !== '' ? token.trim() : null;
  }

  function validateStoredToken(token) {
    if (!isUsableJwt(token, now)) {
      if (token !== null && token !== undefined) invalidateSession(token);
      return null;
    }
    return token.trim();
  }

  return Object.freeze({
    getToken() {
      if (invalidated) return null;
      if (memoryToken !== undefined) return validateStoredToken(memoryToken);
      let token;
      try {
        token = target.getItem(SESSION_TOKEN_KEY);
      } catch {
        invalidated = true;
        return null;
      }
      return validateStoredToken(token);
    },

    setToken(token) {
      if (typeof token !== 'string' || token.trim() === '') {
        throw new TypeError('Token must be a non-empty string');
      }
      const normalized = token.trim();
      if (!isUsableJwt(normalized, now)) {
        throw new TypeError('Token must be a valid unexpired JWT');
      }
      invalidated = false;
      locallyInvalidatedToken = null;
      memoryToken = undefined;
      try {
        target.setItem(SESSION_TOKEN_KEY, normalized);
      } catch {
        // Keep the authenticated session usable in memory for this page lifetime.
        memoryToken = normalized;
      }
      return normalized;
    },

    clear: clearSession,

    getLocallyInvalidatedToken() {
      return locallyInvalidatedToken;
    },

    clearIfToken(expectedToken) {
      if (this.getToken() !== expectedToken) return false;
      clearSession();
      return true;
    }
  });
}
