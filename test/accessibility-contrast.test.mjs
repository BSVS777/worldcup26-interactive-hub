import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createFanTheme } from '../js/fan-dashboard.js';

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((start) => Number.parseInt(value.slice(start, start + 2), 16) / 255);
}

function linearize(channel) {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const [red, green, blue] = hexToRgb(hex).map(linearize);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const first = luminance(foreground);
  const second = luminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractRootVariables(css) {
  const root = css.match(/:root\s*{(?<body>[\s\S]*?)}/)?.groups?.body ?? '';
  return Object.fromEntries([...root.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, name, value]) => [name, value.toLowerCase()]));
}

test('fan dashboard color pairs meet WCAG AA contrast thresholds', async () => {
  const css = await readFile(new URL('../css/styles.css', import.meta.url), 'utf8');
  const variables = extractRootVariables(css);
  const white = '#ffffff';

  assert.match(css, /\.fan-toolbar label[\s\S]*color:\s*var\(--fan-primary\)/);
  assert.match(css, /\.fan-select[\s\S]*color:\s*var\(--night\);[\s\S]*background:\s*white/);
  assert.match(css, /\.status-banner[\s\S]*color:\s*var\(--fan-contrast\);[\s\S]*background:\s*var\(--fan-accent\)/);
  assert.match(css, /\.fan-metrics dt[\s\S]*color:\s*var\(--fan-primary\)/);

  const pairs = [
    ['dashboard body text on white panels', variables.night, white, 4.5],
    ['toolbar and metric labels on white panels', variables.pitch, white, 4.5],
    ['status banner text on sky', variables.night, variables.sky, 4.5],
    ['focus ring against white surround', variables.focus, white, 3]
  ];

  for (const [name, foreground, background, threshold] of pairs) {
    assert.ok(foreground, name + ' foreground token exists');
    assert.ok(background, name + ' background token exists');
    assert.ok(contrastRatio(foreground, background) >= threshold, name + ' contrast is below WCAG threshold');
  }
});

test('every fan team theme palette meets WCAG AA contrast on its real card backgrounds', () => {
  const cardBackground = '#f7f2df'; // darker stop of the .ui-card/.fan-summary gradient background
  const sampleNames = [
    'Argentina', 'Brazil', 'Canada', 'Mexico', 'USA', 'France', 'Germany', 'Spain',
    'Portugal', 'Japan', 'Korea', 'Morocco', 'Senegal', 'Nigeria', 'Ghana', 'Egypt',
    'Croatia', 'Belgium', 'Netherlands', 'England', 'Italy', 'Uruguay', 'Chile', 'Colombia'
  ];
  const seen = new Map();
  sampleNames.forEach((name, id) => {
    const theme = createFanTheme({ id: String(id), name });
    seen.set(theme.primary, theme);
  });
  assert.equal(seen.size, 6, 'expected to discover all 6 fan theme palettes across this team name sample');

  for (const theme of seen.values()) {
    const summaryRatio = contrastRatio(theme.primary, cardBackground);
    assert.ok(summaryRatio >= 4.5, `fan-summary/fan-metrics dt text ${theme.primary} on card background is below WCAG AA (${summaryRatio.toFixed(2)})`);

    const bannerRatio = contrastRatio(theme.contrast, theme.accent);
    assert.ok(bannerRatio >= 4.5, `status banner text ${theme.contrast} on accent ${theme.accent} is below WCAG AA (${bannerRatio.toFixed(2)})`);
  }
});
