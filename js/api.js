import { ENDPOINTS, AUTH_ENDPOINT } from './config.js';
import { readEndpointCache, writeEndpointCache } from './cache.js';
import { normalizePayload } from './normalizers.js';
import { createSessionStore } from './session.js';

const BACKOFF_MS = Object.freeze([1000, 2000, 4000]);

export class ApiError extends Error {
  constructor(message, { status = null, endpoint = null, recoverable = true, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.endpoint = endpoint;
    this.recoverable = recoverable;
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = 'Authentication is required', options = {}) {
    super(message, { ...options, recoverable: true });
    this.name = 'AuthenticationError';
  }
}

function abortReason(signal) {
  return signal?.reason ?? new DOMException('The operation was aborted', 'AbortError');
}

function defaultSleep(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    let timerId;
    const cleanup = () => {
      if (timerId !== undefined) clearTimeout(timerId);
      signal?.removeEventListener('abort', handleAbort);
    };
    const handleAbort = () => {
      cleanup();
      reject(abortReason(signal));
    };
    if (signal?.aborted) {
      handleAbort();
      return;
    }
    timerId = setTimeout(() => {
      cleanup();
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function hasJsonContentType(response) {
  if (typeof response?.headers?.get !== 'function') return true;
  const contentType = response.headers.get('content-type');
  return typeof contentType === 'string' && contentType.toLowerCase().includes('application/json');
}

function retryAfterMilliseconds(value, now) {
  // The lab contract requires honoring any larger valid Retry-After, so this
  // client intentionally does not impose a product-specific maximum delay.
  if (typeof value !== 'string' || value.trim() === '') return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? 0 : Math.max(0, date - now().getTime());
}

async function readJson(response, endpoint, signal) {
  let payload;
  try {
    payload = await response.json();
  } catch (cause) {
    if (signal?.aborted) throw abortReason(signal);
    throw new ApiError('The API returned invalid JSON', { status: response.status, endpoint, cause });
  }
  if (signal?.aborted) throw abortReason(signal);
  return payload;
}

function cachedResult(endpoint, cacheStorage) {
  const entry = readEndpointCache(endpoint, { storage: cacheStorage });
  return entry ? { data: entry.data, source: 'cache', stale: true, cachedAt: entry.savedAt } : null;
}

export function createApiClient({
  baseUrl = 'https://worldcup26.ir',
  fetchImpl = globalThis.fetch,
  session = createSessionStore(),
  cacheStorage = globalThis.localStorage,
  onSessionExpired = () => {},
  sleep = defaultSleep,
  now = () => new Date()
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('A fetch implementation is required');
  let expiredToken = null;
  let expirationNotification = null;

  async function notifySessionExpired(token, endpoint) {
    if (expiredToken !== token) {
      expiredToken = token;
      expirationNotification = (async () => {
        try {
          await onSessionExpired({ endpoint });
        } catch {
          // View notification failures must not replace the authentication error.
        }
      })();
    }
    await expirationNotification;
  }

  async function apiRequest(endpointKey, {
    path = ENDPOINTS[endpointKey]?.path,
    method = ENDPOINTS[endpointKey]?.method,
    body,
    cache = ENDPOINTS[endpointKey]?.cache !== false,
    signal,
    onRetry = () => {},
    forceRetry = false
  } = {}) {
    if (!Object.hasOwn(ENDPOINTS, endpointKey) || typeof path !== 'string' || typeof method !== 'string') {
      throw new TypeError(`Unknown data endpoint: ${endpointKey}`);
    }

    const token = session.getToken();
    if (!token) {
      const invalidatedToken = session.getLocallyInvalidatedToken?.();
      if (invalidatedToken) await notifySessionExpired(invalidatedToken, endpointKey);
      throw new AuthenticationError('A valid session is required', { endpoint: endpointKey });
    }

    const headers = new Headers({ Accept: 'application/json', Authorization: `Bearer ${token}` });
    const request = { method, headers, signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer' };
    if (body !== undefined) {
      headers.set('Content-Type', 'application/json');
      request.body = JSON.stringify(body);
    }

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      if (signal?.aborted) throw abortReason(signal);
      let response;
      try {
        response = await fetchImpl(joinUrl(baseUrl, path), request);
      } catch (cause) {
        if (signal?.aborted) throw abortReason(signal);
        if (cause?.name === 'AbortError') throw cause;
        if (forceRetry && attempt < 4) {
          const delayMs = BACKOFF_MS[attempt - 1];
          await onRetry({
            endpoint: endpointKey,
            status: null,
            attempt,
            nextAttempt: attempt + 1,
            delayMs
          });
          await sleep(delayMs, signal);
          continue;
        }
        const fallback = cache ? cachedResult(endpointKey, cacheStorage) : null;
        if (fallback) return fallback;
        throw new ApiError('Network request failed', { endpoint: endpointKey, recoverable: true, cause });
      }
      if (signal?.aborted) throw abortReason(signal);

      if (response.ok) {
        let data;
        try {
          if (!hasJsonContentType(response)) {
            throw new ApiError('The API returned a non-JSON response', { status: response.status, endpoint: endpointKey });
          }
          const payload = await readJson(response, endpointKey, signal);
          data = normalizePayload(endpointKey, payload);
        } catch (cause) {
          if (signal?.aborted) throw abortReason(signal);
          const fallback = cache ? cachedResult(endpointKey, cacheStorage) : null;
          if (fallback) return fallback;
          if (cause instanceof ApiError) throw cause;
          throw new ApiError('The API response does not match the expected contract', {
            status: response.status, endpoint: endpointKey, recoverable: true, cause
          });
        }
        if (cache) writeEndpointCache(endpointKey, data, { storage: cacheStorage, now: now() });
        return { data, source: 'network', stale: false, cachedAt: null };
      }

      if (response.status === 401) {
        const invalidated = session.clearIfToken(token);
        const locallyInvalidated = session.getLocallyInvalidatedToken?.() === token;
        if (invalidated || locallyInvalidated) await notifySessionExpired(token, endpointKey);
        throw new AuthenticationError('The session expired', { status: 401, endpoint: endpointKey });
      }

      const retryable = response.status === 429 || response.status === 500;
      if (!retryable) {
        throw new ApiError(`API request failed with status ${response.status}`, {
          status: response.status, endpoint: endpointKey, recoverable: response.status >= 500
        });
      }

      if (attempt === 4) {
        const fallback = cache ? cachedResult(endpointKey, cacheStorage) : null;
        if (fallback) return fallback;
        throw new ApiError(`API request failed after 4 attempts with status ${response.status}`, {
          status: response.status, endpoint: endpointKey, recoverable: true
        });
      }

      const backoffMs = BACKOFF_MS[attempt - 1];
      const retryAfterMs = response.status === 429
        ? retryAfterMilliseconds(response.headers.get('retry-after'), now)
        : 0;
      const delayMs = Math.max(backoffMs, retryAfterMs);
      await onRetry({ endpoint: endpointKey, status: response.status, attempt, nextAttempt: attempt + 1, delayMs });
      await sleep(delayMs, signal);
    }

    throw new ApiError('API request ended unexpectedly', { endpoint: endpointKey });
  }

  async function authenticate({ email, password }, { signal } = {}) {
    if (typeof email !== 'string' || email.trim() === '' || typeof password !== 'string' || password === '') {
      throw new TypeError('Email and password are required');
    }
    if (signal?.aborted) throw abortReason(signal);
    let response;
    try {
      response = await fetchImpl(joinUrl(baseUrl, AUTH_ENDPOINT.path), {
        method: AUTH_ENDPOINT.method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        signal,
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer'
      });
    } catch (cause) {
      if (signal?.aborted) throw abortReason(signal);
      if (cause?.name === 'AbortError') throw cause;
      throw new ApiError('Authentication network request failed', {
        endpoint: 'authenticate', recoverable: true, cause
      });
    }
    if (signal?.aborted) throw abortReason(signal);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError(`Authentication failed with status ${response.status}`, { status: response.status });
      }
      throw new ApiError(`Authentication service failed with status ${response.status}`, {
        status: response.status,
        endpoint: 'authenticate',
        recoverable: response.status === 429 || response.status >= 500
      });
    }
    if (!hasJsonContentType(response)) {
      throw new AuthenticationError('Authentication response was not JSON', { status: response.status });
    }
    const payload = await readJson(response, 'authenticate', signal);
    if (typeof payload?.token !== 'string' || payload.token.trim() === '') {
      throw new AuthenticationError('Authentication response did not include a token', { status: response.status });
    }
    const token = session.setToken(payload.token);
    expiredToken = null;
    expirationNotification = null;
    return { user: payload.user ?? null, token };
  }

  return Object.freeze({ apiRequest, authenticate });
}
