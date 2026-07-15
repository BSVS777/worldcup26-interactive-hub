import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.TEST_PORT || 4174);
const HOST = '127.0.0.1';
const ALLOWED_ORIGINS = new Set([
  'http://127.0.0.1:4173',
  'http://localhost:4173'
]);
const counters = new Map();
const GROUP_IDS = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);

function base64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

export const TEST_TOKEN = `test.${base64Url({ exp: 1893456000, sub: 'wc26-test-user' })}.signature`;

function makeTeams() {
  return GROUP_IDS.flatMap((group, groupIndex) => Array.from({ length: 4 }, (_, teamIndex) => {
    const number = groupIndex * 4 + teamIndex + 1;
    return {
      id: `t${number}`,
      name: `Test Team ${number}`,
      group,
      flag: `/flags/test-${number}.svg`
    };
  }));
}

const TEAMS = Object.freeze(makeTeams());
const GROUPS = Object.freeze(GROUP_IDS.map((group, groupIndex) => Object.freeze({
  id: group,
  name: `Group ${group}`,
  teams: Object.freeze(Array.from({ length: 4 }, (_, teamIndex) => {
    const number = groupIndex * 4 + teamIndex + 1;
    return Object.freeze({ team_id: `t${number}`, points: Math.max(0, 9 - teamIndex * 2), gf: 5 - teamIndex, ga: teamIndex });
  }))
})));
const STADIUMS = Object.freeze([
  Object.freeze({ id: 's1', name: 'Signal Park', city: 'Toronto', capacity: 60000 }),
  Object.freeze({ id: 's2', name: 'North Rail Stadium', city: 'Monterrey', capacity: 53000 }),
  Object.freeze({ id: 's3', name: 'Coastline Field', city: 'Los Angeles', capacity: 71000 })
]);
const GAMES = Object.freeze(GROUP_IDS.flatMap((group, groupIndex) => {
  const start = groupIndex * 4 + 1;
  const stadium = STADIUMS[groupIndex % STADIUMS.length].id;
  return [
    Object.freeze({
      id: `g${groupIndex + 1}-1`,
      stadium_id: stadium,
      home_team_id: `t${start}`,
      away_team_id: `t${start + 1}`,
      home_score: groupIndex % 3,
      away_score: (groupIndex + 1) % 3,
      finished: true,
      local_date: `2026-06-${String(11 + (groupIndex % 12)).padStart(2, '0')}`
    }),
    Object.freeze({
      id: `g${groupIndex + 1}-2`,
      stadium_id: stadium,
      home_team_id: `t${start + 2}`,
      away_team_id: `t${start + 3}`,
      home_score: null,
      away_score: null,
      finished: false,
      local_date: `2026-06-${String(12 + (groupIndex % 12)).padStart(2, '0')}`
    })
  ];
}));

const DATA_FIXTURES = Object.freeze({
  '/get/stadiums': Object.freeze({ stadiums: STADIUMS }),
  '/get/games': Object.freeze({ games: GAMES }),
  '/get/teams': Object.freeze({ teams: TEAMS }),
  '/get/groups': Object.freeze({ groups: GROUPS })
});

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

function hasBearerAuth(request) {
  const authorization = request.headers.authorization;
  return typeof authorization === 'string' && authorization.trim().toLowerCase().startsWith('bearer ');
}

function handleAuth(request, response, origin) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { message: 'Method not allowed' }, origin);
    return true;
  }
  sendJson(response, 200, { user: { id: 'wc26-test-user', name: 'WC26 Test User' }, token: TEST_TOKEN }, origin);
  return true;
}

function handleData(request, response, origin, pathname) {
  if (!Object.hasOwn(DATA_FIXTURES, pathname)) return false;
  if (request.method !== 'GET') {
    sendJson(response, 405, { message: 'Method not allowed' }, origin);
    return true;
  }
  if (!hasBearerAuth(request)) {
    sendJson(response, 401, { message: 'Missing bearer token' }, origin);
    return true;
  }
  sendJson(response, 200, DATA_FIXTURES[pathname], origin);
  return true;
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
    if (url.pathname === '/auth/authenticate') {
      handleAuth(request, response, origin);
      return;
    }
    if (handleData(request, response, origin, url.pathname)) return;
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

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  createTestServer().listen(PORT, HOST, () => {
    process.stdout.write(`WC26 deterministic test server: http://${HOST}:${PORT}\n`);
  });
}
