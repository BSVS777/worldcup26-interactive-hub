import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

import { createAppServer, proxyApiRequest, resolveProxyRoute, resolveRequestPath } from '../tools/app-server.mjs';

class MockResponse {
  status = null;
  headers = null;
  body = null;
  writeHead(status, headers) {
    this.status = status;
    this.headers = headers;
  }
  end(body) {
    this.body = body;
  }
}

test('proxy allowlists authentication and the four exact data endpoints', () => {
  assert.equal(resolveProxyRoute('POST', '/api/auth/authenticate'), '/auth/authenticate');
  for (const endpoint of ['stadiums', 'games', 'teams', 'groups']) {
    assert.equal(resolveProxyRoute('GET', `/api/get/${endpoint}`), `/get/${endpoint}`);
  }
});

test('proxy rejects method changes, query targets, and arbitrary paths', () => {
  assert.equal(resolveProxyRoute('GET', '/api/auth/authenticate'), null);
  assert.equal(resolveProxyRoute('POST', '/api/get/games'), null);
  assert.equal(resolveProxyRoute('GET', '/api/get/players'), null);
  assert.equal(resolveProxyRoute('GET', '/api/https://evil.example'), null);
  assert.equal(resolveProxyRoute('GET', '/api/get/games?target=https://evil.example'), null);
});

test('static asset allowlist rejects encoded traversal into a non-public root file', () => {
  assert.equal(resolveRequestPath('/css/%2e%2e%2fpackage.json'), null);
  assert.equal(resolveRequestPath('/js/%2e%2e%2fpackage.json'), null);
});

test('explicit favicon is served from the static allowlist with security headers', async (t) => {
  const server = createAppServer({ fetchImpl: async () => { throw new Error('Unexpected proxy request'); } });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/favicon.svg`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/svg+xml');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(await response.text(), /^<svg\b/);
});

test('proxy uses the injected upstream fetch and preserves meaningful HTTP evidence', async () => {
  const calls = [];
  const request = Readable.from([Buffer.from('{"email":"student@example.test","password":"secret"}')]);
  request.method = 'POST';
  request.headers = {
    'content-type': 'application/json',
    cookie: 'must-not-forward=true',
    host: '127.0.0.1:4173'
  };
  const response = new MockResponse();

  await proxyApiRequest(request, response, '/auth/authenticate', {
    upstreamBaseUrl: 'https://upstream.example',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response('{"message":"slow down"}', {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': '3' }
      });
    }
  });

  assert.equal(calls[0].url, 'https://upstream.example/auth/authenticate');
  assert.equal(new Headers(calls[0].options.headers).has('cookie'), false);
  assert.equal(new Headers(calls[0].options.headers).has('host'), false);
  assert.equal(String(calls[0].options.body), '{"email":"student@example.test","password":"secret"}');
  assert.equal(response.status, 429);
  assert.equal(response.headers['Retry-After'], '3');
  assert.deepEqual(JSON.parse(response.body.toString()), { message: 'slow down' });
});

test('proxy rejects an oversized declared response before reading its body', async () => {
  let reads = 0;
  let cancellations = 0;
  const request = Readable.from([]);
  request.method = 'GET';
  request.headers = {};
  const response = new MockResponse();

  await proxyApiRequest(request, response, '/get/games', {
    upstreamBaseUrl: 'https://upstream.example',
    fetchImpl: async () => ({
      status: 200,
      headers: new Headers({ 'content-length': String((2 * 1024 * 1024) + 1) }),
      body: {
        getReader() {
          reads += 1;
          return { cancel: async () => { cancellations += 1; } };
        },
        cancel: async () => { cancellations += 1; }
      }
    })
  });

  assert.equal(response.status, 502);
  assert.deepEqual(JSON.parse(response.body), { message: 'Upstream response was too large' });
  assert.equal(reads, 0);
  assert.equal(cancellations, 1);
});

test('proxy stops and cancels a streamed response as soon as the cap is exceeded', async () => {
  let reads = 0;
  let cancellations = 0;
  const chunks = [new Uint8Array(2 * 1024 * 1024), new Uint8Array([1])];
  const request = Readable.from([]);
  request.method = 'GET';
  request.headers = {};
  const response = new MockResponse();

  await proxyApiRequest(request, response, '/get/games', {
    upstreamBaseUrl: 'https://upstream.example',
    fetchImpl: async () => ({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      body: {
        getReader() {
          return {
            read: async () => {
              reads += 1;
              return chunks.length > 0 ? { done: false, value: chunks.shift() } : { done: true };
            },
            cancel: async () => { cancellations += 1; }
          };
        }
      }
    })
  });

  assert.equal(response.status, 502);
  assert.deepEqual(JSON.parse(response.body), { message: 'Upstream response was too large' });
  assert.equal(reads, 2);
  assert.equal(cancellations, 1);
});
