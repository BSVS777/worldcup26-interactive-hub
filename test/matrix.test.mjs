import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGroupMatrices, createInitialMatrixState, reduceMatrixState } from '../js/matrix.js';
import { createMatrixView } from '../js/matrix-view.js';

const teams = [
  { id: 't1', name: 'Argentina', groupId: 'a' },
  { id: 't2', name: 'Canada', groupId: 'a' },
  { id: 't3', name: 'Mexico', groupId: 'a' },
  { id: 't4', name: 'United States', groupId: 'a' }
];

const groups = [
  { id: 'a', name: 'Group A', teams: teams.map((team) => ({ teamId: team.id, points: 0, goalsFor: 0, goalsAgainst: 0 })) }
];

const games = [
  { id: 'g1', localDate: '2026-06-11', homeTeamId: 't1', awayTeamId: 't2', homeScore: 2, awayScore: 1, played: true },
  { id: 'g2', localDate: '2026-06-12', homeTeamId: 't3', awayTeamId: 't4', homeScore: null, awayScore: null, played: false }
];

function cell(matrix, rowTeamId, columnTeamId) {
  return matrix.rows.find((row) => row.team.id === rowTeamId).cells.find((item) => item.columnTeamId === columnTeamId);
}

test('builds a 4x4 matrix from groups teams and games', () => {
  const [matrix] = buildGroupMatrices(groups, teams, games);

  assert.equal(matrix.name, 'Group A');
  assert.equal(matrix.completeFourByFour, true);
  assert.equal(matrix.rows.length, 4);
  assert.ok(matrix.rows.every((row) => row.cells.length === 4));
  assert.equal(cell(matrix, 't1', 't2').score, '2 - 1');
  assert.equal(cell(matrix, 't2', 't1').score, '1 - 2');
  assert.equal(cell(matrix, 't3', 't4').score, 'Pending');
});

test('marks diagonal cells as disabled and semantic same-team cells', () => {
  const [matrix] = buildGroupMatrices(groups, teams, games);
  const diagonal = cell(matrix, 't1', 't1');

  assert.equal(diagonal.diagonal, true);
  assert.equal(diagonal.status, 'disabled');
  assert.equal(diagonal.score, '—');
  assert.match(diagonal.label, /same team/i);
});

test('without games it still draws the complete group matrix with pending cells', () => {
  const state = reduceMatrixState(createInitialMatrixState(), { type: 'DATA_LOADED', groups, teams, games: [], gamesFailed: true });
  const [matrix] = state.matrices;

  assert.equal(state.gamesFailed, true);
  assert.equal(matrix.rows.length, 4);
  assert.equal(cell(matrix, 't1', 't2').score, 'Pending');
  assert.equal(cell(matrix, 't1', 't2').status, 'unknown');
});

test('falls back to group standings when team endpoint is unavailable', () => {
  const [matrix] = buildGroupMatrices(groups, [], [], { teamsFailed: true, gamesFailed: true });

  assert.equal(matrix.rows.length, 4);
  assert.equal(matrix.teams[0].name, 'Unknown team');
});

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.parent = null;
    this.dataset = {};
    this._attrs = new Map();
    this.textContent = '';
    this.className = '';
    this.hidden = false;
    this.id = '';
  }

  setAttribute(name, value) { this._attrs.set(name, String(value)); }
  getAttribute(name) { return this._attrs.has(name) ? this._attrs.get(name) : null; }
  removeAttribute(name) { this._attrs.delete(name); }

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

  querySelectorAll(selector) {
    const results = [];
    const matches = (node) => selector === '[data-matrix-cell]' && node.dataset.matrixCell !== undefined;
    const walk = (node) => {
      for (const child of node.children) {
        if (matches(child)) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }
}

function createFakeDocument() {
  const status = new FakeElement('p');
  const grid = new FakeElement('div');
  const byId = new Map([['matrix-status', status], ['matrix-grid', grid]]);
  const document = {
    getElementById: (id) => byId.get(id) ?? null,
    createElement: (tag) => new FakeElement(tag)
  };
  return { document, status, grid };
}

test('matrix view loads groups teams games and renders accessible cell labels', async () => {
  const { document, status, grid } = createFakeDocument();
  const api = {
    async apiRequest(endpoint) {
      if (endpoint === 'groups') return { data: groups };
      if (endpoint === 'teams') return { data: teams };
      return { data: games };
    }
  };

  const view = createMatrixView(document, api);
  await view.ensureLoaded();

  assert.equal(status.textContent, 'Group matrix ready.');
  assert.equal(grid.children.length, 1);
  const cells = grid.querySelectorAll('[data-matrix-cell]');
  assert.equal(cells.length, 16);
  assert.equal(cells.find((item) => item.dataset.matrixCell === 'a::t1::t2').textContent, '2 - 1');
  assert.equal(cells.find((item) => item.dataset.matrixCell === 'a::t1::t1').getAttribute('aria-disabled'), 'true');
});

test('matrix view refresh updates cells without rebuilding tables when structure is unchanged', async () => {
  const { document, grid } = createFakeDocument();
  let currentGames = games;
  const api = {
    async apiRequest(endpoint) {
      if (endpoint === 'groups') return { data: groups };
      if (endpoint === 'teams') return { data: teams };
      return { data: currentGames };
    }
  };

  const view = createMatrixView(document, api);
  await view.ensureLoaded();
  const firstTable = grid.children[0];
  const target = grid.querySelectorAll('[data-matrix-cell]').find((item) => item.dataset.matrixCell === 'a::t3::t4');
  assert.equal(target.textContent, 'Pending');

  currentGames = [games[0], { ...games[1], homeScore: 3, awayScore: 0, played: true }];
  await view.refresh();

  const refreshedTarget = grid.querySelectorAll('[data-matrix-cell]').find((item) => item.dataset.matrixCell === 'a::t3::t4');
  assert.equal(grid.children[0], firstTable);
  assert.equal(refreshedTarget, target);
  assert.equal(refreshedTarget.textContent, '3 - 0');
});
