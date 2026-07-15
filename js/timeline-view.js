import { requireElement } from './dom.js';
import {
  createInitialTimelineState,
  hasMoreTimelineGames,
  reduceTimelineState,
  visibleTimelineGames
} from './timeline.js';
import { formatScore } from './loadable-view.js';

export function createTimelineView(document, api, { IntersectionObserverImpl = globalThis.IntersectionObserver } = {}) {
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

  function createSkeletonRow() {
    const row = document.createElement('li');
    row.className = 'timeline-item timeline-skeleton';
    row.setAttribute('aria-hidden', 'true');
    return row;
  }

  function createGameRow(game) {
    const row = document.createElement('li');
    row.className = 'timeline-item';

    const time = document.createElement('time');
    time.className = 'timeline-item__date';
    if (game.localDate) time.dateTime = game.localDate;
    time.textContent = game.localDate ?? 'Date to be confirmed';

    const title = document.createElement('p');
    title.className = 'timeline-item__title';
    title.textContent = `Match ${game.id}`;

    const meta = document.createElement('p');
    meta.className = 'timeline-item__meta';
    meta.textContent = `${formatScore(game)} · Stadium ${game.stadiumId ?? 'TBC'}`;

    row.append(time, title, meta);
    return row;
  }

  function disconnectObserver() {
    observer?.disconnect?.();
    observer = null;
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
        ? `Retrying in ${state.retrySecondsRemaining}s.`
        : 'Loading match timeline.';
      return;
    }
    if (state.status === 'error') {
      elements.status.textContent = 'Match timeline unavailable. Retry when the API is reachable.';
      return;
    }
    if (state.games.length === 0) {
      elements.status.textContent = 'No matches are available yet.';
      return;
    }
    elements.status.textContent = `${visibleTimelineGames(state).length} of ${state.games.length} matches shown.`;
  }

  function renderControls() {
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
        }
      });
      if (myGeneration !== generation) return false;
      state = reduceTimelineState(state, { type: 'DATA_LOADED', games: result.data });
      render();
      return false;
    } catch {
      if (myGeneration !== generation) return false;
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
    loadPromise = null;
    state = reduceTimelineState(state, { type: 'RESET' });
    render();
  }

  elements.loadMoreButton.addEventListener('click', showNextBatch);
  elements.retryButton.addEventListener('click', retry);

  render();

  return Object.freeze({ ensureLoaded, reset, retry });
}
