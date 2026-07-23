import { ApiError, AuthenticationError } from './api.js';

export function describeLoginError(error, i18n = null) {
  const translate = (key, fallback) => i18n?.t?.(key) ?? fallback;
  if (error instanceof AuthenticationError) {
    if (error.status === 401 || error.status === 403) {
      return translate('session.invalidCredentials', 'Email or password was not accepted. Check both fields and try again.');
    }
    return translate('session.invalidResponse', 'The sign-in service returned an invalid response. Try again shortly.');
  }
  if (error instanceof ApiError && error.status === null) {
    return translate('session.unreachable', 'Could not reach the sign-in service. Check your connection and try again.');
  }
  if (error instanceof ApiError && error.status === 429) {
    return translate('session.busy', 'The sign-in service is busy. Wait a moment and try again.');
  }
  if (error instanceof ApiError && error.status >= 500) {
    return translate('session.unavailable', 'The sign-in service is temporarily unavailable. Try again shortly.');
  }
  return translate('session.incomplete', 'Sign in could not be completed. Try again.');
}
