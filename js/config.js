export const UPSTREAM_API_URL = 'https://worldcup26.ir';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

export function resolveApiBaseUrl(location = globalThis.location) {
  const isHttp = location?.protocol === 'http:' || location?.protocol === 'https:';
  if (isHttp && LOCAL_HOSTS.has(location.hostname) && typeof location.origin === 'string') {
    return `${location.origin}/api`;
  }
  return UPSTREAM_API_URL;
}

export const APP_CONFIG = Object.freeze({ apiBaseUrl: UPSTREAM_API_URL });
