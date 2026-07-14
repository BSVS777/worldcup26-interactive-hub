import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PORT = Number(process.env.PORT || 4173);
const UPSTREAM_API_URL = 'https://worldcup26.ir';
const MAX_REQUEST_BYTES = 16 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DATA_ENDPOINTS = new Set(['stadiums', 'games', 'teams', 'groups']);
const MIME_TYPES = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
});
const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' http://127.0.0.1:4174; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
});

function sendHeaders(response, status, contentType = 'text/plain; charset=utf-8', extra = {}) {
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': contentType,
    ...extra
  });
}

function sendJson(response, status, payload) {
  sendHeaders(response, status, 'application/json; charset=utf-8', { 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

export function resolveRequestPath(requestUrl = '/') {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const isPublicAsset = relativePath === 'index.html'
    || relativePath === 'favicon.svg'
    || relativePath.startsWith('css/')
    || relativePath.startsWith('js/');
  if (!isPublicAsset) return null;
  const filePath = resolve(ROOT, relativePath);
  const indexPath = resolve(ROOT, 'index.html');
  const faviconPath = resolve(ROOT, 'favicon.svg');
  const cssRoot = resolve(ROOT, 'css');
  const jsRoot = resolve(ROOT, 'js');
  const isCanonicalPublicAsset = filePath === indexPath
    || filePath === faviconPath
    || filePath.startsWith(`${cssRoot}${sep}`)
    || filePath.startsWith(`${jsRoot}${sep}`);
  if (!isCanonicalPublicAsset) return null;
  return filePath;
}

export function resolveProxyRoute(method, requestUrl) {
  let url;
  try {
    url = new URL(requestUrl, 'http://localhost');
  } catch {
    return null;
  }
  if (url.search !== '') return null;
  if (method === 'POST' && url.pathname === '/api/auth/authenticate') return '/auth/authenticate';
  const match = /^\/api\/get\/([a-z]+)$/.exec(url.pathname);
  if (method === 'GET' && match && DATA_ENDPOINTS.has(match[1])) return `/get/${match[1]}`;
  return null;
}

async function readRequestBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_REQUEST_BYTES) throw new RangeError('Request body is too large');
    chunks.push(chunk);
  }
  return chunks.length === 0 ? undefined : Buffer.concat(chunks);
}

class UpstreamResponseTooLargeError extends Error {}

async function cancelResponseBody(body) {
  if (typeof body?.cancel !== 'function') return;
  try {
    await body.cancel();
  } catch {
    // The size violation remains authoritative if cancellation also fails.
  }
}

function declaredContentLength(headers) {
  const value = headers?.get?.('content-length');
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
  const length = Number(value);
  return Number.isSafeInteger(length) ? length : null;
}

async function readUpstreamBody(upstream) {
  if (declaredContentLength(upstream.headers) > MAX_RESPONSE_BYTES) {
    await cancelResponseBody(upstream.body);
    throw new UpstreamResponseTooLargeError();
  }

  if (typeof upstream.body?.getReader === 'function') {
    const reader = upstream.body.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        total += chunk.length;
        if (total > MAX_RESPONSE_BYTES) {
          try {
            await reader.cancel();
          } catch {
            // The size violation remains authoritative if cancellation also fails.
          }
          throw new UpstreamResponseTooLargeError();
        }
        chunks.push(chunk);
      }
    } finally {
      reader.releaseLock?.();
    }
    return Buffer.concat(chunks, total);
  }

  // Preserve compatibility with lightweight fetch test doubles that expose
  // arrayBuffer() without a standards-compliant streaming body.
  const payload = Buffer.from(await upstream.arrayBuffer());
  if (payload.length > MAX_RESPONSE_BYTES) throw new UpstreamResponseTooLargeError();
  return payload;
}

export async function proxyApiRequest(request, response, upstreamPath, { fetchImpl, upstreamBaseUrl }) {
  const headers = new Headers({ Accept: 'application/json' });
  const authorization = request.headers.authorization;
  const contentType = request.headers['content-type'];
  if (typeof authorization === 'string') headers.set('Authorization', authorization);
  if (typeof contentType === 'string') headers.set('Content-Type', contentType);

  try {
    const body = request.method === 'POST' ? await readRequestBody(request) : undefined;
    const upstream = await fetchImpl(`${upstreamBaseUrl}${upstreamPath}`, {
      method: request.method,
      headers,
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(10_000)
    });
    const payload = await readUpstreamBody(upstream);
    const extraHeaders = { 'Cache-Control': 'no-store' };
    const retryAfter = upstream.headers.get('retry-after');
    if (retryAfter) extraHeaders['Retry-After'] = retryAfter;
    sendHeaders(
      response,
      upstream.status,
      upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
      extraHeaders
    );
    response.end(payload);
  } catch (error) {
    if (error instanceof UpstreamResponseTooLargeError) {
      sendJson(response, 502, { message: 'Upstream response was too large' });
      return;
    }
    const status = error instanceof RangeError ? 413 : 502;
    sendJson(response, status, { message: status === 413 ? 'Request body is too large' : 'Upstream API unavailable' });
  }
}

export function createAppServer({
  root = ROOT,
  fetchImpl = globalThis.fetch,
  upstreamBaseUrl = UPSTREAM_API_URL
} = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('An upstream fetch implementation is required');

  return createServer(async (request, response) => {
    const proxyPath = resolveProxyRoute(request.method, request.url);
    if (proxyPath) {
      await proxyApiRequest(request, response, proxyPath, { fetchImpl, upstreamBaseUrl });
      return;
    }
    if (new URL(request.url, 'http://localhost').pathname.startsWith('/api/')) {
      sendJson(response, 404, { message: 'API route not found' });
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendHeaders(response, 405);
      response.end('Method not allowed');
      return;
    }

    const requestedPath = resolveRequestPath(request.url);
    if (!requestedPath) {
      sendHeaders(response, 400);
      response.end('Invalid path');
      return;
    }
    const filePath = root === ROOT ? requestedPath : resolve(root, requestedPath.slice(ROOT.length + 1));

    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) throw new Error('Not a file');
      sendHeaders(response, 200, MIME_TYPES[extname(filePath)] ?? 'application/octet-stream');
      if (request.method === 'HEAD') response.end();
      else createReadStream(filePath).pipe(response);
    } catch {
      sendHeaders(response, 404);
      response.end('Not found');
    }
  });
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const server = createAppServer();
  server.listen(PORT, '127.0.0.1', () => {
    process.stdout.write(`World Cup 2026 app: http://127.0.0.1:${PORT}\n`);
  });
}
