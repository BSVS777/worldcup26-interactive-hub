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

export function describeRegisterError(error, i18n = null) {
  const translate = (key, fallback) => i18n?.t?.(key) ?? fallback;
  if (error instanceof AuthenticationError) {
    // js/api.js:register() only throws AuthenticationError for HTTP 401/403 —
    // a rejected/forbidden registration attempt, not a malformed response —
    // so this must read like a rejection, not a contract/shape complaint.
    return translate('register.rejected', 'Registration was rejected by the server. Check your details and try again.');
  }
  if (error instanceof ApiError && error.status === 400) {
    return translate('register.duplicateOrRejected', 'Registration was rejected: this email may already be registered or the data was rejected.');
  }
  if (error instanceof ApiError && error.status === null) {
    return translate('register.unreachable', 'Could not reach the registration service. Check your connection and try again.');
  }
  if (error instanceof ApiError && error.status === 429) {
    return translate('register.busy', 'The registration service is busy. Wait a moment and try again.');
  }
  if (error instanceof ApiError && error.status >= 500) {
    return translate('register.unavailable', 'The registration service is temporarily unavailable. Try again shortly.');
  }
  return translate('register.genericFailure', 'We could not create the account. Try again.');
}
