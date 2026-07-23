import assert from 'node:assert/strict';
import test from 'node:test';

import { createShellView } from '../js/ui.js';
import { createInitialViewState } from '../js/router.js';

// Fake-DOM harness mirroring test/accessibility-panel.test.mjs's
// FakeElement/FakeDocument pattern — the project has no jsdom dependency by
// design, so createShellView (a real DOM consumer) is exercised against a
// minimal in-memory stand-in instead.
class FakeElement {
  constructor(tagName, { id } = {}) {
    this.tagName = tagName;
    this.id = id ?? '';
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.textContent = '';
    this.dataset = {};
    this.children = [];
    this.parentElement = null;
    this._attrs = new Map();
    this._listeners = new Map();
  }

  setAttribute(name, value) { this._attrs.set(name, String(value)); }
  getAttribute(name) { return this._attrs.has(name) ? this._attrs.get(name) : null; }
  removeAttribute(name) { this._attrs.delete(name); }

  append(...nodes) {
    for (const node of nodes) {
      node.parentElement = this;
      this.children.push(node);
    }
  }

  addEventListener(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(handler);
  }

  removeEventListener() {}

  dispatch(type, event = {}) {
    const handlers = this._listeners.get(type) ?? [];
    const results = handlers.map((handler) => handler({ target: this, preventDefault() {}, key: undefined, ...event }));
    // Submit/click handlers in js/ui.js are async; returning the (sole)
    // handler's promise lets tests `await element.dispatch(...)` and
    // reliably observe post-await state instead of racing it.
    return results.length === 1 ? results[0] : Promise.all(results);
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (matchesSelector(node, selector)) return node;
      node = node.parentElement ?? null;
    }
    return null;
  }
}

function matchesSelector(element, selector) {
  if (selector.startsWith('#')) return element.id === selector.slice(1);
  const dataMatch = /^\[data-([a-z-]+)\]$/.exec(selector);
  if (dataMatch) {
    const key = dataMatch[1].replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    return element.dataset?.[key] !== undefined;
  }
  return false;
}

function buildDocument() {
  const registry = new Map();
  const make = (tagName, id) => {
    const element = new FakeElement(tagName, { id });
    registry.set(id, element);
    return element;
  };

  const elements = {
    viewMarker: make('p', 'view-marker'),
    viewTitle: make('h1', 'view-title'),
    viewDescription: make('p', 'view-description'),
    moduleHeading: make('h2', 'module-heading'),
    moduleNextStep: make('p', 'module-next-step'),
    modulePlaceholder: make('div', 'module-placeholder'),
    tourView: make('div', 'tour-view'),
    agendaView: make('div', 'agenda-view'),
    timelineView: make('div', 'timeline-view'),
    fanDashboardView: make('div', 'fan-dashboard-view'),
    matrixView: make('div', 'matrix-view'),
    moduleStatus: make('span', 'module-status'),
    testBadge: make('div', 'test-mode-badge'),
    sessionModeIndicator: make('div', 'session-mode-indicator'),
    logoutButton: make('button', 'logout-button'),
    sessionPanel: make('section', 'session-panel'),
    sessionTitle: make('h2', 'session-title'),
    sessionCopy: make('p', 'session-copy'),
    sessionModeGroup: make('div', 'session-mode'),
    loginModeButton: make('button', 'session-mode-login'),
    registerModeButton: make('button', 'session-mode-register'),
    publicModeButton: make('button', 'session-mode-public'),
    loginForm: make('form', 'login-form'),
    loginButton: make('button', 'login-button'),
    loginStatus: make('p', 'login-status'),
    emailInput: make('input', 'email'),
    passwordInput: make('input', 'password'),
    registerForm: make('form', 'register-form'),
    registerButton: make('button', 'register-button'),
    registerStatus: make('p', 'register-status'),
    registerNameInput: make('input', 'register-name'),
    registerEmailInput: make('input', 'register-email'),
    registerPasswordInput: make('input', 'register-password'),
    registerConfirmInput: make('input', 'register-confirm'),
    appStatus: make('div', 'app-status'),
    retryStatus: make('p', 'retry-status'),
    routeDrawerToggle: make('button', 'route-drawer-toggle'),
    mainContent: make('main', 'main-content')
  };

  elements.loginModeButton.dataset.sessionMode = 'login';
  elements.registerModeButton.dataset.sessionMode = 'register';
  elements.publicModeButton.dataset.sessionMode = 'public';
  elements.sessionModeGroup.append(elements.loginModeButton, elements.registerModeButton, elements.publicModeButton);

  const routeNav = new FakeElement('nav');
  routeNav.dataset.drawerOpen = 'false';
  const siteHeader = new FakeElement('header');
  const siteFooter = new FakeElement('footer');
  const documentElement = new FakeElement('html');

  const document = {
    documentElement,
    activeElement: null,
    getElementById: (id) => registry.get(id) ?? null,
    querySelector: (selector) => {
      if (selector === '.route-nav') return routeNav;
      if (selector === '.site-header') return siteHeader;
      if (selector === '.site-footer') return siteFooter;
      return null;
    },
    querySelectorAll: () => [],
    dispatchEvent() {},
    _listeners: new Map(),
    addEventListener(type, handler) {
      if (!this._listeners.has(type)) this._listeners.set(type, []);
      this._listeners.get(type).push(handler);
    }
  };

  for (const element of [...registry.values(), routeNav, siteHeader, siteFooter, documentElement]) {
    element.ownerDocument = document;
  }

  return { document, elements: { ...elements, routeNav, siteHeader, siteFooter } };
}

// The fake i18n just echoes the key so assertions can check exactly which
// message key was rendered, without depending on locale copy.
const fakeI18n = { t: (key) => key, locale: 'es' };

function buildView(overrides = {}) {
  const { document, elements } = buildDocument();
  const onLogin = overrides.onLogin ?? (async () => {});
  const onRegister = overrides.onRegister ?? (async () => {});
  const onLogout = overrides.onLogout ?? (() => {});
  const view = createShellView(document, { onLogin, onRegister, onLogout, i18n: fakeI18n });
  return { document, elements, view };
}

function baseState(overrides = {}) {
  return createInitialViewState({ hash: '#tour', search: '', hasToken: false, ...overrides });
}

test('register form validation rejects each invalid field and focuses it without calling onRegister', async () => {
  const cases = [
    {
      name: '', email: 'a@example.test', password: 'secret', confirm: 'secret',
      expectedField: 'registerNameInput', expectedKey: 'register.nameRequired'
    },
    {
      name: 'Student', email: 'not-an-email', password: 'secret', confirm: 'secret',
      expectedField: 'registerEmailInput', expectedKey: 'register.emailInvalid'
    },
    {
      name: 'Student', email: 'a@example.test', password: '', confirm: '',
      expectedField: 'registerPasswordInput', expectedKey: 'register.passwordRequired'
    },
    {
      name: 'Student', email: 'a@example.test', password: 'secret', confirm: 'different',
      expectedField: 'registerConfirmInput', expectedKey: 'register.passwordMismatch'
    }
  ];

  for (const testCase of cases) {
    let calls = 0;
    const { document, elements, view } = buildView({ onRegister: async () => { calls += 1; } });
    view.render(baseState());
    elements.registerNameInput.value = testCase.name;
    elements.registerEmailInput.value = testCase.email;
    elements.registerPasswordInput.value = testCase.password;
    elements.registerConfirmInput.value = testCase.confirm;

    await elements.registerForm.dispatch('submit');

    assert.equal(calls, 0, `onRegister must not be called for case ${testCase.expectedKey}`);
    assert.equal(elements.registerStatus.textContent, testCase.expectedKey);
    assert.equal(document.activeElement, elements[testCase.expectedField], `focus must move to ${testCase.expectedField}`);
  }
});

test('the login/register/public tab switch toggles form visibility and aria-pressed', () => {
  const { document, elements, view } = buildView();
  view.render(baseState({ search: '?testMode=1' }));

  assert.equal(elements.loginForm.hidden, false);
  assert.equal(elements.registerForm.hidden, true);
  assert.equal(elements.loginModeButton.getAttribute('aria-pressed'), 'true');
  assert.equal(elements.registerModeButton.getAttribute('aria-pressed'), 'false');

  elements.sessionModeGroup.dispatch('click', { target: elements.registerModeButton });

  assert.equal(elements.loginForm.hidden, true);
  assert.equal(elements.registerForm.hidden, false);
  assert.equal(elements.loginModeButton.getAttribute('aria-pressed'), 'false');
  assert.equal(elements.registerModeButton.getAttribute('aria-pressed'), 'true');
  assert.equal(document.activeElement, elements.registerNameInput);

  elements.sessionModeGroup.dispatch('click', { target: elements.publicModeButton });

  assert.equal(elements.sessionPanel.hidden, true);
  assert.equal(elements.sessionPanel.getAttribute('role'), null);
  assert.equal(document.activeElement, elements.mainContent);
});

test('dismissing to public mode sticks across re-renders with the same session value, and resets on a session transition', () => {
  const { elements, view } = buildView();
  const state = baseState({ search: '?testMode=1' });
  view.render(state);
  assert.equal(elements.sessionPanel.hidden, false);

  elements.sessionModeGroup.dispatch('click', { target: elements.publicModeButton });
  assert.equal(elements.sessionPanel.hidden, true);

  // Same session value ('anonymous') re-rendered: dismissal sticks.
  view.render(state);
  assert.equal(elements.sessionPanel.hidden, true);

  // A session transition (e.g. expiry) reopens the panel on the login tab.
  view.render({ ...state, session: 'expired' });
  assert.equal(elements.sessionPanel.hidden, false);
  assert.equal(elements.loginForm.hidden, false);
});

test('the register submit button disables with pending text during the request and restores/clears fields after', async () => {
  const { elements, view } = buildView();
  view.render(baseState());

  let resolveRegister;
  const onRegisterPromise = new Promise((resolve) => { resolveRegister = resolve; });
  const { view: registerView, elements: registerElements } = buildView({ onRegister: () => onRegisterPromise });
  registerView.render(baseState());

  registerElements.registerNameInput.value = 'Student';
  registerElements.registerEmailInput.value = 'a@example.test';
  registerElements.registerPasswordInput.value = 'secret';
  registerElements.registerConfirmInput.value = 'secret';

  const submitPromise = registerElements.registerForm.dispatch('submit');
  assert.equal(registerElements.registerButton.disabled, true);
  assert.equal(registerElements.registerButton.textContent, 'register.submitPending');

  resolveRegister();
  await submitPromise;

  assert.equal(registerElements.registerButton.disabled, false);
  assert.equal(registerElements.registerButton.textContent, 'register.submit');
  assert.equal(registerElements.registerNameInput.value, '');
  assert.equal(registerElements.registerEmailInput.value, '');
  assert.equal(registerElements.registerPasswordInput.value, '');
  assert.equal(registerElements.registerConfirmInput.value, '');
});

test('logout button visibility follows session state and its click calls onLogout without reload', () => {
  let logoutCalls = 0;
  const { elements, view } = buildView({ onLogout: () => { logoutCalls += 1; } });

  view.render(baseState({ hasToken: false }));
  assert.equal(elements.logoutButton.hidden, true);

  view.render({ ...baseState(), session: 'authenticated' });
  assert.equal(elements.logoutButton.hidden, false);

  elements.logoutButton.dispatch('click');
  assert.equal(logoutCalls, 1);
});

test('setSessionBusy disables the three session-mode tab buttons and setSessionMode re-enables via a fresh render', () => {
  const { elements, view } = buildView();
  view.render(baseState({ search: '?testMode=1' }));

  view.setSessionBusy(true);
  assert.equal(elements.loginModeButton.disabled, true);
  assert.equal(elements.registerModeButton.disabled, true);
  assert.equal(elements.publicModeButton.disabled, true);

  view.setSessionBusy(false);
  assert.equal(elements.loginModeButton.disabled, false);
  assert.equal(elements.registerModeButton.disabled, false);
  assert.equal(elements.publicModeButton.disabled, false);
});

test('setRegisterMessage writes into the register status region and setSessionMode switches tabs programmatically', () => {
  const { document, elements, view } = buildView();
  view.render(baseState({ search: '?testMode=1' }));

  view.setRegisterMessage('register.successCreating');
  assert.equal(elements.registerStatus.textContent, 'register.successCreating');

  elements.sessionModeGroup.dispatch('click', { target: elements.registerModeButton });
  assert.equal(elements.registerForm.hidden, false);

  view.setSessionMode('login');
  assert.equal(elements.loginForm.hidden, false);
  assert.equal(elements.registerForm.hidden, true);
  assert.equal(document.activeElement, elements.emailInput);
});
