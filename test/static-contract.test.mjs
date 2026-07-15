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
  assert.match(readme, /`npm start`[\s\S]*`node tools\/app-server\.mjs`[\s\S]*`http:\/\/127\.0\.0\.1:4173`/);
  assert.match(readme, /`npm test`[\s\S]*`node --test test\/\*\.mjs`/);
  assert.match(readme, /`npm run test:server`[\s\S]*`node tools\/test-server\.mjs`[\s\S]*`http:\/\/127\.0\.0\.1:4174`/);
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
  assert.match(css, /touch-action:\s*pan-x/);
  assert.match(css, /env\(safe-area-inset-left\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});

test('hidden modules cannot be re-displayed by component display rules', async () => {
  const css = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
  assert.match(css, /\[hidden\]\s*\{\s*display:\s*none\s*!important;\s*\}/s);
});

test('document language is Spanish for the WC26 command center', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<html lang="es">/);
});