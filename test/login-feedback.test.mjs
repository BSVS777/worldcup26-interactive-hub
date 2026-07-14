import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError, AuthenticationError } from '../js/api.js';
import { describeLoginError } from '../js/login-feedback.js';

test('classifies rejected credentials separately from network failures', () => {
  assert.match(describeLoginError(new AuthenticationError('denied', { status: 401 })), /email or password/i);
  assert.match(describeLoginError(new ApiError('offline', { status: null })), /connection/i);
  assert.match(describeLoginError(new ApiError('busy', { status: 429 })), /busy/i);
  assert.match(describeLoginError(new ApiError('down', { status: 500 })), /temporarily unavailable/i);
});

test('uses a safe generic message for unexpected login failures', () => {
  assert.equal(describeLoginError(new Error('secret internal detail')), 'Sign in could not be completed. Try again.');
});
