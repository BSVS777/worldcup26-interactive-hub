import assert from 'node:assert/strict';
import test from 'node:test';

import { createAccessibilityPanel } from '../js/accessibility-panel.js';
import { A11Y_PREFERENCES_KEY } from '../js/accessibility.js';

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
}

class FakeElement {
  constructor(tagName, { id } = {}) {
    this.tagName = tagName;
    this.id = id ?? '';
    this.children = [];
    this.hidden = false;
    this.disabled = false;
    this.dataset = {};
    this._attrs = new Map();
    this._listeners = new Map();
    this._classes = new Set();
    this.classList = {
      add: (name) => this._classes.add(name),
      remove: (name) => this._classes.delete(name),
      toggle: (name, force) => {
        const next = force ?? !this._classes.has(name);
        if (next) this._classes.add(name); else this._classes.delete(name);
      },
      contains: (name) => this._classes.has(name)
    };
  }

  setAttribute(name, value) { this._attrs.set(name, String(value)); }
  getAttribute(name) { return this._attrs.has(name) ? this._attrs.get(name) : null; }
  removeAttribute(name) { this._attrs.delete(name); }
  append(...nodes) { this.children.push(...nodes); }

  addEventListener(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(handler);
  }

  removeEventListener() {}

  dispatch(type, event = {}) {
    for (const handler of this._listeners.get(type) ?? []) {
      handler({ target: this, preventDefault() {}, ...event });
    }
  }

  contains(node) {
    if (node === this) return true;
    return this.children.some((child) => child === node || (child.contains && child.contains(node)));
  }

  querySelectorAll() {
    return this.children;
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }
}

function buildDocument() {
  const registry = new Map();
  const widget = new FakeElement('div', { id: 'a11y-widget' });
  const toggle = new FakeElement('button', { id: 'a11y-toggle' });
  const panel = new FakeElement('div', { id: 'a11y-panel' });
  const closeButton = new FakeElement('button', { id: 'a11y-panel-close' });
  const resetButton = new FakeElement('button', { id: 'a11y-reset' });
  const switches = ['large-text', 'high-contrast', 'reduce-transparency', 'reduce-motion', 'underline-links']
    .map((name) => new FakeElement('button', { id: `a11y-toggle-${name}` }));

  const siteHeader = new FakeElement('header');
  const routeNav = new FakeElement('nav');
  const mainContent = new FakeElement('main', { id: 'main-content' });
  const sessionPanel = new FakeElement('section', { id: 'session-panel' });
  const siteFooter = new FakeElement('footer');
  const documentElement = new FakeElement('html');

  panel.append(closeButton, ...switches, resetButton);
  widget.append(toggle, panel);

  for (const element of [widget, toggle, panel, closeButton, resetButton, ...switches, mainContent, sessionPanel]) {
    registry.set(element.id, element);
  }

  const document = {
    documentElement,
    activeElement: null,
    getElementById: (id) => registry.get(id) ?? null,
    querySelector: (selector) => {
      if (selector === '.site-header') return siteHeader;
      if (selector === '.route-nav') return routeNav;
      if (selector === '.site-footer') return siteFooter;
      return null;
    },
    contains: () => true,
    _listeners: new Map(),
    addEventListener(type, handler) {
      if (!this._listeners.has(type)) this._listeners.set(type, []);
      this._listeners.get(type).push(handler);
    },
    dispatch(type, event = {}) {
      for (const handler of this._listeners.get(type) ?? []) handler(event);
    }
  };
  for (const element of [widget, toggle, panel, closeButton, resetButton, ...switches, siteHeader, routeNav, mainContent, sessionPanel, siteFooter, documentElement]) {
    element.ownerDocument = document;
  }

  return { document, widget, toggle, panel, closeButton, resetButton, switches, siteHeader, routeNav, mainContent, sessionPanel, siteFooter };
}

function buildWindow(storage) {
  return { localStorage: storage, requestAnimationFrame: (cb) => cb() };
}

test('renders switches from stored preferences on init', () => {
  const storage = new MemoryStorage();
  storage.setItem(A11Y_PREFERENCES_KEY, JSON.stringify({ highContrast: true }));
  const { document, switches } = buildDocument();

  createAccessibilityPanel(document, buildWindow(storage), { storage });

  assert.equal(switches[1].getAttribute('aria-checked'), 'true');
  assert.equal(switches[0].getAttribute('aria-checked'), 'false');
});

test('opening the panel makes it visible, expands the toggle, inerts siblings, and focuses the close button', () => {
  const storage = new MemoryStorage();
  const { document, toggle, panel, closeButton, siteHeader } = buildDocument();
  createAccessibilityPanel(document, buildWindow(storage), { storage });

  toggle.dispatch('click');

  assert.equal(panel.hidden, false);
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(siteHeader.inert, true);
  assert.equal(document.activeElement, closeButton);
});

test('clicking a switch flips and persists the preference immediately', () => {
  const storage = new MemoryStorage();
  const { document, switches } = buildDocument();
  createAccessibilityPanel(document, buildWindow(storage), { storage });

  switches[3].dispatch('click'); // reduce-motion

  assert.equal(switches[3].getAttribute('aria-checked'), 'true');
  const saved = JSON.parse(storage.getItem(A11Y_PREFERENCES_KEY));
  assert.equal(saved.reduceMotion, true);
});

test('Escape closes the panel and returns focus to the toggle button', () => {
  const storage = new MemoryStorage();
  const { document, toggle, panel, siteHeader } = buildDocument();
  createAccessibilityPanel(document, buildWindow(storage), { storage });

  toggle.dispatch('click');
  panel.dispatch('keydown', { key: 'Escape' });

  assert.equal(panel.hidden, true);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(siteHeader.inert, false);
  assert.equal(document.activeElement, toggle);
});

test('the close button closes the panel and returns focus to the toggle', () => {
  const storage = new MemoryStorage();
  const { document, toggle, panel, closeButton } = buildDocument();
  createAccessibilityPanel(document, buildWindow(storage), { storage });

  toggle.dispatch('click');
  closeButton.dispatch('click');

  assert.equal(panel.hidden, true);
  assert.equal(document.activeElement, toggle);
});

test('clicking outside the widget closes the panel', () => {
  const storage = new MemoryStorage();
  const { document, toggle, panel, mainContent } = buildDocument();
  createAccessibilityPanel(document, buildWindow(storage), { storage });

  toggle.dispatch('click');
  document.dispatch('click', { target: mainContent });

  assert.equal(panel.hidden, true);
});

test('reset clears every preference back to defaults', () => {
  const storage = new MemoryStorage();
  storage.setItem(A11Y_PREFERENCES_KEY, JSON.stringify({ highContrast: true, largeText: true }));
  const { document, resetButton, switches } = buildDocument();
  createAccessibilityPanel(document, buildWindow(storage), { storage });

  resetButton.dispatch('click');

  for (const button of switches) assert.equal(button.getAttribute('aria-checked'), 'false');
  const saved = JSON.parse(storage.getItem(A11Y_PREFERENCES_KEY));
  assert.deepEqual(saved, {
    reduceMotion: false,
    highContrast: false,
    reduceTransparency: false,
    largeText: false,
    underlineLinks: false
  });
});
