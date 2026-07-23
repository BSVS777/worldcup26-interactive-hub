import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LOCALE_STORAGE_KEY,
  bindLanguageSelector,
  createI18n,
  normalizeLocale,
  readLocale,
  writeLocale
} from '../js/i18n.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    value(key) {
      return values.get(key);
    }
  };
}

function languageToggleDocument() {
  const listeners = new Map();
  const attributes = new Map();
  const toggle = {
    dataset: {},
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    closest(selector) {
      return selector === '[data-language-toggle]' ? this : null;
    }
  };
  const selector = {
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    contains(element) {
      return element === toggle;
    }
  };
  const document = {
    documentElement: { lang: 'es' },
    title: '',
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getElementById(id) {
      if (id === 'language-selector') return selector;
      if (id === 'language-toggle') return toggle;
      return null;
    }
  };

  return {
    document,
    toggle,
    click() {
      listeners.get('click')?.({ target: toggle });
    }
  };
}

test('defaults to Spanish and rejects unsupported persisted locales', () => {
  assert.equal(normalizeLocale(), 'es');
  assert.equal(normalizeLocale('ES'), 'es');
  assert.equal(normalizeLocale('en'), 'en');
  assert.equal(normalizeLocale('fr'), 'es');
  assert.equal(readLocale(memoryStorage()), 'es');
  assert.equal(readLocale(memoryStorage({ [LOCALE_STORAGE_KEY]: 'pt' })), 'es');
});

test('persists a validated locale and survives unavailable storage', () => {
  const storage = memoryStorage();
  assert.equal(writeLocale('en', storage), 'en');
  assert.equal(storage.value(LOCALE_STORAGE_KEY), 'en');
  assert.equal(readLocale(storage), 'en');

  const unavailable = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    }
  };
  assert.equal(readLocale(unavailable), 'es');
  assert.equal(writeLocale('en', unavailable), 'en');
});

test('translates interpolation, plurals, dynamic accessibility text, and dates', () => {
  const i18n = createI18n({ storage: memoryStorage(), document: null });
  assert.equal(i18n.locale, 'es');
  assert.equal(i18n.t('tour.matches', { count: 1 }), '1 partido');
  assert.equal(i18n.t('tour.matches', { count: 3 }), '3 partidos');
  assert.equal(i18n.t('matrix.pendingLabel', { home: 'A', away: 'B' }), 'A vs B pendiente');
  assert.match(i18n.formatDate('2026-06-12'), /jun/i);

  i18n.setLocale('en');
  assert.equal(i18n.locale, 'en');
  assert.equal(i18n.t('tour.matches', { count: 1 }), '1 match');
  assert.equal(i18n.t('tour.matches', { count: 3 }), '3 matches');
  assert.equal(i18n.t('language.groupLabel'), 'Language');
  assert.match(i18n.formatDate('2026-06-12'), /Jun/i);
});

test('formats numbers and generated domain fallback labels for the active locale', () => {
  const i18n = createI18n({ storage: memoryStorage(), document: null });
  assert.equal(i18n.formatNumber(12_345), '12.345');
  assert.equal(i18n.formatTeamName('Unknown team'), 'Equipo desconocido');
  assert.equal(i18n.formatVenueName('Unknown stadium'), 'Estadio desconocido');
  assert.equal(i18n.formatGroupName('Group A'), 'Grupo A');
  assert.equal(i18n.formatTeamName('Costa Rica'), 'Costa Rica');
  assert.equal(i18n.t('common.tbc'), 'por confirmar');

  i18n.setLocale('en');
  assert.equal(i18n.formatNumber(12_345), '12,345');
  assert.equal(i18n.formatTeamName('Unknown team'), 'Unknown team');
  assert.equal(i18n.formatVenueName('Unknown stadium'), 'Unknown stadium');
  assert.equal(i18n.formatGroupName('Group A'), 'Group A');
  assert.equal(i18n.t('common.tbc'), 'TBC');
});

test('supports an explicit locale for detached view instances without persistence', () => {
  const i18n = createI18n({ document: null, storage: null, locale: 'en' });
  assert.equal(i18n.locale, 'en');
  assert.equal(i18n.t('agenda.loading'), 'Loading matches…');
});

test('notifies locale subscribers only when the validated locale changes', () => {
  const i18n = createI18n({ storage: memoryStorage(), document: null });
  const changes = [];
  const unsubscribe = i18n.subscribe((locale) => changes.push(locale));

  i18n.setLocale('es');
  i18n.setLocale('en');
  i18n.setLocale('en');
  i18n.setLocale('unsupported');
  unsubscribe();
  i18n.setLocale('en');

  assert.deepEqual(changes, ['en', 'es']);
});

test('single language toggle alternates on every activation and exposes its state', () => {
  const fixture = languageToggleDocument();
  const storage = memoryStorage();
  const i18n = createI18n({ document: fixture.document, storage });
  const unbind = bindLanguageSelector(fixture.document, i18n);

  assert.equal(fixture.toggle.getAttribute('aria-checked'), 'false');
  assert.equal(fixture.toggle.getAttribute('aria-label'), 'Idioma inglés');

  fixture.click();
  assert.equal(i18n.locale, 'en');
  assert.equal(fixture.toggle.getAttribute('aria-checked'), 'true');
  assert.equal(fixture.toggle.getAttribute('aria-label'), 'English language');

  fixture.click();
  assert.equal(i18n.locale, 'es');
  assert.equal(fixture.toggle.getAttribute('aria-checked'), 'false');

  fixture.click();
  assert.equal(i18n.locale, 'en');
  assert.equal(storage.value(LOCALE_STORAGE_KEY), 'en');

  unbind();
});
