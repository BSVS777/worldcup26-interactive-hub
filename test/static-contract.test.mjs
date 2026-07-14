import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('embedded sign-in uses section semantics and exposes accessibility hooks', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
  const ui = await readFile(new URL('../js/ui.js', import.meta.url), 'utf8');
  assert.match(html, /<section id="session-panel"[^>]*aria-labelledby="session-title"/);
  assert.doesNotMatch(html, /id="session-panel"[^>]*role="dialog"/);
  assert.match(html, /id="app-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(app, /announceMessage:\s*'Signed in\./);
  assert.match(app, /view\.focusCurrentView\(\)/);
  assert.match(ui, /getElementById\('main-content'\)|requireElement\(document, 'main-content'\)/);
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
