function appendClassName(element, className) {
  if (element?.classList?.add) {
    element.classList.add(className);
    return;
  }
  const current = typeof element?.className === 'string' ? element.className : '';
  if (!current.split(/\s+/).includes(className)) element.className = `${current} ${className}`.trim();
}

export function markInteractiveCard(element, variant = '') {
  appendClassName(element, 'ui-card');
  if (variant) appendClassName(element, `ui-card--${variant}`);
  return element;
}

export function markPrimaryControl(element) {
  appendClassName(element, 'ui-control');
  return element;
}

export function announceViewRendered(document, detail = {}) {
  if (typeof document?.dispatchEvent !== 'function' || typeof CustomEvent !== 'function') return;
  document.dispatchEvent(new CustomEvent('wc26:view-rendered', { detail }));
}
