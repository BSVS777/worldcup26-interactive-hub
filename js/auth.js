import { createSessionStore } from './session.js';

export function createAuthStore(options = {}) {
  return createSessionStore(null, options);
}

export function hasActiveSession(session) {
  return Boolean(session?.getToken?.());
}
