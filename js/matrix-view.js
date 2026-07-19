import { requireElement } from './dom.js';
import { announceViewRendered, markInteractiveCard } from './components.js';
import { createLoadableView } from './loadable-view.js';
import { createInitialMatrixState, reduceMatrixState } from './matrix.js';

function matrixStructureKey(matrices) {
  return matrices.map((matrix) => `${matrix.id}:${matrix.teams.map((team) => team.id).join(',')}`).join('|');
}

export function createMatrixView(document, api) {
  const elements = {
    status: requireElement(document, 'matrix-status', 'matrix element'),
    grid: requireElement(document, 'matrix-grid', 'matrix element')
  };
  const loadable = createLoadableView(api);
  let state = createInitialMatrixState();
  let hasCachedData = false;
  let structureKey = '';
  const cellRefs = new Map();

  function renderStatus() {
    if (state.status === 'loading') {
      elements.status.textContent = 'Loading groups, teams, and matches.';
      return;
    }
    if (state.groupsFailed) {
      elements.status.textContent = 'Group matrix unavailable. Groups are required to build the tables.';
      return;
    }
    if (state.teamsFailed || state.gamesFailed) {
      elements.status.textContent = hasCachedData ? 'Group matrix loaded with cached and partial live data.' : 'Group matrix loaded with partial live data.';
      return;
    }
    if (hasCachedData && state.matrices.length > 0) {
      elements.status.textContent = 'Group matrix ready from cached data.';
      return;
    }
    elements.status.textContent = state.matrices.length > 0 ? 'Group matrix ready.' : 'No group data is available yet.';
  }

  function makeCellKey(matrixId, rowTeamId, columnTeamId) {
    return `${matrixId}::${rowTeamId}::${columnTeamId}`;
  }

  function renderSkeleton() {
    const items = Array.from({ length: 3 }, () => {
      const item = document.createElement('div');
      item.className = 'matrix-skeleton';
      item.setAttribute('aria-hidden', 'true');
      return item;
    });
    elements.grid.replaceChildren(...items);
  }

  function renderEmpty() {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = state.groupsFailed
      ? 'Groups are unavailable, so matchups cannot be built.'
      : 'No groups are available to build matchup matrices.';
    elements.grid.replaceChildren(empty);
  }

  function renderStructure() {
    cellRefs.clear();
    if (state.status === 'loading' && state.matrices.length === 0) {
      renderSkeleton();
      return;
    }
    if (state.matrices.length === 0) {
      renderEmpty();
      return;
    }

    const cards = state.matrices.map((matrix) => {
      const section = document.createElement('section');
      section.className = 'matrix-card';
      markInteractiveCard(section, 'matrix');
      section.setAttribute('aria-labelledby', `matrix-title-${matrix.id}`);

      const title = document.createElement('h3');
      title.id = `matrix-title-${matrix.id}`;
      title.textContent = matrix.name;

      const shell = document.createElement('div');
      shell.className = 'matrix-table-shell';

      const table = document.createElement('table');
      table.className = 'matrix-table';
      const caption = document.createElement('caption');
      caption.textContent = matrix.completeFourByFour
        ? `${matrix.name} head-to-head matrix`
        : `${matrix.name} head-to-head matrix with ${matrix.teams.length} listed teams`;
      table.append(caption);

      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      const corner = document.createElement('th');
      corner.scope = 'col';
      corner.textContent = 'Team';
      headerRow.append(corner);
      for (const team of matrix.teams) {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = team.name;
        headerRow.append(th);
      }
      thead.append(headerRow);
      table.append(thead);

      const tbody = document.createElement('tbody');
      for (const row of matrix.rows) {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = row.team.name;
        tr.append(th);
        for (const cell of row.cells) {
          const td = document.createElement('td');
          td.className = 'matrix-cell';
          if (cell.diagonal) td.className = 'matrix-cell matrix-cell--diagonal';
          td.dataset.matrixCell = makeCellKey(matrix.id, cell.rowTeamId, cell.columnTeamId);
          tr.append(td);
          cellRefs.set(td.dataset.matrixCell, td);
        }
        tbody.append(tr);
      }
      table.append(tbody);
      shell.append(table);
      section.append(title, shell);
      return section;
    });
    elements.grid.replaceChildren(...cards);
  announceViewRendered(document, { route: 'group-matrix' });
  }

  function updateCells() {
    for (const matrix of state.matrices) {
      for (const row of matrix.rows) {
        for (const cell of row.cells) {
          const td = cellRefs.get(makeCellKey(matrix.id, cell.rowTeamId, cell.columnTeamId));
          if (!td) continue;
          td.textContent = cell.score;
          td.setAttribute('aria-label', cell.label);
          td.dataset.status = cell.status;
          if (cell.diagonal) td.setAttribute('aria-disabled', 'true');
          else td.removeAttribute('aria-disabled');
        }
      }
    }
  }

  function render() {
    renderStatus();
    const nextStructureKey = matrixStructureKey(state.matrices);
    if ((state.status === 'loading' && state.matrices.length === 0) || nextStructureKey !== structureKey) {
      structureKey = nextStructureKey;
      renderStructure();
    }
    updateCells();
  }

  async function load(isCurrent) {
    state = reduceMatrixState(state, { type: 'LOAD_STARTED' });
    render();
    const [groups, teams, games] = await Promise.all([
      loadable.fetchOrFallback('groups'),
      loadable.fetchOrFallback('teams'),
      loadable.fetchOrFallback('games')
    ]);
    if (!isCurrent()) return false;
    hasCachedData = groups.stale || teams.stale || games.stale;
    state = reduceMatrixState(state, {
      type: 'DATA_LOADED',
      groups: groups.data,
      teams: teams.data,
      games: games.data,
      groupsFailed: groups.failed,
      teamsFailed: teams.failed,
      gamesFailed: games.failed
    });
    render();
    return groups.failed;
  }

  function ensureLoaded() {
    return loadable.ensureLoaded(load);
  }

  function refresh() {
    loadable.reset();
    return ensureLoaded();
  }

  function reset() {
    loadable.reset();
    state = reduceMatrixState(state, { type: 'RESET' });
    hasCachedData = false;
    structureKey = '';
    cellRefs.clear();
    render();
  }

  render();
  return Object.freeze({ ensureLoaded, refresh, reset });
}
