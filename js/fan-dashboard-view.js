import { requireElement } from './dom.js';
import { announceViewRendered, markInteractiveCard } from './components.js';
import { createI18n } from './i18n.js';
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

const DEFAULT_I18N = createI18n({ document: null, storage: null, locale: 'en' });

export function createFanDashboardView(document, api, {
  storage = globalThis.localStorage,
  i18n = DEFAULT_I18N
} = {}) {
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
      option.textContent = i18n.formatTeamName(team.name);
      option.selected = team.id === state.favoriteTeamId;
      return option;
    });
    elements.selector.replaceChildren(...options);
    elements.selector.disabled = state.teams.length === 0;
  }

  function renderSummary() {
    if (!state.dashboard) {
      elements.summary.textContent = state.status === 'loading'
        ? i18n.t('fan.loadingSummary')
        : i18n.t('fan.selectSummary');
      return;
    }
    const pieces = [i18n.formatTeamName(state.dashboard.team.name)];
    if (state.dashboard.group) pieces.push(i18n.formatGroupName(state.dashboard.group.name));
    if (state.dashboard.stale) pieces.push(i18n.t('fan.savedSnapshot'));
    elements.summary.textContent = pieces.join(' - ');
  }

  function renderMetrics() {
    if (!state.dashboard) {
      elements.metrics.replaceChildren(
        metricTerm(i18n.t('fan.status')),
        metricValue(i18n.t(state.status === 'loading' ? 'fan.loading' : 'fan.unavailable'))
      );
      return;
    }
    const metrics = state.dashboard.metrics;
    elements.metrics.replaceChildren(
      metricTerm(i18n.t('fan.points')), metricValue(i18n.formatNumber(metrics.points)),
      metricTerm(i18n.t('fan.goalsFor')), metricValue(i18n.formatNumber(metrics.goalsFor)),
      metricTerm(i18n.t('fan.goalsAgainst')), metricValue(i18n.formatNumber(metrics.goalsAgainst)),
      metricTerm(i18n.t('fan.matches')), metricValue(i18n.formatNumber(metrics.matches))
    );
  }

  function renderMatches() {
    if (!state.dashboard || state.dashboard.games.length === 0) {
      const item = document.createElement('li');
      item.className = 'fan-match fan-match--empty';
      item.textContent = state.dashboard?.partial?.gamesFailed
        ? i18n.t('fan.matchesUnavailable')
        : i18n.t('fan.noMatches');
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
      date.textContent = i18n.formatDate(game.localDate);
      const score = document.createElement('span');
      score.className = 'fan-match__score';
      score.textContent = formatScore(game, i18n.t('common.notPlayed'), i18n.formatNumber);
      item.append(date, score);
      return item;
    }));
  }

  function renderStatus() {
    if (state.status === 'loading') {
      elements.status.textContent = i18n.t('fan.loadingAll');
      return;
    }
    if (hasCachedData && state.dashboard) {
      elements.status.textContent = i18n.t('fan.readyCached');
      return;
    }
    if (state.snapshotUsed || state.dashboard?.stale) {
      elements.status.textContent = i18n.t('fan.snapshotStatus');
      return;
    }
    const partial = state.dashboard?.partial;
    if (partial?.gamesFailed || partial?.groupsFailed) {
      elements.status.textContent = i18n.t('fan.partial');
      return;
    }
    elements.status.textContent = i18n.t(state.dashboard ? 'fan.available' : 'fan.notAvailable');
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
    elements.matches.setAttribute('aria-label', i18n.t('fan.matchesLabel'));
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
  return Object.freeze({ ensureLoaded, renderLocale: render, reset });
}
