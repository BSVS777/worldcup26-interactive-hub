// Live end-to-end proof that the app's JWT is issued by the real
// worldcup26.ir API (or a compatible deployment via WC26_API_BASE_URL):
// optionally register a fresh disposable account, then always authenticate,
// validate the returned JWT structurally, and confirm a real
// Bearer-authenticated GET against a public data endpoint. No dotenv —
// every credential comes only from the shell environment, and neither the
// password nor the full token is ever printed (only a short token preview).
import { AUTH_ENDPOINT, ENDPOINTS, REGISTER_ENDPOINT, UPSTREAM_API_URL } from '../js/config.js';
import { normalizePayload } from '../js/normalizers.js';

const API_BASE_URL = process.env.WC26_API_BASE_URL || UPSTREAM_API_URL;
const NAME = process.env.WC26_API_NAME || 'WC26 Lab Student';
const EMAIL = process.env.WC26_API_EMAIL;
const PASSWORD = process.env.WC26_API_PASSWORD;
const SHOULD_REGISTER = process.env.WC26_API_REGISTER === 'true';

function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function hasJsonContentType(response) {
  const contentType = response.headers.get('content-type') || '';
  return contentType.toLowerCase().includes('application/json');
}

function sanitizeErrorPayload(payload) {
  const text = JSON.stringify(payload ?? null);
  return text
    .replaceAll(EMAIL || '___NO_EMAIL___', '<email>')
    .replaceAll(PASSWORD || '___NO_PASSWORD___', '<password>')
    .slice(0, 240);
}

async function safeErrorBody(response) {
  try {
    return sanitizeErrorPayload(await response.clone().json());
  } catch {
    return '<non-json-body>';
  }
}

function tokenPreview(token) {
  if (typeof token !== 'string' || token.length < 16) return '<token>';
  return `${token.slice(0, 6)}…${token.slice(-6)}`;
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => part === '')) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function missingCredentials() {
  return typeof EMAIL !== 'string' || EMAIL.trim() === '' || typeof PASSWORD !== 'string' || PASSWORD === '';
}

async function fetchOrFail(fetchImpl, url, options, failMarker) {
  try {
    return await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(10000) });
  } catch (cause) {
    console.log(`${failMarker} status=network reason=${cause.message}`);
    process.exit(1);
  }
}

async function attemptRegister(fetchImpl) {
  const response = await fetchOrFail(fetchImpl, joinUrl(API_BASE_URL, REGISTER_ENDPOINT.path), {
    method: REGISTER_ENDPOINT.method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: NAME, email: EMAIL.trim(), password: PASSWORD })
  }, 'LIVE_API_REGISTER_FAILED');

  if (response.ok) {
    console.log('LIVE_API_REGISTER_PASS status=200');
    return;
  }

  // The real API answers a duplicate email with a generic HTTP 400 (it has
  // never been observed returning 409), so a 400 here is treated as "the
  // account likely already exists" rather than a critical failure — the
  // probe continues straight to login, which is the actual thing this run
  // needs to prove.
  if (response.status === 400) {
    console.log(`LIVE_API_REGISTER_SKIPPED reason=likely-existing-account-or-rejected-data status=400 body=${await safeErrorBody(response)}`);
    return;
  }

  console.log(`LIVE_API_REGISTER_FAILED status=${response.status} body=${await safeErrorBody(response)}`);
  process.exit(1);
}

async function attemptAuthenticate(fetchImpl) {
  const response = await fetchOrFail(fetchImpl, joinUrl(API_BASE_URL, AUTH_ENDPOINT.path), {
    method: AUTH_ENDPOINT.method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL.trim(), password: PASSWORD })
  }, 'LIVE_API_AUTH_FAILED');

  if (!response.ok) {
    console.log(`LIVE_API_AUTH_FAILED status=${response.status} body=${await safeErrorBody(response)}`);
    process.exit(1);
  }
  if (!hasJsonContentType(response)) {
    console.log(`LIVE_API_AUTH_FAILED status=${response.status} reason=non-json-response`);
    process.exit(1);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (cause) {
    console.log(`LIVE_API_CONTRACT_FAILED reason=invalid-json:${cause.message}`);
    process.exit(1);
  }
  if (typeof payload?.token !== 'string' || payload.token.trim() === '') {
    console.log('LIVE_API_CONTRACT_FAILED reason=missing-token');
    process.exit(1);
  }
  console.log('LIVE_API_AUTH_PASS status=200');
  return payload.token.trim();
}

function validateJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => part === '')) {
    console.log('LIVE_API_CONTRACT_FAILED reason=not-three-segments');
    process.exit(1);
  }
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload !== 'object') {
    console.log('LIVE_API_CONTRACT_FAILED reason=undecodable-payload');
    process.exit(1);
  }
  if (!Number.isFinite(payload.exp)) {
    console.log('LIVE_API_CONTRACT_FAILED reason=missing-exp');
    process.exit(1);
  }
  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    console.log('LIVE_API_CONTRACT_FAILED reason=expired');
    process.exit(1);
  }
  console.log(`LIVE_API_JWT_VALID_PASS token_preview=${tokenPreview(token)}`);
}

async function verifyBearerRequest(fetchImpl, token) {
  const contract = ENDPOINTS.games;
  const response = await fetchOrFail(fetchImpl, joinUrl(API_BASE_URL, contract.path), {
    method: contract.method,
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
  }, 'LIVE_API_BEARER_FAILED');

  if (!response.ok) {
    console.log(`LIVE_API_BEARER_FAILED status=${response.status} body=${await safeErrorBody(response)}`);
    process.exit(1);
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    console.log(`LIVE_API_BEARER_FAILED status=${response.status} reason=invalid-json`);
    process.exit(1);
  }
  const rows = normalizePayload('games', payload);
  console.log(`LIVE_API_BEARER_PASS status=200 games=${rows.length}`);
}

async function main() {
  if (missingCredentials()) {
    console.log('LIVE_API_AUTH_PROBE_SKIPPED missing=WC26_API_EMAIL,WC26_API_PASSWORD');
    return;
  }

  const fetchImpl = globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('global fetch is not available in this Node runtime');

  if (SHOULD_REGISTER) await attemptRegister(fetchImpl);

  const token = await attemptAuthenticate(fetchImpl);
  validateJwt(token);
  await verifyBearerRequest(fetchImpl, token);
}

await main();
