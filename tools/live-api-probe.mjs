import { AUTH_ENDPOINT, ENDPOINTS, UPSTREAM_API_URL } from '../js/config.js';
import { normalizePayload } from '../js/normalizers.js';

const API_BASE_URL = process.env.WC26_API_BASE_URL || UPSTREAM_API_URL;
const EMAIL = process.env.WC26_API_EMAIL;
const PASSWORD = process.env.WC26_API_PASSWORD;
const REQUIRED_ENDPOINTS = ['stadiums', 'games', 'teams', 'groups'];

function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function requireJsonResponse(response, label) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`${label} returned non-JSON content-type: ${contentType || 'missing'}`);
  }
}

async function readJson(response, label) {
  requireJsonResponse(response, label);
  try {
    return await response.json();
  } catch (cause) {
    throw new Error(`${label} returned invalid JSON`, { cause });
  }
}

async function requestJson(fetchImpl, url, options, label) {
  const response = await fetchImpl(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}`);
  }
  return readJson(response, label);
}

function missingCredentials() {
  return typeof EMAIL !== 'string' || EMAIL.trim() === '' || typeof PASSWORD !== 'string' || PASSWORD === '';
}

async function main() {
  if (missingCredentials()) {
    console.log('LIVE_API_PROBE_SKIPPED missing=WC26_API_EMAIL,WC26_API_PASSWORD');
    return;
  }

  const fetchImpl = globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('global fetch is not available in this Node runtime');

  const authPayload = await requestJson(fetchImpl, joinUrl(API_BASE_URL, AUTH_ENDPOINT.path), {
    method: AUTH_ENDPOINT.method,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL.trim(), password: PASSWORD })
  }, 'auth');

  if (typeof authPayload.token !== 'string' || authPayload.token.trim() === '') {
    throw new Error('auth response did not include a non-empty token field');
  }
  const token = authPayload.token.trim();
  const counts = {};

  for (const endpoint of REQUIRED_ENDPOINTS) {
    const contract = ENDPOINTS[endpoint];
    const payload = await requestJson(fetchImpl, joinUrl(API_BASE_URL, contract.path), {
      method: contract.method,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
    }, endpoint);
    const rows = normalizePayload(endpoint, payload);
    counts[endpoint] = rows.length;
  }

  console.log(`LIVE_API_PROBE_PASS auth=200 token=present stadiums=${counts.stadiums} games=${counts.games} teams=${counts.teams} groups=${counts.groups}`);
}

await main();