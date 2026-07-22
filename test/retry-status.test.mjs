import assert from 'node:assert/strict';
import test from 'node:test';

import { createRetryStatusController } from '../js/retry-status.js';

function fakeTimers() {
  const timers = new Map();
  let nextId = 1;
  return {
    setIntervalImpl(handler) {
      const id = nextId++;
      timers.set(id, handler);
      return id;
    },
    clearIntervalImpl(id) {
      timers.delete(id);
    },
    tick(id = 1) {
      timers.get(id)();
    },
    activeCount() {
      return timers.size;
    }
  };
}

test('notify emits an immediate snapshot then ticks the countdown down to zero and clears', () => {
  const timers = fakeTimers();
  const changes = [];
  const controller = createRetryStatusController({
    setIntervalImpl: timers.setIntervalImpl,
    clearIntervalImpl: timers.clearIntervalImpl,
    onChange: (snapshot) => changes.push(snapshot)
  });

  controller.notify({ endpoint: 'games', status: 429, attempt: 1, nextAttempt: 2, delayMs: 2000 });
  assert.equal(changes.length, 1);
  assert.equal(changes[0].secondsRemaining, 2);
  assert.equal(changes[0].silent, false);

  timers.tick();
  assert.equal(changes.at(-1).secondsRemaining, 1);
  timers.tick();
  assert.equal(changes.at(-1), null);
  assert.equal(timers.activeCount(), 0);
});

test('a new notify replaces any in-flight countdown instead of running two at once', () => {
  const timers = fakeTimers();
  const changes = [];
  const controller = createRetryStatusController({
    setIntervalImpl: timers.setIntervalImpl,
    clearIntervalImpl: timers.clearIntervalImpl,
    onChange: (snapshot) => changes.push(snapshot)
  });

  controller.notify({ endpoint: 'stadiums', status: 429, attempt: 1, nextAttempt: 2, delayMs: 3000 });
  controller.notify({ endpoint: 'games', status: 500, attempt: 1, nextAttempt: 2, delayMs: 1000 });

  assert.equal(timers.activeCount(), 1, 'only one active countdown timer at a time');
  assert.equal(changes.at(-1).endpoint, 'games');
});

test('marks a caller-handled retry as silent so the shell does not duplicate its own countdown', () => {
  const timers = fakeTimers();
  const changes = [];
  const controller = createRetryStatusController({
    setIntervalImpl: timers.setIntervalImpl,
    clearIntervalImpl: timers.clearIntervalImpl,
    onChange: (snapshot) => changes.push(snapshot)
  });

  controller.notify({ endpoint: 'games', status: 429, attempt: 1, nextAttempt: 2, delayMs: 1000, silent: true });
  assert.equal(changes[0].silent, true);
});

test('clear stops the timer and emits null exactly once', () => {
  const timers = fakeTimers();
  const changes = [];
  const controller = createRetryStatusController({
    setIntervalImpl: timers.setIntervalImpl,
    clearIntervalImpl: timers.clearIntervalImpl,
    onChange: (snapshot) => changes.push(snapshot)
  });

  controller.notify({ endpoint: 'games', status: 429, attempt: 1, nextAttempt: 2, delayMs: 5000 });
  controller.clear();
  controller.clear();

  assert.equal(timers.activeCount(), 0);
  assert.equal(changes.filter((snapshot) => snapshot === null).length, 1);
  assert.equal(controller.getSnapshot(), null);
});
