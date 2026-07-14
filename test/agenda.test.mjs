import assert from 'node:assert/strict';
import test from 'node:test';

import { createInitialAgendaState, reduceAgendaState } from '../js/agenda.js';
import { createAgendaView } from '../js/agenda-view.js';

const teams = [
  { id: 't1', name: 'Team A' },
  { id: 't2', name: 'Team B' },
  { id: 't3', name: 'Team C' },
  { id: 't4', name: 'Team D' }
];

const games = [
  { id: 'g1', localDate: '2026-06-11', homeTeamId: 't1', awayTeamId: 't2', homeScore: null, awayScore: null, played: false },
  { id: 'g2', localDate: '2026-06-11', homeTeamId: 't3', awayTeamId: 't4', homeScore: null, awayScore: null, played: false },
  { id: 'g3', localDate: '2026-06-12', homeTeamId: 't1', awayTeamId: 't3', homeScore: null, awayScore: null, played: false },
  { id: 'g4', localDate: '2026-06-13', homeTeamId: 't2', awayTeamId: 't4', homeScore: 1, awayScore: 1, played: true },
  { id: 'g5', localDate: '2026-06-13T15:00:00', homeTeamId: 't1', awayTeamId: 't4', homeScore: 2, awayScore: 0, played: true }
];

test('groups games by normalized local date and drops dates with fewer than two matches', () => {
  const state = reduceAgendaState(createInitialAgendaState(), { type: 'DATA_LOADED', games, teams });
  assert.deepEqual(state.dates.map((entry) => entry.date), ['2026-06-11', '2026-06-13']);
  assert.equal(state.dates.find((entry) => entry.date === '2026-06-12'), undefined);
});

test('strips a time-of-day suffix so same-day games with different timestamps still group together', () => {
  const state = reduceAgendaState(createInitialAgendaState(), { type: 'DATA_LOADED', games, teams });
  const june13 = state.dates.find((entry) => entry.date === '2026-06-13');
  assert.deepEqual(june13.games.map((game) => game.id), ['g4', 'g5']);
});

test('cross-references home and away team ids with real team names', () => {
  const state = reduceAgendaState(createInitialAgendaState(), { type: 'DATA_LOADED', games, teams });
  const june11 = state.dates.find((entry) => entry.date === '2026-06-11');
  assert.deepEqual(june11.games.map((game) => [game.homeTeamName, game.awayTeamName]), [
    ['Team A', 'Team B'],
    ['Team C', 'Team D']
  ]);
});

test('retained dates are sorted chronologically', () => {
  const reversedGames = [...games].reverse();
  const state = reduceAgendaState(createInitialAgendaState(), { type: 'DATA_LOADED', games: reversedGames, teams });
  assert.deepEqual(state.dates.map((entry) => entry.date), ['2026-06-11', '2026-06-13']);
});

test('DATE_NEXT advances the cursor and is a no-op once the last retained date is reached', () => {
  const loaded = reduceAgendaState(createInitialAgendaState(), { type: 'DATA_LOADED', games, teams });
  const next = reduceAgendaState(loaded, { type: 'DATE_NEXT' });
  assert.equal(next.currentIndex, 1);
  const pastEnd = reduceAgendaState(next, { type: 'DATE_NEXT' });
  assert.equal(pastEnd, next);
});

test('DATE_PREV retreats the cursor and is a no-op at the first retained date', () => {
  const loaded = reduceAgendaState(createInitialAgendaState(), { type: 'DATA_LOADED', games, teams });
  const beforeStart = reduceAgendaState(loaded, { type: 'DATE_PREV' });
  assert.equal(beforeStart, loaded);
  const next = reduceAgendaState(loaded, { type: 'DATE_NEXT' });
  const back = reduceAgendaState(next, { type: 'DATE_PREV' });
  assert.equal(back.currentIndex, 0);
});

test('a failed games fetch yields no retained dates', () => {
  const state = reduceAgendaState(createInitialAgendaState(), {
    type: 'DATA_LOADED', games: [], teams, gamesFailed: true
  });
  assert.equal(state.gamesFailed, true);
  assert.deepEqual(state.dates, []);
});

test('a failed teams fetch keeps games grouped but marks team names unavailable', () => {
  const state = reduceAgendaState(createInitialAgendaState(), {
    type: 'DATA_LOADED', games, teams: [], teamsFailed: true
  });
  assert.equal(state.teamsFailed, true);
  assert.equal(state.dates.length, 2);
  for (const entry of state.dates) {
    for (const game of entry.games) {
      assert.equal(game.homeTeamName, null);
      assert.equal(game.awayTeamName, null);
    }
  }
});

test('a successful fetch that legitimately has no simultaneous matchdays yields an empty, non-failed result', () => {
  const lonelyGames = [
    { id: 'g1', localDate: '2026-06-11', homeTeamId: 't1', awayTeamId: 't2', homeScore: null, awayScore: null, played: false },
    { id: 'g2', localDate: '2026-06-12', homeTeamId: 't3', awayTeamId: 't4', homeScore: null, awayScore: null, played: false }
  ];
  const state = reduceAgendaState(createInitialAgendaState(), { type: 'DATA_LOADED', games: lonelyGames, teams });
  assert.equal(state.gamesFailed, false);
  assert.deepEqual(state.dates, []);
});

test('a game referencing a team id absent from a successful teams fetch falls back to "Unknown team"', () => {
  const gamesWithMissingTeam = [
    { id: 'g1', localDate: '2026-06-11', homeTeamId: 't1', awayTeamId: 'ghost', homeScore: null, awayScore: null, played: false },
    { id: 'g2', localDate: '2026-06-11', homeTeamId: 't3', awayTeamId: 't4', homeScore: null, awayScore: null, played: false }
  ];
  const state = reduceAgendaState(createInitialAgendaState(), { type: 'DATA_LOADED', games: gamesWithMissingTeam, teams });
  const game = state.dates[0].games.find((g) => g.id === 'g1');
  assert.equal(game.homeTeamName, 'Team A');
  assert.equal(game.awayTeamName, 'Unknown team');
});

test('a game with a null or missing localDate is dropped from grouping instead of crashing', () => {
  const gamesWithMissingDate = [
    { id: 'g1', localDate: null, homeTeamId: 't1', awayTeamId: 't2', homeScore: null, awayScore: null, played: false },
    { id: 'g2', homeTeamId: 't3', awayTeamId: 't4', homeScore: null, awayScore: null, played: false },
    { id: 'g3', localDate: '2026-06-11', homeTeamId: 't1', awayTeamId: 't2', homeScore: null, awayScore: null, played: false },
    { id: 'g4', localDate: '2026-06-11', homeTeamId: 't3', awayTeamId: 't4', homeScore: null, awayScore: null, played: false }
  ];
  assert.doesNotThrow(() => {
    const state = reduceAgendaState(createInitialAgendaState(), { type: 'DATA_LOADED', games: gamesWithMissingDate, teams });
    assert.deepEqual(state.dates.map((entry) => entry.date), ['2026-06-11']);
  });
});

// --- Minimal hand-rolled fake DOM for createAgendaView tests (no jsdom) ---

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
    this.disabled = false;
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
}

function createFakeDocument() {
  const dateLabel = new FakeElement('p');
  const prevButton = new FakeElement('button');
  const nextButton = new FakeElement('button');
  const columns = new FakeElement('div');
  const byId = new Map([
    ['agenda-date-label', dateLabel],
    ['agenda-prev', prevButton],
    ['agenda-next', nextButton],
    ['agenda-columns', columns]
  ]);
  const document = {
    getElementById: (id) => byId.get(id) ?? null,
    createElement: (tag) => new FakeElement(tag)
  };
  return { document, dateLabel, prevButton, nextButton, columns };
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

test('before any data arrives, the columns area shows skeletons and controls are disabled, never blank', () => {
  const { document, columns, prevButton, nextButton } = createFakeDocument();
  const { apiRequest } = createControllableApi();
  createAgendaView(document, { apiRequest });

  assert.ok(columns.children.length > 0, 'columns area must never be left blank');
  assert.ok(columns.children.every((child) => child.className.includes('agenda-skeleton')));
  assert.equal(prevButton.disabled, true);
  assert.equal(nextButton.disabled, true);
});

test('when the games fetch fails entirely, skeletons remain and both controls stay disabled', async () => {
  const { document, columns, prevButton, nextButton } = createFakeDocument();
  const api = {
    apiRequest(endpoint) {
      if (endpoint === 'teams') return Promise.resolve({ data: teams });
      return Promise.reject(new Error('games unavailable'));
    }
  };
  const view = createAgendaView(document, api);
  await view.ensureLoaded();

  assert.ok(columns.children.length > 0, 'columns area must never be left blank');
  assert.ok(columns.children.every((child) => child.className.includes('agenda-skeleton')));
  assert.equal(prevButton.disabled, true);
  assert.equal(nextButton.disabled, true);
});

test('after a successful load, renders one column per simultaneous match on the first retained date', async () => {
  const { document, columns, prevButton, nextButton } = createFakeDocument();
  const api = { apiRequest: (endpoint) => Promise.resolve({ data: endpoint === 'games' ? games : teams }) };
  const view = createAgendaView(document, api);
  await view.ensureLoaded();

  assert.equal(columns.children.length, 2);
  assert.ok(columns.children.every((child) => !child.className.includes('agenda-skeleton')));
  assert.equal(prevButton.disabled, true, 'previous must be disabled on the first retained date');
  assert.equal(nextButton.disabled, false);
});

test('next/prev move across retained dates and disable at each boundary, including under rapid repeated clicks', async () => {
  const { document, columns, dateLabel, prevButton, nextButton } = createFakeDocument();
  const api = { apiRequest: (endpoint) => Promise.resolve({ data: endpoint === 'games' ? games : teams }) };
  const view = createAgendaView(document, api);
  await view.ensureLoaded();

  nextButton.trigger('click');
  assert.equal(dateLabel.textContent, '2026-06-13');
  assert.equal(columns.children.length, 2);
  assert.equal(nextButton.disabled, true, 'next must be disabled on the last retained date');
  assert.equal(prevButton.disabled, false);

  // Rapid repeated clicks past the boundary must not desync the state.
  nextButton.trigger('click');
  nextButton.trigger('click');
  nextButton.trigger('click');
  assert.equal(dateLabel.textContent, '2026-06-13');
  assert.equal(nextButton.disabled, true);

  prevButton.trigger('click');
  assert.equal(dateLabel.textContent, '2026-06-11');
  assert.equal(prevButton.disabled, true);

  prevButton.trigger('click');
  prevButton.trigger('click');
  assert.equal(dateLabel.textContent, '2026-06-11');
  assert.equal(prevButton.disabled, true);
});

test('clicking Next/Previous while the initial load is still in flight is a safe no-op', async () => {
  const { document, columns, dateLabel, prevButton, nextButton } = createFakeDocument();
  const { apiRequest, calls } = createControllableApi();
  const view = createAgendaView(document, { apiRequest });

  const loaded = view.ensureLoaded();

  // No data yet: empty `dates` already reads as both boundaries, so these
  // must be no-ops rather than throw or desync once real data lands.
  nextButton.trigger('click');
  prevButton.trigger('click');
  nextButton.trigger('click');

  assert.ok(columns.children.length > 0, 'columns area must never be left blank');
  assert.equal(prevButton.disabled, true);
  assert.equal(nextButton.disabled, true);

  calls.find((c) => c.endpoint === 'games').resolve({ data: games });
  calls.find((c) => c.endpoint === 'teams').resolve({ data: teams });
  await loaded;

  assert.equal(dateLabel.textContent, '2026-06-11', 'load must land on the first retained date, unaffected by the earlier clicks');
  assert.equal(prevButton.disabled, true);
  assert.equal(nextButton.disabled, false);
});

test('the loading label is distinct from the confirmed-empty label', async () => {
  const { document, dateLabel } = createFakeDocument();
  const { apiRequest, calls } = createControllableApi();
  const view = createAgendaView(document, { apiRequest });

  const loaded = view.ensureLoaded();
  assert.equal(dateLabel.textContent, 'Loading matches…');

  const lonelyGames = [
    { id: 'g1', localDate: '2026-06-11', homeTeamId: 't1', awayTeamId: 't2', homeScore: null, awayScore: null, played: false }
  ];
  calls.find((c) => c.endpoint === 'games').resolve({ data: lonelyGames });
  calls.find((c) => c.endpoint === 'teams').resolve({ data: teams });
  await loaded;

  assert.equal(dateLabel.textContent, 'No simultaneous matchdays yet.');
});

test('a stale in-flight load never overwrites a fresher load (race condition guard)', async () => {
  const { document, columns, dateLabel } = createFakeDocument();
  const { apiRequest, calls } = createControllableApi();
  const view = createAgendaView(document, { apiRequest });

  const firstLoad = view.ensureLoaded(); // load #1: calls[0]=games, calls[1]=teams
  view.reset();
  const secondLoad = view.ensureLoaded(); // load #2: calls[2]=games, calls[3]=teams

  assert.equal(calls.length, 4);

  const freshGames = [
    { id: 'fg1', localDate: '2026-07-01', homeTeamId: 't1', awayTeamId: 't2', homeScore: null, awayScore: null, played: false },
    { id: 'fg2', localDate: '2026-07-01', homeTeamId: 't3', awayTeamId: 't4', homeScore: null, awayScore: null, played: false }
  ];

  // Resolve the fresher load first.
  calls[2].resolve({ data: freshGames });
  calls[3].resolve({ data: teams });
  await secondLoad;

  // Now let the stale load resolve after the fresh one already rendered.
  calls[0].resolve({ data: games });
  calls[1].resolve({ data: teams });
  await firstLoad;

  assert.equal(dateLabel.textContent, '2026-07-01', 'must show the fresh load\'s date, not the stale one');
  assert.equal(columns.children.length, 2);
});
