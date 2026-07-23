import { describeLoginError, describeRegisterError } from './login-feedback.js';

// Generation-guarded login/register orchestration, mirroring
// js/loadable-view.js's ensureLoaded(): every login attempt (manual, or the
// one auto-chained after a successful register) captures a generation
// number before its first await. If a fresher attempt starts before an
// older one resolves, the older one's result is dropped silently instead of
// clobbering state or stealing focus — this is what stops a stale
// register-triggered auto-login from overwriting a fresher manual login
// (or a fresher register) that started while it was still in flight.
//
// Kept as its own module (not inline in js/app.js) so it can be unit
// tested with fake api/view/i18n — js/app.js itself assumes a real
// `document`/`window` exist at import time and can never run under
// node:test.
export function createLoginController({ api, i18n, update, resetModuleViews, loadActiveModule, getView }) {
  let generation = 0;
  let lastLoginError = null;
  let autoLoginFailedAfterRegister = false;

  // Returns true (applied success), false (applied failure), or null (this
  // attempt was superseded by a fresher one; its result was dropped).
  async function handleLogin(credentials) {
    const myGeneration = ++generation;
    const view = getView();
    lastLoginError = null;
    autoLoginFailedAfterRegister = false;
    view.setSessionBusy(true);
    update({ type: 'LOGIN_STARTED' });
    try {
      await api.authenticate(credentials);
      if (myGeneration !== generation) return null;
      resetModuleViews();
      update({ type: 'LOGIN_SUCCEEDED' }, { announceMessage: i18n.t('session.signedInLive') });
      view.focusCurrentView();
      loadActiveModule();
      return true;
    } catch (error) {
      if (myGeneration !== generation) return null;
      lastLoginError = error;
      update({ type: 'LOGIN_FAILED', message: describeLoginError(error, i18n) });
      return false;
    } finally {
      if (myGeneration === generation) view.setSessionBusy(false);
    }
  }

  // Registration never creates a session on its own: it only proves the
  // account exists, then hands off to the exact same handleLogin() path a
  // manual sign-in uses, so the JWT that ends up in memory is always issued
  // by /auth/authenticate, never fabricated from the register response.
  async function handleRegister({ name, email, password }) {
    const myGeneration = generation;
    const view = getView();
    view.setSessionBusy(true);
    try {
      await api.register({ name, email, password });
    } catch (error) {
      if (myGeneration === generation) {
        view.setRegisterMessage(describeRegisterError(error, i18n));
        view.setSessionBusy(false);
      }
      return;
    }
    if (myGeneration !== generation) return; // a fresher login/register attempt started meanwhile; drop this chain
    view.setRegisterMessage(i18n.t('register.successCreating'));
    const signedIn = await handleLogin({ email, password });
    if (signedIn === false) {
      autoLoginFailedAfterRegister = true;
      update({ type: 'LOGIN_FAILED', message: i18n.t('register.autoLoginFailed') });
      view.setSessionMode('login');
    }
  }

  return Object.freeze({
    handleLogin,
    handleRegister,
    getLastLoginError: () => lastLoginError,
    isAutoLoginFailedAfterRegister: () => autoLoginFailedAfterRegister
  });
}
