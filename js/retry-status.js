// Single global countdown clock for retryable API requests (429/500 and
// network-failure backoff). Views that already render their own dedicated
// countdown (Timeline) mark their retry events as handled via the api.js
// NOOP_RETRY comparison; this controller keeps only one active countdown at
// a time so the shell never shows two contradictory timers.

export function createRetryStatusController({
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval,
  onChange = () => {}
} = {}) {
  let timerId = null;
  let snapshot = null;

  function emit() {
    onChange(snapshot);
  }

  function clear() {
    if (timerId !== null) {
      clearIntervalImpl(timerId);
      timerId = null;
    }
    if (snapshot === null) return;
    snapshot = null;
    emit();
  }

  function notify({ endpoint, status, attempt, nextAttempt, delayMs, silent = false }) {
    if (timerId !== null) clearIntervalImpl(timerId);
    let secondsRemaining = Math.max(0, Math.ceil((Number(delayMs) || 0) / 1000));
    snapshot = { endpoint, status, attempt, nextAttempt, secondsRemaining, silent };
    if (secondsRemaining <= 0) {
      timerId = null;
      emit();
      return;
    }
    emit();
    timerId = setIntervalImpl(() => {
      secondsRemaining = Math.max(0, secondsRemaining - 1);
      snapshot = { ...snapshot, secondsRemaining };
      emit();
      if (secondsRemaining === 0) clear();
    }, 1000);
  }

  function getSnapshot() {
    return snapshot;
  }

  return Object.freeze({ notify, clear, getSnapshot });
}
