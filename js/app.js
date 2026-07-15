import { createApiClient } from './api.js';
import { resolveApiBaseUrl } from './config.js';
import { describeLoginError } from './login-feedback.js';
import { createInitialViewState, normalizeRoute, reduceViewState } from './router.js';
import { applyAccessibilityPreferences, readAccessibilityPreferences } from './accessibility.js';
import { createAuthStore } from './auth.js';
import { createTourView } from './tour-view.js';
import { createAgendaView } from './agenda-view.js';
import { createTimelineView } from './timeline-view.js';
import { createFanDashboardView } from './fan-dashboard-view.js';
import { createShellView } from './ui.js';

applyAccessibilityPreferences(document.documentElement, readAccessibilityPreferences(window.localStorage));
const session = createAuthStore();
let state = createInitialViewState({
  hash: window.location.hash,
  search: window.location.search,
  hasToken: Boolean(session.getToken())
});
let view;

function update(action, options) {
  state = reduceViewState(state, action);
  view.render(state, options);
}

const api = createApiClient({
  baseUrl: resolveApiBaseUrl(window.location),
  session,
  cacheStorage: window.localStorage,
  async onSessionExpired() {
    update({ type: 'SESSION_EXPIRED' });
    view.focusSession();
  }
});

const tourView = createTourView(document, api);
const agendaView = createAgendaView(document, api);
const timelineView = createTimelineView(document, api);
const fanDashboardView = createFanDashboardView(document, api);

function loadActiveModule() {
  if (state.route === 'tour') tourView.ensureLoaded();
  if (state.route === 'agenda') agendaView.ensureLoaded();
  if (state.route === 'timeline') timelineView.ensureLoaded();
  if (state.route === 'fan-dashboard') fanDashboardView.ensureLoaded();
}

async function handleLogin(credentials) {
  update({ type: 'LOGIN_STARTED' });
  try {
    await api.authenticate(credentials);
    tourView.reset();
    agendaView.reset();
    timelineView.reset();
    fanDashboardView.reset();
    update({ type: 'LOGIN_SUCCEEDED' }, { announceMessage: 'Signed in. Live match data is available.' });
    view.focusCurrentView();
    loadActiveModule();
  } catch (error) {
    update({ type: 'LOGIN_FAILED', message: describeLoginError(error) });
  }
}

view = createShellView(document, { onLogin: handleLogin });
view.render(state);
loadActiveModule();

window.addEventListener('hashchange', () => {
  update({ type: 'NAVIGATED', route: normalizeRoute(window.location.hash) }, { announce: true });
  loadActiveModule();
});
