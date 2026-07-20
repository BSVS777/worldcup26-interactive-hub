import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyAccessibilityPreferences,
  getFocusableElements,
  readAccessibilityPreferences,
  trapTabKey,
  writeAccessibilityPreferences
} from '../js/accessibility.js';

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
  removeItem(key) { this.#values.delete(key); }
}

test('accessibility preferences round-trip through storage', () => {
  const storage = new MemoryStorage();
  writeAccessibilityPreferences({ highContrast: true, underlineLinks: true }, storage);

  const read = readAccessibilityPreferences(storage);
  assert.deepEqual(read, {
    reduceMotion: false,
    highContrast: true,
    reduceTransparency: false,
    largeText: false,
    underlineLinks: true
  });
});

test('reading preferences from empty or corrupt storage yields defaults, not a throw', () => {
  assert.deepEqual(readAccessibilityPreferences(new MemoryStorage()), {});

  const corrupt = new MemoryStorage();
  corrupt.setItem('wc26:a11y-preferences:v1', '{not json');
  assert.deepEqual(readAccessibilityPreferences(corrupt), {});
});

test('writing preferences never throws even when storage is unavailable', () => {
  const blocked = { setItem() { throw new DOMException('blocked', 'SecurityError'); } };
  assert.doesNotThrow(() => writeAccessibilityPreferences({ largeText: true }, blocked));
});

test('applyAccessibilityPreferences mirrors every preference onto dataset flags', () => {
  const root = { dataset: {} };
  applyAccessibilityPreferences(root, { highContrast: true, reduceMotion: false });
  assert.deepEqual(root.dataset, {
    reduceMotion: 'false',
    highContrast: 'true',
    reduceTransparency: 'false',
    largeText: 'false',
    underlineLinks: 'false'
  });
});

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.hidden = false;
    this._attrs = new Map();
    this.disabled = false;
  }

  setAttribute(name, value) { this._attrs.set(name, String(value)); }
  getAttribute(name) { return this._attrs.has(name) ? this._attrs.get(name) : null; }
  append(...nodes) { this.children.push(...nodes); }

  querySelectorAll() {
    // Only used indirectly via container.querySelectorAll below in these tests.
    return this.children;
  }

  focus() { this.focused = true; }
}

function buildContainer(childCount) {
  const container = new FakeElement('div');
  const kids = Array.from({ length: childCount }, () => new FakeElement('button'));
  container.append(...kids);
  container.ownerDocument = { activeElement: null };
  return { container, kids };
}

test('getFocusableElements filters out hidden and aria-hidden nodes', () => {
  const { container, kids } = buildContainer(3);
  kids[1].hidden = true;
  kids[2].setAttribute('aria-hidden', 'true');

  assert.deepEqual(getFocusableElements(container), [kids[0]]);
});

test('trapTabKey wraps focus from the last element back to the first on Tab', () => {
  const { container, kids } = buildContainer(3);
  container.ownerDocument.activeElement = kids[2];
  let prevented = false;
  trapTabKey(container, { key: 'Tab', shiftKey: false, preventDefault: () => { prevented = true; } });

  assert.equal(prevented, true);
  assert.equal(kids[0].focused, true);
});

test('trapTabKey wraps focus from the first element back to the last on Shift+Tab', () => {
  const { container, kids } = buildContainer(3);
  container.ownerDocument.activeElement = kids[0];
  let prevented = false;
  trapTabKey(container, { key: 'Tab', shiftKey: true, preventDefault: () => { prevented = true; } });

  assert.equal(prevented, true);
  assert.equal(kids[2].focused, true);
});

test('trapTabKey ignores keys other than Tab', () => {
  const { container } = buildContainer(2);
  let prevented = false;
  trapTabKey(container, { key: 'Escape', shiftKey: false, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, false);
});
