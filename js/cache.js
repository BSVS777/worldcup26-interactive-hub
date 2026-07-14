export const CACHE_VERSION = 1;
const CACHE_PREFIX = `wc26:cache:v${CACHE_VERSION}`;
const ALLOWED_ENDPOINTS = new Set(['stadiums', 'games', 'teams', 'groups']);

export const endpointCacheKey = (endpoint) => `${CACHE_PREFIX}:${endpoint}`;

function getStorage(storage) {
  return storage ?? globalThis.localStorage;
}

export function writeEndpointCache(endpoint, data, { storage, now = new Date() } = {}) {
  if (!ALLOWED_ENDPOINTS.has(endpoint)) throw new TypeError(`Unknown cache endpoint: ${endpoint}`);
  const entry = { version: CACHE_VERSION, endpoint, savedAt: now.toISOString(), data };
  try {
    getStorage(storage).setItem(endpointCacheKey(endpoint), JSON.stringify(entry));
  } catch {
    // Cache persistence is best effort; valid network data remains usable.
  }
  return entry;
}

export function readEndpointCache(endpoint, { storage } = {}) {
  if (!ALLOWED_ENDPOINTS.has(endpoint)) return null;
  const target = getStorage(storage);
  const key = endpointCacheKey(endpoint);
  let raw;
  try {
    raw = target.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    const entry = JSON.parse(raw);
    const valid = entry?.version === CACHE_VERSION
      && entry.endpoint === endpoint
      && typeof entry.savedAt === 'string'
      && isCanonicalIsoDate(entry.savedAt)
      && Object.hasOwn(entry, 'data');
    if (!valid) throw new TypeError('Invalid cache entry');
    return entry;
  } catch {
    try {
      target.removeItem(key);
    } catch {
      // An inaccessible cache is equivalent to a miss.
    }
    return null;
  }
}

function isCanonicalIsoDate(value) {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value;
}

export const FAVORITE_TEAM_KEY = 'wc26:favorite-team:v1';
export const fanSnapshotKey = (teamId) => `wc26:fan-snapshot:v1:${teamId}`;
