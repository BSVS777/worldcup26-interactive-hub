export const A11Y_PREFERENCES_KEY = 'wc26:a11y-preferences:v1';

export function focusElement(element, { preventScroll = false } = {}) {
  if (typeof element?.focus !== 'function') return false;
  element.focus({ preventScroll });
  return true;
}

export function setLiveMessage(element, message) {
  if (!element) return;
  element.textContent = String(message ?? '');
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
      largeText: parsed.largeText === true
    });
  } catch {
    return Object.freeze({});
  }
}

export function applyAccessibilityPreferences(root, preferences = Object.freeze({})) {
  if (!root?.dataset) return;
  root.dataset.reduceMotion = String(preferences.reduceMotion === true);
  root.dataset.highContrast = String(preferences.highContrast === true);
  root.dataset.reduceTransparency = String(preferences.reduceTransparency === true);
  root.dataset.largeText = String(preferences.largeText === true);
}
