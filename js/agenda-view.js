import { requireElement } from './dom.js';
import { announceViewRendered, markInteractiveCard, markPrimaryControl } from './components.js';
import { createInitialAgendaState, reduceAgendaState } from './agenda.js';
import { createI18n } from './i18n.js';
import { createLoadableView, formatScore } from './loadable-view.js';

const SKELETON_COLUMN_COUNT = 2;
const DEFAULT_I18N = createI18n({ document: null, storage: null, locale: 'en' });

export function createAgendaView(document, api, { i18n = DEFAULT_I18N } = {}) {
  const elements = {
    dateLabel: requireElement(document, 'agenda-date-label', 'agenda element'),
    prevButton: requireElement(document, 'agenda-prev', 'agenda element'),
    nextButton: requireElement(document, 'agenda-next', 'agenda element'),
    columns: requireElement(document, 'agenda-columns', 'agenda element')
  };
  let state = createInitialAgendaState();
  let hasCachedData = false;
  const loadable = createLoadableView(api);

  function createSkeletonColumn() {
    const column = document.createElement('div');
    column.className = 'agenda-column agenda-skeleton';
    column.setAttribute('aria-hidden', 'true');
    return column;
  }

  function createGameColumn(game) {
    const column = document.createElement('div');
    column.className = 'agenda-column';
    markInteractiveCard(column, 'match');

    const teams = document.createElement('p');
    teams.className = 'agenda-column__teams';
    teams.textContent = `${game.homeTeamName == null ? i18n.t('common.teamUnavailable') : i18n.formatTeamName(game.homeTeamName)} ${i18n.t('common.vs')} ${game.awayTeamName == null ? i18n.t('common.teamUnavailable') : i18n.formatTeamName(game.awayTeamName)}`;

    const score = document.createElement('p');
    score.className = 'agenda-column__score';
    score.textContent = formatScore(game, i18n.t('common.notPlayed'), i18n.formatNumber);

    column.append(teams, score);
    return column;
  }

  function renderColumns() {
    if (state.dates.length === 0) {
      elements.columns.replaceChildren(...Array.from({ length: SKELETON_COLUMN_COUNT }, createSkeletonColumn));
      return;
    }
    elements.columns.replaceChildren(...state.dates[state.currentIndex].games.map(createGameColumn));
  }

  function renderDateLabel() {
    if (state.dates.length > 0) {
      const date = state.dates[state.currentIndex].date;
      const time = document.createElement('time');
      time.dateTime = date;
      const formattedDate = i18n.formatDate(date);
      time.textContent = hasCachedData ? i18n.t('agenda.cachedDate', { date: formattedDate }) : formattedDate;
      elements.dateLabel.replaceChildren(time);
      return;
    }
    if (state.status === 'loading') {
      elements.dateLabel.textContent = i18n.t('agenda.loading');
    } else {
      elements.dateLabel.textContent = state.gamesFailed
        ? i18n.t('agenda.unavailable')
        : i18n.t('agenda.empty');
    }
  }

  function renderControls() {
    const hasDates = state.dates.length > 0;
    elements.prevButton.disabled = !hasDates || state.currentIndex === 0;
    elements.nextButton.disabled = !hasDates || state.currentIndex === state.dates.length - 1;
  }

  function render() {
    elements.prevButton.textContent = i18n.t('agenda.previous');
    elements.prevButton.setAttribute('aria-label', i18n.t('agenda.previousLabel'));
    elements.nextButton.textContent = i18n.t('agenda.next');
    elements.nextButton.setAttribute('aria-label', i18n.t('agenda.nextLabel'));
    renderDateLabel();
    renderColumns();
    renderControls();
  }

  // Navigation is a synchronous, local state transition (no per-date network
  // call), so unlike load() below there is no in-flight async work to race —
  // each click applies the reducer against the current `state` and renders
  // immediately, which is inherently safe against rapid clicks.
  function goToDate(action) {
    const nextState = reduceAgendaState(state, action);
    if (nextState === state) return;
    state = nextState;
    render();
  }

  elements.prevButton.addEventListener('click', () => goToDate({ type: 'DATE_PREV' }));
  elements.nextButton.addEventListener('click', () => goToDate({ type: 'DATE_NEXT' }));
  markPrimaryControl(elements.prevButton);
  markPrimaryControl(elements.nextButton);

  async function load(isCurrent) {
    state = reduceAgendaState(state, { type: 'LOAD_STARTED' });
    render(); // surface the loading label while the fetches are in flight

    const [games, teams] = await Promise.all([
      loadable.fetchOrFallback('games'),
      loadable.fetchOrFallback('teams')
    ]);

    // A newer load() or reset() started while these fetches were in flight —
    // this call is stale and must not overwrite fresher state.
    if (!isCurrent()) return false;

    hasCachedData = games.stale || teams.stale;
    state = reduceAgendaState(state, {
      type: 'DATA_LOADED',
      games: games.data,
      teams: teams.data,
      gamesFailed: games.failed,
      teamsFailed: teams.failed
    });

    render();
    announceViewRendered(document, { route: 'agenda' });
    return state.gamesFailed; // fatal failure: allow a future ensureLoaded() to retry
  }

  function ensureLoaded() {
    return loadable.ensureLoaded(load);
  }

  function reset() {
    loadable.reset();
    state = createInitialAgendaState();
    hasCachedData = false;
  }

  render();

  return Object.freeze({ ensureLoaded, renderLocale: render, reset });
}
