export const A11Y_PREFERENCES_KEY = 'wc26:a11y-preferences:v1';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function focusElement(element, { preventScroll = false } = {}) {
  if (typeof element?.focus !== 'function') return false;
  element.focus({ preventScroll });
  return true;
}

export function setLiveMessage(element, message) {
  if (!element) return;
  element.textContent = String(message ?? '');
}

export function setInert(element, inert) {
  if (!element) return;
  element.inert = inert;
  if (inert) element.setAttribute('aria-hidden', 'true');
  else element.removeAttribute('aria-hidden');
}

export function getFocusableElements(container) {
  if (!container?.querySelectorAll) return [];
  return [...container.querySelectorAll(FOCUSABLE_SELECTOR)]
    .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

export function trapTabKey(container, event) {
  if (event.key !== 'Tab') return;
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = container.ownerDocument?.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

export function readAccessibilityPreferences(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(A11Y_PREFERENCES_KEY);
    if (!raw) return Object.freeze({});
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return Object.freeze({});
    return Object.freeze({
      reduceMotion: parsed.reduceMotion === true,
      highContrast: parsed.highContrast === true,
      reduceTransparency: parsed.reduceTransparency === true,
      largeText: parsed.largeText === true,
      underlineLinks: parsed.underlineLinks === true
    });
  } catch {
    return Object.freeze({});
  }
}

export function writeAccessibilityPreferences(preferences = Object.freeze({}), storage = globalThis.localStorage) {
  try {
    storage?.setItem?.(A11Y_PREFERENCES_KEY, JSON.stringify({
      reduceMotion: preferences.reduceMotion === true,
      highContrast: preferences.highContrast === true,
      reduceTransparency: preferences.reduceTransparency === true,
      largeText: preferences.largeText === true,
      underlineLinks: preferences.underlineLinks === true
    }));
  } catch {
    // Storage unavailable (private mode, quota, disabled) — preferences stay in-memory for this visit.
  }
}

export function applyAccessibilityPreferences(root, preferences = Object.freeze({})) {
  if (!root?.dataset) return;
  root.dataset.reduceMotion = String(preferences.reduceMotion === true);
  root.dataset.highContrast = String(preferences.highContrast === true);
  root.dataset.reduceTransparency = String(preferences.reduceTransparency === true);
  root.dataset.largeText = String(preferences.largeText === true);
  root.dataset.underlineLinks = String(preferences.underlineLinks === true);
}
