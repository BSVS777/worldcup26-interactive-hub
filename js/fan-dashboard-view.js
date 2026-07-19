import { requireElement } from './dom.js';
import { announceViewRendered, markInteractiveCard } from './components.js';
import { createLoadableView, formatScore } from './loadable-view.js';
import {
  createFanTheme,
  createInitialFanDashboardState,
  readFanSnapshot,
  readFavoriteTeamId,
  reduceFanDashboardState,
  writeFanSnapshot,
  writeFavoriteTeamId
} from './fan-dashboard.js';

export function createFanDashboardView(document, api, { storage = globalThis.localStorage } = {}) {
  const elements = {
    root: requireElement(document, 'fan-dashboard-view', 'fan dashboard element'),
    status: requireElement(document, 'fan-status', 'fan dashboard element'),
    selector: requireElement(document, 'fan-team-select', 'fan dashboard element'),
    summary: requireElement(document, 'fan-summary', 'fan dashboard element'),
    metrics: requireElement(document, 'fan-metrics', 'fan dashboard element'),
    matches: requireElement(document, 'fan-matches', 'fan dashboard element')
  };
  let state = createInitialFanDashboardState({ favoriteTeamId: readFavoriteTeamId(storage) });
  const loadable = createLoadableView(api);
  let lastGames = Object.freeze([]);
  let lastGroups = Object.freeze([]);
  let hasCachedData = false;

  function metricTerm(label) {
    const term = document.createElement('dt');
    term.textContent = label;
    return term;
  }

  function metricValue(value) {
    const item = document.createElement('dd');
    item.textContent = String(value);
    return item;
  }

  function renderSelector() {
    const options = state.teams.map((team) => {
      const option = document.createElement('option');
      option.value = team.id;
      option.textContent = team.name;
      option.selected = team.id === state.favoriteTeamId;
      return option;
    });
    elements.selector.replaceChildren(...options);
    elements.selector.disabled = state.teams.length === 0;
  }

  function renderSummary() {
    if (!state.dashboard) {
      elements.summary.textContent = state.status === 'loading'
        ? 'Loading fan dashboard.'
        : 'Select a team when live team data is available.';
      return;
    }
    const pieces = [state.dashboard.team.name];
    if (state.dashboard.group) pieces.push(state.dashboard.group.name);
    if (state.dashboard.stale) pieces.push('saved snapshot');
    elements.summary.textContent = pieces.join(' - ');
  }

  function renderMetrics() {
    if (!state.dashboard) {
      elements.metrics.replaceChildren(metricTerm('Status'), metricValue(state.status === 'loading' ? 'Loading' : 'Unavailable'));
      return;
    }
    const metrics = state.dashboard.metrics;
    elements.metrics.replaceChildren(
      metricTerm('Points'), metricValue(metrics.points),
      metricTerm('Goals for'), metricValue(metrics.goalsFor),
      metricTerm('Goals against'), metricValue(metrics.goalsAgainst),
      metricTerm('Matches'), metricValue(metrics.matches)
    );
  }

  function renderMatches() {
    if (!state.dashboard || state.dashboard.games.length === 0) {
      const item = document.createElement('li');
      item.className = 'fan-match fan-match--empty';
      item.textContent = state.dashboard?.partial?.gamesFailed
        ? 'Matches are unavailable. Saved team summary remains visible.'
        : 'No matches are linked to this team yet.';
      elements.matches.replaceChildren(item);
      return;
    }
    elements.matches.replaceChildren(...state.dashboard.games.map((game) => {
      const item = document.createElement('li');
      item.className = 'fan-match';
      markInteractiveCard(item, 'fan-match');
      const date = document.createElement('time');
      date.className = 'fan-match__date';
      if (game.localDate) date.dateTime = game.localDate;
      date.textContent = game.localDate ?? 'Date TBC';
      const score = document.createElement('span');
      score.className = 'fan-match__score';
      score.textContent = formatScore(game);
      item.append(date, score);
      return item;
    }));
  }

  function renderStatus() {
    if (state.status === 'loading') {
      elements.status.textContent = 'Loading teams, matches, and groups.';
      return;
    }
    if (hasCachedData && state.dashboard) {
      elements.status.textContent = 'Fan dashboard ready from cached data.';
      return;
    }
    if (state.snapshotUsed || state.dashboard?.stale) {
      elements.status.textContent = 'Showing saved favorite snapshot because live dashboard data is unavailable.';
      return;
    }
    const partial = state.dashboard?.partial;
    if (partial?.gamesFailed || partial?.groupsFailed) {
      elements.status.textContent = 'Dashboard loaded with partial live data.';
      return;
    }
    elements.status.textContent = state.dashboard ? 'Fan dashboard ready.' : 'Fan dashboard unavailable.';
  }

  function applyTheme() {
    const theme = createFanTheme(state.dashboard?.team);
    if (!theme) {
      elements.root.removeAttribute('data-fan-themed');
      elements.root.style.removeProperty('--fan-primary');
      elements.root.style.removeProperty('--fan-accent');
      elements.root.style.removeProperty('--fan-contrast');
      return;
    }
    elements.root.setAttribute('data-fan-themed', 'true');
    elements.root.style.setProperty('--fan-primary', theme.primary);
    elements.root.style.setProperty('--fan-accent', theme.accent);
    elements.root.style.setProperty('--fan-contrast', theme.contrast);
  }
  function render() {
    applyTheme();
    renderSelector();
    renderStatus();
    renderSummary();
    renderMetrics();
    renderMatches();
  }

  elements.selector.addEventListener('change', () => {
    const teamId = elements.selector.value;
    writeFavoriteTeamId(teamId, storage);
    state = reduceFanDashboardState(state, { type: 'FAVORITE_SELECTED', teamId, games: lastGames, groups: lastGroups });
    writeFanSnapshot(state.dashboard, storage);
    render();
  announceViewRendered(document, { route: 'fan-dashboard', reason: 'favorite-team' });
  });

  async function load(isCurrent) {
    state = reduceFanDashboardState(state, { type: 'LOAD_STARTED' });
    render();

    const [teams, games, groups] = await Promise.all([
      loadable.fetchOrFallback('teams'),
      loadable.fetchOrFallback('games'),
      loadable.fetchOrFallback('groups')
    ]);
    if (!isCurrent()) return false;

    lastGames = Object.freeze(games.data);
    lastGroups = Object.freeze(groups.data);
    hasCachedData = teams.stale || games.stale || groups.stale;

    if (teams.failed) {
      const snapshot = readFanSnapshot(state.favoriteTeamId, storage);
      state = reduceFanDashboardState(state, { type: 'SNAPSHOT_LOADED', dashboard: snapshot });
      render();
      return !snapshot;
    }

    state = reduceFanDashboardState(state, {
      type: 'DATA_LOADED',
      teams: teams.data,
      games: games.data,
      groups: groups.data,
      teamsFailed: teams.failed,
      gamesFailed: games.failed,
      groupsFailed: groups.failed
    });
    if (state.favoriteTeamId) writeFavoriteTeamId(state.favoriteTeamId, storage);
    writeFanSnapshot(state.dashboard, storage);
    render();
    announceViewRendered(document, { route: 'fan-dashboard' });
    return false;
  }

  function ensureLoaded() {
    return loadable.ensureLoaded(load);
  }

  function reset() {
    loadable.reset();
    state = reduceFanDashboardState(state, { type: 'RESET' });
    lastGames = Object.freeze([]);
    lastGroups = Object.freeze([]);
    hasCachedData = false;
    render();
  }

  render();
  return Object.freeze({ ensureLoaded, reset });
}
