import { requireElement } from './dom.js';
import { announceViewRendered, markInteractiveCard, markPrimaryControl } from './components.js';
import {
  createInitialTimelineState,
  hasMoreTimelineGames,
  reduceTimelineState,
  visibleTimelineGames
} from './timeline.js';
import { createI18n } from './i18n.js';
import { formatScore } from './loadable-view.js';

const DEFAULT_I18N = createI18n({ document: null, storage: null, locale: 'en' });

export function createTimelineView(document, api, {
  i18n = DEFAULT_I18N,
  IntersectionObserverImpl = globalThis.IntersectionObserver,
  setIntervalImpl = globalThis.setInterval,
  clearIntervalImpl = globalThis.clearInterval
} = {}) {
  const elements = {
    status: requireElement(document, 'timeline-status', 'timeline element'),
    list: requireElement(document, 'timeline-list', 'timeline element'),
    loadMoreButton: requireElement(document, 'timeline-load-more', 'timeline element'),
    retryButton: requireElement(document, 'timeline-retry', 'timeline element'),
    sentinel: requireElement(document, 'timeline-sentinel', 'timeline element')
  };
  let state = createInitialTimelineState();
  let generation = 0;
  let loadPromise = null;
  let observer = null;
  let retryCountdownTimer = null;
  let hasCachedData = false;

  function createSkeletonRow() {
    const row = document.createElement('li');
    row.className = 'timeline-item timeline-skeleton';
    row.setAttribute('aria-hidden', 'true');
    return row;
  }

  function createGameRow(game) {
    const row = document.createElement('li');
    row.className = 'timeline-item';
    markInteractiveCard(row, 'timeline');

    const time = document.createElement('time');
    time.className = 'timeline-item__date';
    if (game.localDate) time.dateTime = game.localDate;
    time.textContent = i18n.formatDate(game.localDate);

    const title = document.createElement('p');
    title.className = 'timeline-item__title';
    title.textContent = i18n.t('timeline.match', { id: game.id });

    const meta = document.createElement('p');
    meta.className = 'timeline-item__meta';
    meta.textContent = `${formatScore(game, i18n.t('common.notPlayed'), i18n.formatNumber)} · ${i18n.t('timeline.stadium', { stadium: game.stadiumId ?? i18n.t('common.tbc') })}`;

    row.append(time, title, meta);
    return row;
  }

  function disconnectObserver() {
    observer?.disconnect?.();
    observer = null;
  }

  function clearRetryCountdown() {
    if (retryCountdownTimer === null) return;
    clearIntervalImpl?.(retryCountdownTimer);
    retryCountdownTimer = null;
  }

  function startRetryCountdown(delayMs, activeGeneration) {
    clearRetryCountdown();
    if (typeof setIntervalImpl !== 'function') return;
    let secondsRemaining = Math.max(0, Math.ceil((Number(delayMs) || 0) / 1000));
    if (secondsRemaining <= 0) return;
    retryCountdownTimer = setIntervalImpl(() => {
      if (activeGeneration !== generation) {
        clearRetryCountdown();
        return;
      }
      secondsRemaining = Math.max(0, secondsRemaining - 1);
      state = reduceTimelineState(state, { type: 'RETRY_COUNTDOWN', secondsRemaining });
      renderStatus();
      if (secondsRemaining === 0) clearRetryCountdown();
    }, 1000);
  }

  function showNextBatch() {
    const nextState = reduceTimelineState(state, { type: 'SHOW_NEXT' });
    if (nextState === state) return;
    state = nextState;
    render();
  }

  function syncObserver() {
    disconnectObserver();
    if (!hasMoreTimelineGames(state) || typeof IntersectionObserverImpl !== 'function') return;
    observer = new IntersectionObserverImpl((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) showNextBatch();
    });
    observer.observe(elements.sentinel);
  }

  function renderList() {
    if (state.status === 'loading' && state.games.length === 0) {
      elements.list.replaceChildren(...Array.from({ length: 3 }, createSkeletonRow));
      return;
    }
    elements.list.replaceChildren(...visibleTimelineGames(state).map(createGameRow));
  }

  function renderStatus() {
    if (state.status === 'loading') {
      elements.status.textContent = state.retrying && state.retrySecondsRemaining > 0
        ? i18n.t('timeline.retrying', { seconds: state.retrySecondsRemaining })
        : i18n.t('timeline.loading');
      return;
    }
    if (state.status === 'error') {
      elements.status.textContent = i18n.t('timeline.unavailable');
      return;
    }
    if (state.games.length === 0) {
      elements.status.textContent = i18n.t('timeline.empty');
      return;
    }
    elements.status.textContent = hasCachedData
      ? i18n.t('timeline.shownCached', { visible: visibleTimelineGames(state).length, total: state.games.length })
      : i18n.t('timeline.shown', { visible: visibleTimelineGames(state).length, total: state.games.length });
  }

  function renderControls() {
    elements.list.setAttribute('aria-label', i18n.t('timeline.label'));
    elements.loadMoreButton.textContent = i18n.t('timeline.loadMore');
    elements.retryButton.textContent = i18n.t('timeline.retry');
    elements.loadMoreButton.hidden = state.status !== 'loaded' || !hasMoreTimelineGames(state);
    elements.loadMoreButton.disabled = state.status !== 'loaded' || !hasMoreTimelineGames(state);
    elements.retryButton.hidden = state.status !== 'error';
    elements.retryButton.disabled = state.status === 'loading';
    elements.sentinel.hidden = state.status !== 'loaded' || !hasMoreTimelineGames(state);
  }

  function render() {
    renderStatus();
    renderList();
    renderControls();
    syncObserver();
  }

  async function load({ forceRetry = false } = {}) {
    const myGeneration = ++generation;
    state = reduceTimelineState(state, { type: 'LOAD_STARTED', retrying: forceRetry });
    render();

    try {
      const result = await api.apiRequest('games', {
        forceRetry,
        onRetry: (event) => {
          if (myGeneration !== generation) return;
          state = reduceTimelineState(state, { type: 'RETRY_TICK', attempt: event.attempt, delayMs: event.delayMs });
          renderStatus();
          startRetryCountdown(event.delayMs, myGeneration);
        }
      });
      if (myGeneration !== generation) return false;
      clearRetryCountdown();
      hasCachedData = Boolean(result.stale);
      state = reduceTimelineState(state, { type: 'DATA_LOADED', games: result.data });
      render();
      announceViewRendered(document, { route: 'timeline' });
      return false;
    } catch {
      if (myGeneration !== generation) return false;
      clearRetryCountdown();
      state = reduceTimelineState(state, { type: 'LOAD_FAILED' });
      render();
      loadPromise = null;
      return true;
    }
  }

  function ensureLoaded() {
    if (loadPromise) return loadPromise;
    loadPromise = load();
    return loadPromise;
  }

  function retry() {
    if (state.status === 'loading') return loadPromise;
    loadPromise = load({ forceRetry: true });
    return loadPromise;
  }

  function reset() {
    generation++;
    disconnectObserver();
    clearRetryCountdown();
    loadPromise = null;
    hasCachedData = false;
    state = reduceTimelineState(state, { type: 'RESET' });
    render();
  }

  elements.loadMoreButton.addEventListener('click', showNextBatch);
  elements.retryButton.addEventListener('click', retry);
  markPrimaryControl(elements.loadMoreButton);
  markPrimaryControl(elements.retryButton);

  render();

  function renderLocale() {
    renderStatus();
    renderList();
    renderControls();
  }

  return Object.freeze({ ensureLoaded, renderLocale, reset, retry });
}
