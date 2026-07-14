import { createApiClient } from './api.js';
import { resolveApiBaseUrl } from './config.js';
import { describeLoginError } from './login-feedback.js';
import { createInitialViewState, normalizeRoute, reduceViewState } from './router.js';
import { createSessionStore } from './session.js';
import { createTourView } from './tour-view.js';
import { createShellView } from './ui.js';

const session = createSessionStore(window.sessionStorage);
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

function loadTourIfActive() {
  if (state.route === 'tour') tourView.ensureLoaded();
}

async function handleLogin(credentials) {
  update({ type: 'LOGIN_STARTED' });
  try {
    await api.authenticate(credentials);
    tourView.reset();
    update({ type: 'LOGIN_SUCCEEDED' }, { announceMessage: 'Signed in. Live match data is available.' });
    view.focusCurrentView();
    loadTourIfActive();
  } catch (error) {
    update({ type: 'LOGIN_FAILED', message: describeLoginError(error) });
  }
}

view = createShellView(document, { onLogin: handleLogin });
view.render(state);
loadTourIfActive();

window.addEventListener('hashchange', () => {
  update({ type: 'NAVIGATED', route: normalizeRoute(window.location.hash) }, { announce: true });
  loadTourIfActive();
});
