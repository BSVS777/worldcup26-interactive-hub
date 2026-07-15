export const SESSION_TOKEN_KEY = 'wc26:session-token:v1';

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

function clearLegacyToken(storage) {
  try {
    storage?.removeItem?.(SESSION_TOKEN_KEY);
  } catch {
    // Token removal from blocked storage is best-effort; runtime auth remains memory-only.
  }
}

export function createSessionStore(storage, { now = () => Date.now() } = {}) {
  let memoryToken = null;
  let locallyInvalidatedToken = null;
  clearLegacyToken(storage ?? globalThis.sessionStorage);

  function invalidateSession(token = memoryToken) {
    locallyInvalidatedToken = typeof token === 'string' && token.trim() !== '' ? token.trim() : null;
    memoryToken = null;
    clearLegacyToken(storage ?? globalThis.sessionStorage);
  }

  function getToken() {
    if (!memoryToken) return null;
    if (!isUsableJwt(memoryToken, now)) {
      invalidateSession(memoryToken);
      return null;
    }
    return memoryToken;
  }

  return Object.freeze({
    getToken,

    setToken(token) {
      if (typeof token !== 'string' || token.trim() === '') {
        throw new TypeError('Token must be a non-empty string');
      }
      const normalized = token.trim();
      if (!isUsableJwt(normalized, now)) {
        throw new TypeError('Token must be a valid unexpired JWT');
      }
      memoryToken = normalized;
      locallyInvalidatedToken = null;
      clearLegacyToken(storage ?? globalThis.sessionStorage);
      return normalized;
    },

    clear() {
      invalidateSession(null);
      locallyInvalidatedToken = null;
    },

    getLocallyInvalidatedToken() {
      return locallyInvalidatedToken;
    },

    clearIfToken(expectedToken) {
      if (getToken() !== expectedToken) return false;
      invalidateSession(expectedToken);
      return true;
    }
  });
}
