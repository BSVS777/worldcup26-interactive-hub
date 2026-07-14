import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialTourState, reduceTourState } from '../js/tour.js';
import { createTourView } from '../js/tour-view.js';

const stadiums = [
  { id: 's1', name: 'Stadium One', city: 'City A', capacity: 60000 },
  { id: 's2', name: 'Stadium Two', city: 'City B', capacity: 70000 }
];
const games = [
  { id: 'g1', stadiumId: 's1', homeTeamId: 't1', awayTeamId: 't2', homeScore: null, awayScore: null, localDate: '2026-06-11', played: false },
  { id: 'g2', stadiumId: 's1', homeTeamId: 't3', awayTeamId: 't4', homeScore: 1, awayScore: 0, localDate: '2026-06-12', played: true }
];

test('cross-references each venue with the games that reference its real stadium id', () => {
  const state = reduceTourState(createInitialTourState(), { type: 'DATA_LOADED', stadiums, games });
  const [venueOne, venueTwo] = state.venues;
  assert.equal(venueOne.id, 's1');
  assert.deepEqual(venueOne.games.map((game) => game.id), ['g1', 'g2']);
  assert.equal(venueOne.gamesError, false);
  assert.equal(venueTwo.id, 's2');
});

test('a venue with no linked games renders an empty, non-error game list', () => {
  const state = reduceTourState(createInitialTourState(), { type: 'DATA_LOADED', stadiums, games });
  const venueTwo = state.venues.find((venue) => venue.id === 's2');
  assert.deepEqual(venueTwo.games, []);
  assert.equal(venueTwo.gamesError, false);
});

test('marks every venue with a local games error and no games when the games fetch failed', () => {
  const state = reduceTourState(createInitialTourState(), {
    type: 'DATA_LOADED', stadiums, games: [], gamesFailed: true
  });
  assert.equal(state.gamesFailed, true);
  assert.equal(state.venues.length, 2);
  for (const venue of state.venues) {
    assert.equal(venue.gamesError, true);
    assert.deepEqual(venue.games, []);
  }
});

test('selecting the same venue twice is idempotent and reuses the same state', () => {
  const loaded = reduceTourState(createInitialTourState(), { type: 'DATA_LOADED', stadiums, games });
  const firstSelection = reduceTourState(loaded, { type: 'VENUE_SELECTED', venueId: 's1' });
  const secondSelection = reduceTourState(firstSelection, { type: 'VENUE_SELECTED', venueId: 's1' });
  assert.equal(firstSelection.selectedVenueId, 's1');
  assert.equal(secondSelection, firstSelection);
});

test('selecting a different venue updates the active selection without mutating the previous state', () => {
  const loaded = reduceTourState(createInitialTourState(), { type: 'DATA_LOADED', stadiums, games });
  const firstSelection = reduceTourState(loaded, { type: 'VENUE_SELECTED', venueId: 's1' });
  const secondSelection = reduceTourState(firstSelection, { type: 'VENUE_SELECTED', venueId: 's2' });
  assert.equal(secondSelection.selectedVenueId, 's2');
  assert.equal(firstSelection.selectedVenueId, 's1');
  assert.notEqual(secondSelection, firstSelection);
});

test('marks stadiumsFailed and yields no venues when the stadiums fetch failed (fatal case)', () => {
  const state = reduceTourState(createInitialTourState(), {
    type: 'DATA_LOADED', stadiums: [], games: [], stadiumsFailed: true
  });
  assert.equal(state.stadiumsFailed, true);
  assert.equal(state.gamesFailed, false);
  assert.deepEqual(state.venues, []);
});

test('marks both stadiumsFailed and gamesFailed when both fetches failed', () => {
  const state = reduceTourState(createInitialTourState(), {
    type: 'DATA_LOADED', stadiums: [], games: [], stadiumsFailed: true, gamesFailed: true
  });
  assert.equal(state.stadiumsFailed, true);
  assert.equal(state.gamesFailed, true);
  assert.deepEqual(state.venues, []);
});

test('selecting an unknown venue id still updates the selection; the view layer falls back safely', () => {
  const loaded = reduceTourState(createInitialTourState(), { type: 'DATA_LOADED', stadiums, games });
  const selection = reduceTourState(loaded, { type: 'VENUE_SELECTED', venueId: 'unknown' });
  assert.equal(selection.selectedVenueId, 'unknown');
  assert.equal(selection.venues.find((venue) => venue.id === 'unknown'), undefined);
});

// --- Minimal hand-rolled fake DOM for createTourView tests (no jsdom) ---

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.parent = null;
    this.dataset = {};
    this._classes = new Set();
    this._attrs = new Map();
    this._listeners = new Map();
    this.textContent = '';
    this.className = '';
    this.scrollCalls = 0;
  }

  get classList() {
    const self = this;
    return {
      toggle(name, force) {
        const shouldAdd = force === undefined ? !self._classes.has(name) : force;
        if (shouldAdd) self._classes.add(name); else self._classes.delete(name);
      },
      add: (name) => this._classes.add(name),
      remove: (name) => this._classes.delete(name),
      contains: (name) => this._classes.has(name)
    };
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

  trigger(type, event) {
    for (const handler of this._listeners.get(type) ?? []) handler(event);
  }

  matches(selector) {
    return selector === '[data-venue-id]' && this.dataset.venueId !== undefined;
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (node.matches(selector)) return node;
      node = node.parent;
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }

  scrollIntoView() { this.scrollCalls++; }
}

function createFakeDocument() {
  const list = new FakeElement('ul');
  const detail = new FakeElement('div');
  const byId = new Map([['tour-venue-list', list], ['tour-venue-detail', detail]]);
  const document = {
    getElementById: (id) => byId.get(id) ?? null,
    createElement: (tag) => new FakeElement(tag)
  };
  return { document, list, detail };
}

// Returns an api whose apiRequest never resolves on its own; each call is
// recorded with its own resolve/reject so the test controls resolution order.
function createControllableApi() {
  const calls = [];
  function apiRequest(endpoint) {
    let resolve, reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    calls.push({ endpoint, resolve, reject });
    return promise;
  }
  return { apiRequest, calls };
}

function clickVenue(list, venueId) {
  const button = list.querySelectorAll('[data-venue-id]').find((b) => b.dataset.venueId === venueId);
  list.trigger('click', { target: button });
  return button;
}

test('a stale in-flight load never overwrites a fresher load (race condition fix)', async () => {
  const { document, list } = createFakeDocument();
  const { apiRequest, calls } = createControllableApi();
  const view = createTourView(document, { apiRequest });

  const firstLoad = view.ensureLoaded(); // load #1: calls[0]=stadiums, calls[1]=games
  view.reset();
  const secondLoad = view.ensureLoaded(); // load #2: calls[2]=stadiums, calls[3]=games

  assert.equal(calls.length, 4);

  // Resolve the fresher load first.
  calls[2].resolve({ data: [{ id: 'fresh', name: 'Fresh Stadium', city: 'City F' }] });
  calls[3].resolve({ data: [] });
  await secondLoad;

  // Now let the stale load resolve after the fresh one already rendered.
  calls[0].resolve({ data: [{ id: 'stale', name: 'Stale Stadium', city: 'City S' }] });
  calls[1].resolve({ data: [] });
  await firstLoad;

  const renderedIds = list.querySelectorAll('[data-venue-id]').map((button) => button.dataset.venueId);
  assert.deepEqual(renderedIds, ['fresh']);
});

test('when the games fetch fails, venues still render and clicking one shows a local error without blocking others', async () => {
  const { document, list, detail } = createFakeDocument();
  const calls = [];
  const api = {
    apiRequest(endpoint) {
      if (endpoint === 'stadiums') return Promise.resolve({ data: stadiums });
      calls.push(endpoint);
      return Promise.reject(new Error('games unavailable'));
    }
  };
  const view = createTourView(document, api);
  await view.ensureLoaded();

  const buttons = list.querySelectorAll('[data-venue-id]');
  assert.equal(buttons.length, 2);

  assert.doesNotThrow(() => clickVenue(list, 's1'));
  let errorParagraph = detail.children.find((child) => child.getAttribute('role') === 'alert');
  assert.ok(errorParagraph, 'expected a local per-venue error message');
  assert.match(errorParagraph.textContent, /unavailable/);

  // Other venues remain navigable.
  assert.doesNotThrow(() => clickVenue(list, 's2'));
  errorParagraph = detail.children.find((child) => child.getAttribute('role') === 'alert');
  assert.ok(errorParagraph, 'second venue selection should also show its own local error');
});

test('clicking the same venue twice does not re-fetch or duplicate rendered content', async () => {
  const { document, list, detail } = createFakeDocument();
  const { apiRequest, calls } = createControllableApi();
  const view = createTourView(document, { apiRequest });

  const loadPromise = view.ensureLoaded();
  calls[0].resolve({ data: stadiums });
  calls[1].resolve({ data: games });
  await loadPromise;

  const firstButton = clickVenue(list, 's1');
  const callsAfterFirstClick = calls.length;
  const childrenAfterFirstClick = detail.children.length;
  const scrollsAfterFirstClick = firstButton.scrollCalls;

  clickVenue(list, 's1');

  assert.equal(calls.length, callsAfterFirstClick, 'repeat click must not trigger a new network request');
  assert.equal(detail.children.length, childrenAfterFirstClick, 'repeat click must not duplicate rendered content');
  assert.equal(firstButton.scrollCalls, scrollsAfterFirstClick, 'repeat click on the active venue should skip the redundant scroll');
});
