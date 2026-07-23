import { createApiClient } from './api.js';
import { createRetryStatusController } from './retry-status.js';
import { resolveApiBaseUrl } from './config.js';
import { describeLoginError } from './login-feedback.js';
import { createLoginController } from './login-controller.js';
import { createInitialViewState, normalizeRoute, reduceViewState } from './router.js';
import { applyAccessibilityPreferences, readAccessibilityPreferences } from './accessibility.js';
import { createAccessibilityPanel } from './accessibility-panel.js';
import { createAuthStore } from './auth.js';
import { createTourView } from './tour-view.js';
import { createAgendaView } from './agenda-view.js';
import { createTimelineView } from './timeline-view.js';
import { createFanDashboardView } from './fan-dashboard-view.js';
import { createMatrixView } from './matrix-view.js';
import { createShellView } from './ui.js';
import { createMotionSystem } from './motion.js';
import { bindLanguageSelector, createI18n } from './i18n.js';

const i18n = createI18n({ document, storage: window.localStorage });
applyAccessibilityPreferences(document.documentElement, readAccessibilityPreferences(window.localStorage));
const session = createAuthStore();
let state = createInitialViewState({
  hash: window.location.hash,
  search: window.location.search,
  hasToken: Boolean(session.getToken())
});
let view;
let motion;

function update(action, options) {
  state = reduceViewState(state, action);
  view.render(state, options);
  motion?.animateRoute(state.route, { transition: Boolean(options?.announce) });
}

const retryStatus = createRetryStatusController({
  onChange: (snapshot) => view.renderRetryStatus(snapshot)
});

const api = createApiClient({
  baseUrl: resolveApiBaseUrl(window.location),
  session,
  cacheStorage: window.localStorage,
  onRetryEvent: retryStatus.notify,
  async onSessionExpired() {
    resetModuleViews();
    update({ type: 'SESSION_EXPIRED' });
    view.focusSession();
  }
});

const tourView = createTourView(document, api, { i18n });
const agendaView = createAgendaView(document, api, { i18n });
const timelineView = createTimelineView(document, api, { i18n });
const fanDashboardView = createFanDashboardView(document, api, { storage: window.localStorage, i18n });
const matrixView = createMatrixView(document, api, { i18n });

function resetModuleViews() {
  retryStatus.clear();
  tourView.reset();
  agendaView.reset();
  timelineView.reset();
  fanDashboardView.reset();
  matrixView.reset();
}

function loadActiveModule() {
  if (state.testMode && state.session === 'anonymous') return;
  if (state.route === 'tour') tourView.ensureLoaded();
  if (state.route === 'agenda') agendaView.ensureLoaded();
  if (state.route === 'timeline') timelineView.ensureLoaded();
  if (state.route === 'fan-dashboard') fanDashboardView.ensureLoaded();
  if (state.route === 'group-matrix') matrixView.ensureLoaded();
}

const loginController = createLoginController({
  api, i18n, update, resetModuleViews, loadActiveModule, getView: () => view
});

function handleLogout() {
  session.clear();
  resetModuleViews();
  update({ type: 'LOGOUT' }, { announceMessage: i18n.t('session.loggedOut') });
}

view = createShellView(document, {
  onLogin: loginController.handleLogin,
  onRegister: loginController.handleRegister,
  onLogout: handleLogout,
  i18n
});
motion = createMotionSystem(document, window);
createAccessibilityPanel(document, window, { storage: window.localStorage });
bindLanguageSelector(document, i18n);
i18n.subscribe(() => {
  const lastLoginError = loginController.getLastLoginError();
  if (lastLoginError && state.loginStatus === 'error') {
    state = reduceViewState(state, {
      type: 'LOGIN_FAILED',
      message: loginController.isAutoLoginFailedAfterRegister() ? i18n.t('register.autoLoginFailed') : describeLoginError(lastLoginError, i18n)
    });
  }
  view.renderLocale(state);
  tourView.renderLocale();
  agendaView.renderLocale();
  timelineView.renderLocale();
  fanDashboardView.renderLocale();
  matrixView.renderLocale();
});
view.render(state);
motion.animateRoute(state.route);
loadActiveModule();

window.addEventListener('hashchange', () => {
  update({ type: 'NAVIGATED', route: normalizeRoute(window.location.hash) }, { announce: true });
  loadActiveModule();
});
