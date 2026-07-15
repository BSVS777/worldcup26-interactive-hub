import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.TEST_PORT || 4174);
const HOST = '127.0.0.1';
const ALLOWED_ORIGINS = new Set([
  'http://127.0.0.1:4173',
  'http://localhost:4173'
]);
const counters = new Map();

function corsHeaders(origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  };
  if (ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Accept';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  }
  return headers;
}

function sendJson(response, status, payload, origin, extraHeaders = {}) {
  response.writeHead(status, { ...corsHeaders(origin), ...extraHeaders });
  response.end(JSON.stringify(payload));
}

function failNTimes(url, response, origin, status) {
  const key = url.searchParams.get('case') || `default-${status}`;
  const failures = Math.max(0, Number(url.searchParams.get('failures') || 0));
  const count = counters.get(key) ?? 0;
  counters.set(key, count + 1);
  if (count < failures) {
    const extra = status === 429 ? { 'Retry-After': '1' } : {};
    sendJson(response, status, { status, case: key, attempt: count + 1 }, origin, extra);
    return;
  }
  sendJson(response, 200, { ok: true, case: key, attempts: count + 1 }, origin);
}

export function createTestServer() {
  return createServer((request, response) => {
    const origin = request.headers.origin;
    if (request.method === 'OPTIONS') {
      response.writeHead(204, corsHeaders(origin));
      response.end();
      return;
    }

    const url = new URL(request.url, `http://${HOST}:${PORT}`);
    if (request.method === 'POST' && url.pathname === '/test/reset') {
      counters.clear();
      sendJson(response, 200, { ok: true }, origin);
      return;
    }
    if (request.method !== 'GET') {
      sendJson(response, 405, { message: 'Method not allowed' }, origin);
      return;
    }
    if (url.pathname === '/test/401') {
      sendJson(response, 401, { message: 'Deterministic unauthorized response' }, origin);
      return;
    }
    if (url.pathname === '/test/429') {
      failNTimes(url, response, origin, 429);
      return;
    }
    if (url.pathname === '/test/500') {
      failNTimes(url, response, origin, 500);
      return;
    }
    sendJson(response, 404, { message: 'Test route not found' }, origin);
  });
}

const isDirectRun = process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isDirectRun) {
  createTestServer().listen(PORT, HOST, () => {
    process.stdout.write(`WC26 deterministic test server: http://${HOST}:${PORT}\n`);
  });
}
