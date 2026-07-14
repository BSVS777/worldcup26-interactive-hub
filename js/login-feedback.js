import { ApiError, AuthenticationError } from './api.js';

export function describeLoginError(error) {
  if (error instanceof AuthenticationError) {
    if (error.status === 401 || error.status === 403) {
      return 'Email or password was not accepted. Check both fields and try again.';
    }
    return 'The sign-in service returned an invalid response. Try again shortly.';
  }
  if (error instanceof ApiError && error.status === null) {
    return 'Could not reach the sign-in service. Check your connection and try again.';
  }
  if (error instanceof ApiError && error.status === 429) {
    return 'The sign-in service is busy. Wait a moment and try again.';
  }
  if (error instanceof ApiError && error.status >= 500) {
    return 'The sign-in service is temporarily unavailable. Try again shortly.';
  }
  return 'Sign in could not be completed. Try again.';
}
