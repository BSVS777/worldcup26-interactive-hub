import { ENDPOINTS, UPSTREAM_API_URL } from '../js/config.js';
import { normalizePayload } from '../js/normalizers.js';

const API_BASE_URL = process.env.WC26_API_BASE_URL || UPSTREAM_API_URL;
const REQUIRED_ENDPOINTS = ['teams', 'games', 'groups', 'stadiums'];

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

async function requestPublicEndpoint(fetchImpl, endpoint) {
  const contract = ENDPOINTS[endpoint];
  const response = await fetchImpl(joinUrl(API_BASE_URL, contract.path), {
    method: contract.method,
    headers: { Accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    throw new Error(`${endpoint} failed with HTTP ${response.status}`);
  }
  const payload = await readJson(response, endpoint);
  const root = payload?.[endpoint];
  if (!Array.isArray(root)) {
    throw new Error(`${endpoint} response did not include a "${endpoint}" array`);
  }
  return normalizePayload(endpoint, payload);
}

async function main() {
  const fetchImpl = globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('global fetch is not available in this Node runtime');

  const counts = {};
  for (const endpoint of REQUIRED_ENDPOINTS) {
    const rows = await requestPublicEndpoint(fetchImpl, endpoint);
    counts[endpoint] = rows.length;
  }

  console.log(`LIVE_API_PUBLIC_PROBE_PASSED teams=${counts.teams} games=${counts.games} groups=${counts.groups} stadiums=${counts.stadiums}`);
}

await main();
