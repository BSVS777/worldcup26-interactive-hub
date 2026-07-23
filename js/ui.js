import { requireElement } from './dom.js';
import { MODULE_ROUTES } from './router.js';
import { ENDPOINTS } from './config.js';
import { setInert, trapTabKey } from './accessibility.js';

export function createShellView(document, { onLogin, onRegister, onLogout, i18n }) {
  const elements = {
    viewMarker: requireElement(document, 'view-marker', 'shell element'),
    viewTitle: requireElement(document, 'view-title', 'shell element'),
    viewDescription: requireElement(document, 'view-description', 'shell element'),
    moduleHeading: requireElement(document, 'module-heading', 'shell element'),
    moduleNextStep: requireElement(document, 'module-next-step', 'shell element'),
    modulePlaceholder: requireElement(document, 'module-placeholder', 'shell element'),
    tourView: requireElement(document, 'tour-view', 'shell element'),
    agendaView: requireElement(document, 'agenda-view', 'shell element'),
    timelineView: requireElement(document, 'timeline-view', 'shell element'),
    fanDashboardView: requireElement(document, 'fan-dashboard-view', 'shell element'),
    matrixView: requireElement(document, 'matrix-view', 'shell element'),
    moduleStatus: requireElement(document, 'module-status', 'shell element'),
    testBadge: requireElement(document, 'test-mode-badge', 'shell element'),
    sessionModeIndicator: requireElement(document, 'session-mode-indicator', 'shell element'),
    logoutButton: requireElement(document, 'logout-button', 'shell element'),
    sessionPanel: requireElement(document, 'session-panel', 'shell element'),
    sessionTitle: requireElement(document, 'session-title', 'shell element'),
    sessionCopy: requireElement(document, 'session-copy', 'shell element'),
    sessionModeGroup: requireElement(document, 'session-mode', 'shell element'),
    loginModeButton: requireElement(document, 'session-mode-login', 'shell element'),
    registerModeButton: requireElement(document, 'session-mode-register', 'shell element'),
    publicModeButton: requireElement(document, 'session-mode-public', 'shell element'),
    loginForm: requireElement(document, 'login-form', 'shell element'),
    loginButton: requireElement(document, 'login-button', 'shell element'),
    loginStatus: requireElement(document, 'login-status', 'shell element'),
    passwordInput: requireElement(document, 'password', 'shell element'),
    registerForm: requireElement(document, 'register-form', 'shell element'),
    registerButton: requireElement(document, 'register-button', 'shell element'),
    registerStatus: requireElement(document, 'register-status', 'shell element'),
    registerNameInput: requireElement(document, 'register-name', 'shell element'),
    registerEmailInput: requireElement(document, 'register-email', 'shell element'),
    registerPasswordInput: requireElement(document, 'register-password', 'shell element'),
    registerConfirmInput: requireElement(document, 'register-confirm', 'shell element'),
    appStatus: requireElement(document, 'app-status', 'shell element'),
    retryStatus: requireElement(document, 'retry-status', 'shell element'),
    emailInput: requireElement(document, 'email', 'shell element'),
    routeNav: document.querySelector('.route-nav'),
    routeDrawerToggle: requireElement(document, 'route-drawer-toggle', 'shell element')
  };
  const routeLinks = [...document.querySelectorAll('[data-route]')];
  const modalSiblings = [
    document.querySelector('.site-header'),
    document.querySelector('.route-nav'),
    requireElement(document, 'main-content', 'shell element'),
    document.querySelector('.site-footer'),
    document.getElementById('a11y-widget')
  ].filter(Boolean);
  let sessionModalActive = false;
  let drawerRestoreFocus = null;
  let lastRetrySnapshot = null;
  let sessionMode = 'login';
  let publicModeDismissed = false;
  let previousSessionValue = null;

  function setSessionModal(active) {
    sessionModalActive = active;
    if (active) {
      elements.sessionPanel.setAttribute('role', 'dialog');
      elements.sessionPanel.setAttribute('aria-modal', 'true');
    } else {
      elements.sessionPanel.removeAttribute('role');
      elements.sessionPanel.removeAttribute('aria-modal');
    }
    for (const element of modalSiblings) setInert(element, active);
  }

  function setDrawerOpen(open, { restoreFocus = false } = {}) {
    elements.routeNav.dataset.drawerOpen = String(open);
    elements.routeDrawerToggle.setAttribute('aria-expanded', String(open));
    if (!open && restoreFocus && drawerRestoreFocus) drawerRestoreFocus.focus();
    drawerRestoreFocus = open ? elements.routeDrawerToggle : null;
  }

  elements.routeNav.addEventListener('click', (event) => {
    const toggle = event.target.closest('#route-drawer-toggle');
    if (toggle) {
      setDrawerOpen(elements.routeNav.dataset.drawerOpen !== 'true');
      return;
    }
    if (event.target.closest('[data-route]')) {
      if (typeof CustomEvent === 'function') document.dispatchEvent(new CustomEvent('wc26:route-intent'));
      setDrawerOpen(false);
    }
  });

  elements.routeNav.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || elements.routeNav.dataset.drawerOpen !== 'true') return;
    event.preventDefault();
    setDrawerOpen(false, { restoreFocus: true });
  });
  elements.sessionPanel.addEventListener('keydown', (event) => {
    if (!sessionModalActive) return;
    trapTabKey(elements.sessionPanel, event);
  });

  elements.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await onLogin({
      email: elements.emailInput.value,
      password: elements.passwordInput.value
    });
  });

  function setSessionBusy(busy) {
    elements.loginModeButton.disabled = busy;
    elements.registerModeButton.disabled = busy;
    elements.publicModeButton.disabled = busy;
  }

  function setSessionFormMode(mode) {
    sessionMode = mode;
    elements.loginForm.hidden = mode !== 'login';
    elements.registerForm.hidden = mode !== 'register';
    elements.loginModeButton.setAttribute('aria-pressed', String(mode === 'login'));
    elements.registerModeButton.setAttribute('aria-pressed', String(mode === 'register'));
    elements.registerStatus.textContent = '';
    if (mode === 'register') elements.registerNameInput.focus();
    else elements.emailInput.focus();
  }

  function dismissToPublicMode() {
    publicModeDismissed = true;
    elements.sessionPanel.hidden = true;
    setSessionModal(false);
    focusCurrentView();
  }

  elements.sessionModeGroup.addEventListener('click', (event) => {
    const button = event.target.closest('[data-session-mode]');
    if (!button) return;
    const mode = button.dataset.sessionMode;
    if (mode === 'public') dismissToPublicMode();
    else setSessionFormMode(mode);
  });

  function isLikelyEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateRegisterForm({ name, email, password, confirmPassword }) {
    if (name === '') return { element: elements.registerNameInput, messageKey: 'register.nameRequired' };
    if (email === '' || !isLikelyEmail(email)) return { element: elements.registerEmailInput, messageKey: 'register.emailInvalid' };
    if (password === '') return { element: elements.registerPasswordInput, messageKey: 'register.passwordRequired' };
    if (password !== confirmPassword) return { element: elements.registerConfirmInput, messageKey: 'register.passwordMismatch' };
    return null;
  }

  function clearRegisterFields() {
    elements.registerNameInput.value = '';
    elements.registerEmailInput.value = '';
    elements.registerPasswordInput.value = '';
    elements.registerConfirmInput.value = '';
  }

  elements.registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = elements.registerNameInput.value.trim();
    const email = elements.registerEmailInput.value.trim();
    const password = elements.registerPasswordInput.value;
    const confirmPassword = elements.registerConfirmInput.value;

    const invalid = validateRegisterForm({ name, email, password, confirmPassword });
    if (invalid) {
      elements.registerStatus.textContent = i18n.t(invalid.messageKey);
      invalid.element.focus();
      return;
    }

    elements.registerStatus.textContent = '';
    elements.registerButton.disabled = true;
    elements.registerButton.textContent = i18n.t('register.submitPending');
    await onRegister({ name, email, password });
    elements.registerButton.disabled = false;
    elements.registerButton.textContent = i18n.t('register.submit');
    clearRegisterFields();
  });

  elements.logoutButton.addEventListener('click', () => {
    onLogout();
  });

  function render(state, {
    announce = false,
    announceMessage = '',
    clearAnnouncement = false
  } = {}) {
    const route = MODULE_ROUTES.find(({ id }) => id === state.route) ?? MODULE_ROUTES[0];
    const prefix = `route.${route.id}`;
    elements.viewMarker.textContent = i18n.t('route.marker', { marker: route.marker });
    elements.viewTitle.textContent = i18n.t(`${prefix}.title`);
    elements.viewDescription.textContent = i18n.t(`${prefix}.description`);
    elements.moduleHeading.textContent = i18n.t(`${prefix}.heading`);
    elements.moduleNextStep.textContent = i18n.t(`${prefix}.next`);
    elements.moduleStatus.textContent = i18n.t(state.session === 'authenticated' ? 'module.sessionReady' : 'module.preview');
    elements.testBadge.hidden = !state.testMode;
    elements.sessionModeIndicator.textContent = i18n.t(
      state.session === 'authenticated' ? 'session.jwtActiveStatus' : 'session.publicModeStatus'
    );
    elements.logoutButton.hidden = state.session !== 'authenticated';

    const isTour = route.id === 'tour';
    const isAgenda = route.id === 'agenda';
    const isTimeline = route.id === 'timeline';
    const isFanDashboard = route.id === 'fan-dashboard';
    const isMatrix = route.id === 'group-matrix';
    elements.modulePlaceholder.hidden = isTour || isAgenda || isTimeline || isFanDashboard || isMatrix;
    elements.tourView.hidden = !isTour;
    elements.agendaView.hidden = !isAgenda;
    elements.timelineView.hidden = !isTimeline;
    elements.fanDashboardView.hidden = !isFanDashboard;
    elements.matrixView.hidden = !isMatrix;

    for (const link of routeLinks) {
      if (link.dataset.route === route.id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }

    // A session-state transition (fresh expiry, fresh anonymous test-mode
    // boot, a new logout) always re-opens the panel on the login tab, even
    // if the visitor had previously dismissed it into public mode.
    if (state.session !== previousSessionValue) {
      publicModeDismissed = false;
      sessionMode = 'login';
      previousSessionValue = state.session;
    }
    elements.loginForm.hidden = sessionMode !== 'login';
    elements.registerForm.hidden = sessionMode !== 'register';
    elements.loginModeButton.setAttribute('aria-pressed', String(sessionMode === 'login'));
    elements.registerModeButton.setAttribute('aria-pressed', String(sessionMode === 'register'));

    // Live match data now loads from public read endpoints, so sign-in is an
    // optional compatibility path shown only when a real session actually
    // expires — not a gate for the ordinary anonymous state. A visitor can
    // also explicitly dismiss the panel into public mode (see dismissToPublicMode).
    const showSessionPanel = !publicModeDismissed
      && (state.session === 'expired' || (state.testMode && state.session === 'anonymous'));
    elements.sessionPanel.hidden = !showSessionPanel;
    setSessionModal(showSessionPanel);
    elements.sessionTitle.textContent = state.session === 'expired'
      ? i18n.t('session.expiredTitle')
      : i18n.t('session.title');
    elements.sessionCopy.textContent = state.session === 'expired'
      ? i18n.t('session.expiredCopy')
      : i18n.t('session.copy');
    elements.loginButton.disabled = state.loginStatus === 'pending';
    elements.loginButton.textContent = i18n.t(state.loginStatus === 'pending' ? 'session.signingIn' : 'session.signIn');
    elements.loginStatus.textContent = state.session === 'expired'
      ? i18n.t('session.expiredStatus')
      : state.loginStatus === 'pending'
        ? i18n.t('session.signingIn')
        : state.session === 'authenticated'
          ? i18n.t('session.signedInStatus')
          : state.statusMessage;

    if (clearAnnouncement) elements.appStatus.textContent = '';
    else {
      if (announce) elements.appStatus.textContent = i18n.t('module.selected', { route: i18n.t(`${prefix}.label`) });
      if (announceMessage) elements.appStatus.textContent = announceMessage;
      if (state.session === 'expired') elements.appStatus.textContent = i18n.t('session.expiredStatus');
    }
    renderRetryStatus(lastRetrySnapshot);
  }

  function focusSession() {
    elements.emailInput.focus();
  }

  function focusCurrentView() {
    requireElement(document, 'main-content').focus();
  }

  function renderRetryStatus(snapshot) {
    lastRetrySnapshot = snapshot;
    if (!snapshot || snapshot.silent || snapshot.secondsRemaining <= 0) {
      elements.retryStatus.hidden = true;
      elements.retryStatus.textContent = '';
      return;
    }
    const path = ENDPOINTS[snapshot.endpoint]?.path ?? snapshot.endpoint;
    const cause = snapshot.status
      ? i18n.t('retry.responded', { status: snapshot.status })
      : i18n.t('retry.unreachable');
    elements.retryStatus.hidden = false;
    elements.retryStatus.textContent = i18n.t('retry.message', {
      path,
      cause,
      seconds: snapshot.secondsRemaining
    });
  }

  function renderLocale(state) {
    // This live region announces one-time events. A locale change is not a
    // new event, so stale copy is cleared rather than announced again.
    render(state, { clearAnnouncement: true });
  }

  function setRegisterMessage(message) {
    elements.registerStatus.textContent = message;
  }

  function setSessionMode(mode) {
    setSessionFormMode(mode);
  }

  return Object.freeze({
    render, renderLocale, focusSession, focusCurrentView, renderRetryStatus,
    setRegisterMessage, setSessionMode, setSessionBusy
  });
}
