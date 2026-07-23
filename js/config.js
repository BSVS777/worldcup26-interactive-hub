export const UPSTREAM_API_URL = 'https://worldcup26.ir';
export const LOCAL_TEST_API_URL = 'http://127.0.0.1:4174';

export const ENDPOINTS = Object.freeze({
  stadiums: Object.freeze({ path: '/get/stadiums', method: 'GET', cache: true }),
  games: Object.freeze({ path: '/get/games', method: 'GET', cache: true }),
  teams: Object.freeze({ path: '/get/teams', method: 'GET', cache: true }),
  groups: Object.freeze({ path: '/get/groups', method: 'GET', cache: true })
});

export const AUTH_ENDPOINT = Object.freeze({ path: '/auth/authenticate', method: 'POST', cache: false });
export const REGISTER_ENDPOINT = Object.freeze({ path: '/auth/register', method: 'POST', cache: false });

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isLocalOrigin(location = globalThis.location) {
  const isHttp = location?.protocol === 'http:' || location?.protocol === 'https:';
  return Boolean(isHttp && LOCAL_HOSTS.has(location.hostname));
}

export function isTestMode(location = globalThis.location) {
  if (!isLocalOrigin(location) || typeof location?.search !== 'string') return false;
  const values = new URLSearchParams(location.search).getAll('testMode');
  return values.length === 1 && values[0] === '1';
}

export function resolveApiBaseUrl(location = globalThis.location) {
  if (isTestMode(location)) return LOCAL_TEST_API_URL;
  if (isLocalOrigin(location) && typeof location.origin === 'string') {
    return `${location.origin}/api`;
  }
  return UPSTREAM_API_URL;
}

export const APP_CONFIG = Object.freeze({ apiBaseUrl: UPSTREAM_API_URL, endpoints: ENDPOINTS });
