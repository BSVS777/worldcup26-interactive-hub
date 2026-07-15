import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

async function collectRuntimeFiles(relativeDir) {
  const root = new URL(`../${relativeDir}/`, import.meta.url);
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await collectRuntimeFiles(relativePath));
      continue;
    }
    if (/\.(?:js|mjs|html)$/.test(entry.name)) files.push(relativePath);
  }
  return files;
}

async function readRuntimeFiles() {
  const files = ['index.html', ...await collectRuntimeFiles('js'), ...await collectRuntimeFiles('tools')];
  return Promise.all(files.map(async (file) => ({
    file,
    text: await readFile(new URL(`../${file}`, import.meta.url), 'utf8')
  })));
}

function extractFunctionBody(source, name) {
  const start = source.search(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));
  if (start < 0) return '';
  const bodyStart = source.indexOf('{', start);
  if (bodyStart < 0) return '';
  let depth = 0;
  for (let index = bodyStart; index < source.length; index++) {
    const char = source[index];
    if (char === '{') depth++;
    if (char === '}') depth--;
    if (depth === 0) return source.slice(bodyStart + 1, index);
  }
  return '';
}

test('embedded sign-in uses section semantics and exposes accessibility hooks', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  const ui = await readFile(new URL('../js/ui.js', import.meta.url), 'utf8');
  assert.match(html, /<section id="session-panel"[^>]*aria-labelledby="session-title"/);
  assert.doesNotMatch(html, /id="session-panel"[^>]*role="dialog"/);
  assert.match(html, /id="app-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(app, /announceMessage:\s*'Signed in\./);
  assert.match(app, /view\.focusCurrentView\(\)/);
  assert.match(ui, /getElementById\('main-content'\)|requireElement\(document, 'main-content'/);
  assert.match(ui, /setAttribute\('role', 'dialog'\)/);
  assert.match(ui, /setAttribute\('aria-modal', 'true'\)/);
  assert.match(ui, /element\.inert = inert/);
  assert.match(ui, /addEventListener\('keydown'/);
  assert.match(ui, /event\.key !== 'Tab'/);
});

test('session expiration resets module views before focusing the recovery panel', async () => {
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /function resetModuleViews\(\) \{[\s\S]*tourView\.reset\(\);[\s\S]*timelineView\.reset\(\);[\s\S]*matrixView\.reset\(\);[\s\S]*\}/);
  assert.match(app, /async onSessionExpired\(\) \{\s*resetModuleViews\(\);\s*update\(\{ type: 'SESSION_EXPIRED' \}\);\s*view\.focusSession\(\);\s*\}/);
});

test('README lists the exact package commands and local URLs', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));

  assert.equal(packageJson.scripts.start, 'node tools/app-server.mjs');
  assert.equal(packageJson.scripts.test, 'node --test test/*.mjs');
  assert.equal(packageJson.scripts['test:server'], 'node tools/test-server.mjs');
  assert.equal(packageJson.scripts['test:responsive'], 'python tools/responsive-audit.py');
  assert.equal(packageJson.scripts['test:keyboard'], 'python tools/keyboard-audit.py');
  assert.equal(packageJson.scripts['test:motion'], 'python tools/motion-audit.py');
  assert.equal(packageJson.scripts['test:offline'], 'python tools/offline-audit.py');
  assert.equal(packageJson.scripts['test:failures'], 'python tools/failure-audit.py');
  assert.equal(packageJson.scripts['test:timeline-observer'], 'python tools/timeline-observer-audit.py');
  assert.equal(packageJson.scripts['test:cached-notices'], 'python tools/cached-notice-audit.py');
  assert.equal(packageJson.scripts['test:mobile-drawer'], 'python tools/mobile-drawer-audit.py');
  assert.match(readme, /`npm start`[\s\S]*`node tools\/app-server\.mjs`[\s\S]*`http:\/\/127\.0\.0\.1:4173`/);
  assert.match(readme, /`npm test`[\s\S]*`node --test test\/\*\.mjs`/);
  assert.match(readme, /`npm run test:server`[\s\S]*`node tools\/test-server\.mjs`[\s\S]*`http:\/\/127\.0\.0\.1:4174`/);
  assert.match(readme, /`npm run test:responsive`[\s\S]*`python tools\/responsive-audit\.py`/);
  assert.match(readme, /`npm run test:keyboard`[\s\S]*`python tools\/keyboard-audit\.py`/);
  assert.match(readme, /`npm run test:motion`[\s\S]*`python tools\/motion-audit\.py`/);
  assert.match(readme, /`npm run test:offline`[\s\S]*`python tools\/offline-audit\.py`/);
  assert.match(readme, /`npm run test:failures`[\s\S]*`python tools\/failure-audit\.py`/);
  assert.match(readme, /`npm run test:mobile-drawer`[\s\S]*`python tools\/mobile-drawer-audit\.py`/);
  assert.match(readme, /`http:\/\/127\.0\.0\.1:4173\/\?testMode=1`/);
});

test('runtime code keeps async and fetch responsibilities centralized', async () => {
  const runtimeFiles = await readRuntimeFiles();
  const forbiddenPromiseFiles = runtimeFiles.filter(({ text }) => /\.(?:then|catch)\s*\(/.test(text));
  assert.deepEqual(forbiddenPromiseFiles.map(({ file }) => file), []);

  const viewFilesWithFetch = runtimeFiles.filter(({ file, text }) => file.startsWith('js/') && /-view\.js$/.test(file) && /\bfetch\s*\(/.test(text));
  assert.deepEqual(viewFilesWithFetch.map(({ file }) => file), []);

  const api = runtimeFiles.find(({ file }) => file === 'js/api.js')?.text ?? '';
  assert.match(api, /if \(response\.ok\)/);
  assert.match(api, /normalizePayload\(endpointKey, payload\)/);
  assert.match(api, /new Headers\(\{ Accept: 'application\/json', Authorization: `Bearer \$\{token\}` \}\)/);
});

test('document declares the explicitly served favicon', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/);
});

test('tour module exposes a live venue grid and detail region alongside the shared placeholder', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const tourView = await readFile(new URL('../js/tour-view.js', import.meta.url), 'utf8');
  assert.match(html, /<div id="tour-view" class="tour-view" hidden>/);
  assert.match(html, /<ul id="tour-venue-list" class="venue-grid" aria-label="[^"]+">/);
  assert.match(html, /<div id="tour-venue-detail" class="venue-detail" role="status" aria-live="polite">/);
  assert.match(tourView, /scrollIntoView\(\{\s*behavior:\s*'smooth'\s*\}\)/);
});

test('styles preserve focus visibility, pointer scrolling, and device safe areas', async () => {
  const css = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
  assert.match(css, /--focus:/);
  assert.match(css, /touch-action:\s*pan-y/);
  assert.match(css, /env\(safe-area-inset-left\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(css, /animation-iteration-count:\s*1\s*!important/);
});

test('hidden modules cannot be re-displayed by component display rules', async () => {
  const css = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/s);
});

test('interactive listeners stay centralized and are not registered during render/reset paths', async () => {
  const runtimeFiles = Object.fromEntries((await readRuntimeFiles()).map(({ file, text }) => [file, text]));
  const listenerCounts = new Map([
    ['js/app.js', 1],
    ['js/ui.js', 4],
    ['js/tour-view.js', 1],
    ['js/agenda-view.js', 2],
    ['js/timeline-view.js', 2],
    ['js/fan-dashboard-view.js', 1],
    ['js/matrix-view.js', 0]
  ]);

  for (const [file, expectedCount] of listenerCounts) {
    const text = runtimeFiles[file] ?? '';
    const actualCount = (text.match(/\.addEventListener\(/g) ?? []).length;
    assert.equal(actualCount, expectedCount, `${file} listener count changed`);
    for (const repeatableName of ['render', 'reset', 'load', 'ensureLoaded', 'retry', 'refresh']) {
      assert.doesNotMatch(extractFunctionBody(text, repeatableName), /\.addEventListener\(/, file + ' registers listeners inside ' + repeatableName + '()');
    }
  }

  const api = runtimeFiles['js/api.js'] ?? '';
  assert.match(api, /signal\?\.addEventListener\('abort', handleAbort, \{ once: true \}\)/);
  assert.match(api, /signal\?\.removeEventListener\('abort', handleAbort\)/);
});

test('defense guide covers module endpoints, crossed fields, and resilience challenges', async () => {
  const guide = await readFile(new URL('../docs/GUIA_DEFENSA_INFJ_T.md', import.meta.url), 'utf8');

  for (const phrase of [
    '## Flujo general del sistema',
    '## Endpoints por modulo',
    'Tour Virtual | `/get/stadiums`, `/get/games`',
    'Agenda Simultanea | `/get/games`, `/get/teams`',
    'Timeline Infinito | `/get/games`',
    'Dashboard del Fanatico | `/get/teams`, `/get/games`, `/get/groups`',
    'Matriz de Enfrentamientos | `/get/groups`, `/get/teams`, `/get/games`',
    '## Campos reales cruzados',
    'stadium.id` con `game.stadiumId',
    'game.homeTeamId`, `game.awayTeamId` con `team.id',
    'Que pasa con 401',
    'Que pasa con 429',
    'Que pasa con 500',
    'Que pasa con JWT expirado y observer activo',
    'Que pasa con clics repetidos',
    'Que pasa con cache corrupta',
    'Que pasa si la matriz recibe nuevos resultados'
  ]) {
    assert.ok(guide.includes(phrase), `Missing defense guide phrase: ${phrase}`);
  }
});





test('project stays dependency-light and avoids bundled third-party surface', async () => {
  const rootEntries = await readdir(new URL('../', import.meta.url));
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.equal(packageJson.dependencies, undefined);
  assert.equal(packageJson.devDependencies, undefined);
  assert.equal(rootEntries.includes('node_modules'), false);
  assert.equal(rootEntries.includes('package-lock.json'), false);
  assert.equal(rootEntries.includes('yarn.lock'), false);
  assert.equal(rootEntries.includes('pnpm-lock.yaml'), false);
  assert.doesNotMatch(html, new RegExp(`<script[^>]+src=["']https?://`, 'i'));
  assert.doesNotMatch(html, new RegExp(`<link[^>]+href=["']https?://`, 'i'));
});

test('document shell uses semantic landmarks and reduced inline surface', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<main\b/g) ?? []).length, 1);
  assert.match(html, /<header class="site-header">/);
  assert.match(html, /<nav class="route-nav" aria-label="World Cup views" data-drawer-open="false">/);
  assert.match(html, /id="route-drawer-toggle"[^>]*aria-controls="route-nav-track"[^>]*aria-expanded="false"/);
  assert.match(html, /<ol id="route-nav-track" class="route-nav__track">/);
  assert.match(html, /<footer class="site-footer">/);
  assert.match(html, /<section class="hero" aria-labelledby="view-title">/);
  assert.match(html, /<section class="module-stage" aria-labelledby="module-heading">/);
  assert.doesNotMatch(html, /role="application"/);
  assert.doesNotMatch(html, /\son[a-z]+="/i);
  assert.doesNotMatch(html, /<style\b/i);
  assert.ok(html.includes('<script type="module" src="js/app.js"></script>'));
});

test('document language is Spanish for the WC26 command center', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<html lang="es">/);
});

