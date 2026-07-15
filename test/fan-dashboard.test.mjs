import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createInitialFanDashboardState,
  readFavoriteTeamId,
  readFanSnapshot,
  reduceFanDashboardState,
  writeFavoriteTeamId,
  writeFanSnapshot
} from '../js/fan-dashboard.js';
import { createFanDashboardView } from '../js/fan-dashboard-view.js';

const teams = [
  { id: 't1', name: 'Argentina', groupId: 'a' },
  { id: 't2', name: 'Canada', groupId: 'a' },
  { id: 't3', name: 'Mexico', groupId: 'b' }
];

const games = [
  { id: 'g1', localDate: '2026-06-11', homeTeamId: 't1', awayTeamId: 't2', homeScore: 2, awayScore: 1, played: true },
  { id: 'g2', localDate: '2026-06-15', homeTeamId: 't3', awayTeamId: 't1', homeScore: null, awayScore: null, played: false },
  { id: 'g3', localDate: '2026-06-20', homeTeamId: 't2', awayTeamId: 't3', homeScore: 0, awayScore: 0, played: true }
];

const groups = [
  { id: 'a', name: 'Group A', teams: [{ teamId: 't1', points: 3, goalsFor: 2, goalsAgainst: 1 }] }
];

class MemoryStorage {
  constructor(entries = []) { this.map = new Map(entries); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

test('fan dashboard derives favorite metrics and linked matches from API data', () => {
  const initial = createInitialFanDashboardState({ favoriteTeamId: 't1' });
  const state = reduceFanDashboardState(initial, { type: 'DATA_LOADED', teams, games, groups });

  assert.equal(state.dashboard.team.name, 'Argentina');
  assert.equal(state.dashboard.group.name, 'Group A');
  assert.deepEqual(state.dashboard.metrics, { points: 3, goalsFor: 2, goalsAgainst: 1, matches: 2 });
  assert.deepEqual(state.dashboard.games.map((game) => game.id), ['g1', 'g2']);
});

test('fan dashboard falls back to computed goals when group standing is absent', () => {
  const state = reduceFanDashboardState(createInitialFanDashboardState({ favoriteTeamId: 't2' }), {
    type: 'DATA_LOADED', teams, games, groups: []
  });

  assert.equal(state.dashboard.metrics.goalsFor, 1);
  assert.equal(state.dashboard.metrics.goalsAgainst, 2);
  assert.equal(state.dashboard.metrics.matches, 2);
});

test('favorite team and fan snapshot persist without storing sensitive data', () => {
  const storage = new MemoryStorage();
  writeFavoriteTeamId('t1', storage);
  assert.equal(readFavoriteTeamId(storage), 't1');

  const state = reduceFanDashboardState(createInitialFanDashboardState({ favoriteTeamId: 't1' }), { type: 'DATA_LOADED', teams, games, groups });
  writeFanSnapshot(state.dashboard, storage, new Date('2026-01-01T00:00:00.000Z'));
  const snapshot = readFanSnapshot('t1', storage);

  assert.equal(snapshot.team.id, 't1');
  assert.equal(snapshot.stale, true);
  assert.equal(JSON.stringify([...storage.map.values()]).includes('Bearer'), false);
});

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.parent = null;
    this._attrs = new Map();
    this._listeners = new Map();
    this.textContent = '';
    this.className = '';
    this.hidden = false;
    this.disabled = false;
    this.value = '';
    this.selected = false;
    this.dateTime = '';
  }

  setAttribute(name, value) { this._attrs.set(name, String(value)); }
  getAttribute(name) { return this._attrs.has(name) ? this._attrs.get(name) : null; }

  append(...nodes) {
    for (const node of nodes) {
      node.parent = this;
      this.children.push(node);
      if (this.tagName === 'select' && node.selected) this.value = node.value;
    }
  }

  replaceChildren(...nodes) {
    for (const child of this.children) child.parent = null;
    this.children = [];
    this.append(...nodes);
    if (this.tagName === 'select' && this.value === '' && this.children[0]) this.value = this.children[0].value;
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
  const selector = new FakeElement('select');
  const summary = new FakeElement('p');
  const metrics = new FakeElement('dl');
  const matches = new FakeElement('ul');
  const byId = new Map([
    ['fan-status', status],
    ['fan-team-select', selector],
    ['fan-summary', summary],
    ['fan-metrics', metrics],
    ['fan-matches', matches]
  ]);
  const document = {
    getElementById: (id) => byId.get(id) ?? null,
    createElement: (tag) => new FakeElement(tag)
  };
  return { document, status, selector, summary, metrics, matches };
}

test('fan dashboard view loads teams games and groups, then persists a changed favorite', async () => {
  const { document, selector, summary, metrics, matches } = createFakeDocument();
  const storage = new MemoryStorage();
  const calls = [];
  const api = {
    async apiRequest(endpoint) {
      calls.push(endpoint);
      if (endpoint === 'teams') return { data: teams };
      if (endpoint === 'games') return { data: games };
      return { data: groups };
    }
  };
  const view = createFanDashboardView(document, api, { storage });
  await view.ensureLoaded();

  assert.deepEqual(calls.sort(), ['games', 'groups', 'teams']);
  assert.equal(selector.children.length, 3);
  assert.match(summary.textContent, /Argentina/);
  assert.equal(metrics.children.length, 8);
  assert.equal(matches.children.length, 2);

  selector.value = 't2';
  selector.trigger('change');
  assert.equal(readFavoriteTeamId(storage), 't2');
  assert.match(summary.textContent, /Canada/);
});

test('fan dashboard view uses saved snapshot when live teams are unavailable', async () => {
  const storage = new MemoryStorage();
  const loaded = reduceFanDashboardState(createInitialFanDashboardState({ favoriteTeamId: 't1' }), { type: 'DATA_LOADED', teams, games, groups });
  writeFavoriteTeamId('t1', storage);
  writeFanSnapshot(loaded.dashboard, storage, new Date('2026-01-01T00:00:00.000Z'));
  const { document, status, summary, matches } = createFakeDocument();
  const api = { async apiRequest() { throw new Error('offline'); } };

  const view = createFanDashboardView(document, api, { storage });
  await view.ensureLoaded();

  assert.match(status.textContent, /saved favorite snapshot/i);
  assert.match(summary.textContent, /snapshot/i);
  assert.equal(matches.children.length, 2);
});