import { requireElement } from './dom.js';
import {
  applyAccessibilityPreferences,
  readAccessibilityPreferences,
  setInert,
  trapTabKey,
  writeAccessibilityPreferences
} from './accessibility.js';

const PREFERENCE_TOGGLES = Object.freeze([
  { key: 'largeText', id: 'a11y-toggle-large-text' },
  { key: 'highContrast', id: 'a11y-toggle-high-contrast' },
  { key: 'reduceTransparency', id: 'a11y-toggle-reduce-transparency' },
  { key: 'reduceMotion', id: 'a11y-toggle-reduce-motion' },
  { key: 'underlineLinks', id: 'a11y-toggle-underline-links' }
]);

export function createAccessibilityPanel(document, window, { storage = window.localStorage } = {}) {
  const elements = {
    widget: requireElement(document, 'a11y-widget', 'accessibility widget'),
    toggle: requireElement(document, 'a11y-toggle', 'accessibility widget'),
    panel: requireElement(document, 'a11y-panel', 'accessibility widget'),
    closeButton: requireElement(document, 'a11y-panel-close', 'accessibility widget'),
    resetButton: requireElement(document, 'a11y-reset', 'accessibility widget')
  };
  const switches = PREFERENCE_TOGGLES.map(({ key, id }) => ({
    key,
    button: requireElement(document, id, 'accessibility widget')
  }));
  const modalSiblings = [
    document.querySelector('.site-header'),
    document.querySelector('.route-nav'),
    document.getElementById('main-content'),
    document.getElementById('session-panel'),
    document.querySelector('.site-footer')
  ].filter(Boolean);

  let preferences = readAccessibilityPreferences(storage);
  let open = false;
  let restoreFocus = null;

  function sync() {
    writeAccessibilityPreferences(preferences, storage);
    applyAccessibilityPreferences(document.documentElement, preferences);
    for (const { key, button } of switches) {
      button.setAttribute('aria-checked', String(preferences[key] === true));
    }
  }

  function setOpen(next, { returnFocus = false } = {}) {
    if (open === next) return;
    open = next;
    elements.panel.hidden = !next;
    elements.toggle.setAttribute('aria-expanded', String(next));
    elements.widget.classList.toggle('a11y-widget--open', next);
    for (const sibling of modalSiblings) setInert(sibling, next);

    if (next) {
      restoreFocus = document.activeElement;
      window.requestAnimationFrame(() => elements.closeButton.focus());
    } else if (returnFocus) {
      const target = restoreFocus && document.contains(restoreFocus) ? restoreFocus : elements.toggle;
      target.focus();
      restoreFocus = null;
    }
  }

  elements.toggle.addEventListener('click', () => setOpen(!open, { returnFocus: true }));
  elements.closeButton.addEventListener('click', () => setOpen(false, { returnFocus: true }));
  elements.resetButton.addEventListener('click', () => {
    preferences = Object.freeze({});
    sync();
  });

  for (const { key, button } of switches) {
    button.addEventListener('click', () => {
      preferences = Object.freeze({ ...preferences, [key]: preferences[key] !== true });
      sync();
    });
  }

  elements.panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false, { returnFocus: true });
      return;
    }
    trapTabKey(elements.panel, event);
  });

  document.addEventListener('click', (event) => {
    if (!open || elements.widget.contains(event.target)) return;
    setOpen(false);
  });

  sync();

  return Object.freeze({ isOpen: () => open });
}
