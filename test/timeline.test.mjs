import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInitialTimelineState,
  hasMoreTimelineGames,
  reduceTimelineState,
  visibleTimelineGames
} from '../js/timeline.js';
import { createTimelineView } from '../js/timeline-view.js';

function game(id, localDate = `2026-06-${String(id).padStart(2, '0')}`) {
  return {
    id: String(id),
    stadiumId: `s${id}`,
    homeScore: null,
    awayScore: null,
    localDate,
    played: false
  };
}

function games(count) {
  return Array.from({ length: count }, (_, index) => game(index + 1));
}

test('timeline data is sorted, deduped, and initially exposes the first batch of ten', () => {
  const source = [game(3, '2026-06-13'), game(1, '2026-06-11'), game(2, '2026-06-12'), game(2, '2026-06-10')];
  const state = reduceTimelineState(createInitialTimelineState(), { type: 'DATA_LOADED', games: source });

  assert.deepEqual(state.games.map((entry) => entry.id), ['1', '2', '3']);
  assert.equal(state.visibleCount, 3);
  assert.equal(hasMoreTimelineGames(state), false);
});

test('SHOW_NEXT reveals matches in batches of ten and is a no-op at the end', () => {
  const loaded = reduceTimelineState(createInitialTimelineState(), { type: 'DATA_LOADED', games: games(25) });
  assert.equal(visibleTimelineGames(loaded).length, 10);
  assert.equal(hasMoreTimelineGames(loaded), true);

  const second = reduceTimelineState(loaded, { type: 'SHOW_NEXT' });
  assert.equal(visibleTimelineGames(second).length, 20);

  const final = reduceTimelineState(second, { type: 'SHOW_NEXT' });
  assert.equal(visibleTimelineGames(final).length, 25);
  assert.equal(hasMoreTimelineGames(final), false);

  assert.equal(reduceTimelineState(final, { type: 'SHOW_NEXT' }), final);
});

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.parent = null;
    this.dataset = {};
    this._attrs = new Map();
    this._listeners = new Map();
    this.className = '';
    this.textContent = '';
    this.hidden = false;
    this.disabled = false;
    this.dateTime = '';
  }

  setAttribute(name, value) { this._attrs.set(name, String(value)); }
  getAttribute(name) { return this._attrs.has(name) ? this._attrs.get(name) : null; }

  append(...nodes) {
    for (const node of nodes) {
      node.parent = this;
      this.children.push(node);
    }
  }

  replaceChildren(...nodes) {
    for (const child of this.children) child.parent = null;
    this.children = [];
    this.append(...nodes);
  }

  addEventListener(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(handler);
  }

  trigger(type, event = {}) {
    for (const handler of this._listeners.get(type) ?? []) handler(event);
  }
}

function createFakeDocument() {
  const status = new FakeElement('p');
  const list = new FakeElement('ol');
  const loadMoreButton = new FakeElement('button');
  const retryButton = new FakeElement('button');
  const sentinel = new FakeElement('div');
  const byId = new Map([
    ['timeline-status', status],
    ['timeline-list', list],
    ['timeline-load-more', loadMoreButton],
    ['timeline-retry', retryButton],
    ['timeline-sentinel', sentinel]
  ]);
  const document = {
    getElementById: (id) => byId.get(id) ?? null,
    createElement: (tag) => new FakeElement(tag)
  };
  return { document, status, list, loadMoreButton, retryButton, sentinel };
}

test('timeline view performs one games request and load-more reveals the next local batch', async () => {
  const { document, status, list, loadMoreButton } = createFakeDocument();
  const calls = [];
  const api = {
    async apiRequest(endpoint, options = {}) {
      calls.push({ endpoint, options });
      return { data: games(21) };
    }
  };
  const view = createTimelineView(document, api, { IntersectionObserverImpl: undefined });
  await view.ensureLoaded();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].endpoint, 'games');
  assert.equal(list.children.length, 10);
  assert.equal(loadMoreButton.hidden, false);
  assert.match(status.textContent, /10 of 21/);

  loadMoreButton.trigger('click');
  assert.equal(list.children.length, 20);
  assert.equal(calls.length, 1, 'load more is local and must not refetch');
});

test('timeline view shows a persistent retry state after an initial games failure', async () => {
  const { document, status, list, loadMoreButton, retryButton, sentinel } = createFakeDocument();
  const api = { async apiRequest() { throw new Error('offline'); } };
  const view = createTimelineView(document, api, { IntersectionObserverImpl: undefined });
  await view.ensureLoaded();

  assert.match(status.textContent, /unavailable/i);
  assert.equal(list.children.length, 0);
  assert.equal(loadMoreButton.hidden, true);
  assert.equal(retryButton.hidden, false);
  assert.equal(sentinel.hidden, true);
});

test('timeline retry uses forceRetry and renders recovered matches without duplicating the failed request', async () => {
  const { document, list, retryButton } = createFakeDocument();
  let shouldFail = true;
  const calls = [];
  const api = {
    async apiRequest(endpoint, options = {}) {
      calls.push({ endpoint, forceRetry: options.forceRetry === true });
      if (shouldFail) throw new Error('offline');
      return { data: games(3) };
    }
  };
  const view = createTimelineView(document, api, { IntersectionObserverImpl: undefined });
  await view.ensureLoaded();
  shouldFail = false;
  assert.equal(retryButton.hidden, false);
  await view.retry();

  assert.deepEqual(calls, [
    { endpoint: 'games', forceRetry: false },
    { endpoint: 'games', forceRetry: true }
  ]);
  assert.equal(list.children.length, 3);
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('timeline retry countdown updates the live status and clears after recovery', async () => {
  const { document, status } = createFakeDocument();
  const pending = deferred();
  const timers = new Map();
  const cleared = [];
  let nextTimerId = 1;
  const api = {
    async apiRequest(endpoint, options = {}) {
      assert.equal(endpoint, 'games');
      options.onRetry({ attempt: 1, delayMs: 3000 });
      await pending.promise;
      return { data: games(1) };
    }
  };
  const view = createTimelineView(document, api, {
    IntersectionObserverImpl: undefined,
    setIntervalImpl(handler, delayMs) {
      assert.equal(delayMs, 1000);
      const id = nextTimerId;
      nextTimerId += 1;
      timers.set(id, handler);
      return id;
    },
    clearIntervalImpl(id) {
      cleared.push(id);
      timers.delete(id);
    }
  });

  const loadPromise = view.retry();
  await Promise.resolve();
  assert.match(status.textContent, /Retrying in 3s\./);

  timers.get(1)();
  assert.match(status.textContent, /Retrying in 2s\./);
  timers.get(1)();
  assert.match(status.textContent, /Retrying in 1s\./);

  pending.resolve();
  await loadPromise;
  assert.match(status.textContent, /1 of 1 matches shown\./);
  assert.deepEqual(cleared, [1]);
  assert.equal(timers.size, 0);
});

test('timeline reset clears an active retry countdown before stale recovery resolves', async () => {
  const { document, status } = createFakeDocument();
  const pending = deferred();
  const timers = new Map();
  const cleared = [];
  const api = {
    async apiRequest(endpoint, options = {}) {
      options.onRetry({ attempt: 1, delayMs: 2000 });
      await pending.promise;
      return { data: games(1) };
    }
  };
  const view = createTimelineView(document, api, {
    IntersectionObserverImpl: undefined,
    setIntervalImpl(handler) {
      timers.set(7, handler);
      return 7;
    },
    clearIntervalImpl(id) {
      cleared.push(id);
      timers.delete(id);
    }
  });

  const loadPromise = view.retry();
  await Promise.resolve();
  assert.match(status.textContent, /Retrying in 2s\./);

  view.reset();
  assert.deepEqual(cleared, [7]);
  assert.equal(timers.size, 0);

  pending.resolve();
  await loadPromise;
  assert.equal(status.textContent, 'No matches are available yet.');
});
test('timeline reset disconnects an active IntersectionObserver before session recovery continues', async () => {
  const { document, sentinel, list } = createFakeDocument();
  const instances = [];
  class FakeIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
      this.observed = [];
      this.disconnected = false;
      instances.push(this);
    }

    observe(element) {
      this.observed.push(element);
    }

    disconnect() {
      this.disconnected = true;
    }
  }
  const api = {
    async apiRequest() {
      return { data: games(21) };
    }
  };
  const view = createTimelineView(document, api, { IntersectionObserverImpl: FakeIntersectionObserver });
  await view.ensureLoaded();

  assert.equal(instances.length, 1);
  assert.deepEqual(instances[0].observed, [sentinel]);
  assert.equal(list.children.length, 10);

  view.reset();

  assert.equal(instances[0].disconnected, true);
  assert.equal(list.children.length, 0);
});
test('timeline announces when matches came from endpoint cache', async () => {
  const { document, status } = createFakeDocument();
  const api = {
    async apiRequest() {
      return { data: games(2), stale: true, source: 'cache', cachedAt: '2026-07-13T12:00:00.000Z' };
    }
  };
  const view = createTimelineView(document, api, { IntersectionObserverImpl: undefined });
  await view.ensureLoaded();

  assert.match(status.textContent, /cached data/i);
});
