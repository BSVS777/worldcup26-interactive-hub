import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError, AuthenticationError } from '../js/api.js';
import { describeLoginError, describeRegisterError } from '../js/login-feedback.js';

test('classifies rejected credentials separately from network failures', () => {
  assert.match(describeLoginError(new AuthenticationError('denied', { status: 401 })), /email or password/i);
  assert.match(describeLoginError(new ApiError('offline', { status: null })), /connection/i);
  assert.match(describeLoginError(new ApiError('busy', { status: 429 })), /busy/i);
  assert.match(describeLoginError(new ApiError('down', { status: 500 })), /temporarily unavailable/i);
});

test('uses a safe generic message for unexpected login failures', () => {
  assert.equal(describeLoginError(new Error('secret internal detail')), 'Sign in could not be completed. Try again.');
});

test('classifies a rejected registration separately from network/contract failures', () => {
  // js/api.js:register() only throws AuthenticationError for HTTP 401/403 —
  // a rejected registration, never a malformed-response case — so this must
  // NOT reuse "invalid response" wording.
  const rejected = describeRegisterError(new AuthenticationError('forbidden', { status: 403 }));
  assert.match(rejected, /rejected/i);
  assert.doesNotMatch(rejected, /invalid response/i);

  assert.match(describeRegisterError(new ApiError('duplicate', { status: 400 })), /already be registered|data was rejected/i);
  assert.match(describeRegisterError(new ApiError('offline', { status: null })), /connection/i);
  assert.match(describeRegisterError(new ApiError('busy', { status: 429 })), /busy/i);
  assert.match(describeRegisterError(new ApiError('down', { status: 500 })), /temporarily unavailable/i);
});

test('uses a safe generic message for unexpected registration failures', () => {
  assert.equal(describeRegisterError(new Error('secret internal detail')), 'We could not create the account. Try again.');
});
