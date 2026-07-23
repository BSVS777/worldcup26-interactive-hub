import { requireElement } from './dom.js';
import { announceViewRendered, markInteractiveCard } from './components.js';
import { createI18n } from './i18n.js';
import { createInitialTourState, reduceTourState } from './tour.js';
import { createLoadableView, formatScore } from './loadable-view.js';

const DEFAULT_I18N = createI18n({ document: null, storage: null, locale: 'en' });

export function createTourView(document, api, { i18n = DEFAULT_I18N } = {}) {
  const elements = {
    list: requireElement(document, 'tour-venue-list', 'tour element'),
    detail: requireElement(document, 'tour-venue-detail', 'tour element')
  };
  let state = createInitialTourState();
  let hasCachedData = false;
  const loadable = createLoadableView(api);

  function paragraph(className, text, attrs = {}) {
    const p = document.createElement('p');
    p.className = className;
    p.textContent = text;
    for (const [name, value] of Object.entries(attrs)) p.setAttribute(name, value);
    return p;
  }

  function createVenueCard(venue) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'venue-card';
    markInteractiveCard(button, 'venue');
    button.dataset.venueId = venue.id;
    button.setAttribute('aria-pressed', 'false');

    const name = document.createElement('span');
    name.className = 'venue-card__name';
    name.textContent = i18n.formatVenueName(venue.name);

    const city = document.createElement('span');
    city.className = 'venue-card__city';
    city.textContent = venue.city ?? i18n.t('tour.cityTbc');

    const gamesLabel = document.createElement('span');
    gamesLabel.className = 'venue-card__games';
    gamesLabel.textContent = venue.gamesError
      ? i18n.t('tour.matchesUnavailable')
      : i18n.t('tour.matches', { count: venue.games.length });

    button.append(name, city, gamesLabel);
    item.append(button);
    return item;
  }

  function renderList() {
    elements.list.replaceChildren(...state.venues.map(createVenueCard));
  }

  function renderFatalError(message) {
    elements.list.replaceChildren(paragraph('venue-detail__error', message, { role: 'alert' }));
  }

  function createDetailHeading(venue) {
    const heading = document.createElement('h3');
    heading.tabIndex = -1;
    const venueName = i18n.formatVenueName(venue.name);
    heading.textContent = hasCachedData ? i18n.t('tour.cachedHeading', { venue: venueName }) : venueName;
    return heading;
  }

  function renderDetail(venue) {
    if (!venue) {
      elements.detail.replaceChildren(paragraph('venue-detail__hint', i18n.t('tour.selectHint')));
      return null;
    }

    const heading = createDetailHeading(venue);

    if (venue.gamesError) {
      elements.detail.replaceChildren(heading, paragraph(
        'venue-detail__error',
        i18n.t('tour.venueGamesUnavailable', { venue: i18n.formatVenueName(venue.name) }),
        { role: 'alert' }
      ));
      return heading;
    }

    if (venue.games.length === 0) {
      elements.detail.replaceChildren(heading, paragraph('venue-detail__hint', i18n.t('tour.noMatches', { venue: i18n.formatVenueName(venue.name) })));
      return heading;
    }

    const list = document.createElement('ul');
    list.className = 'venue-detail__games';
    for (const game of venue.games) {
      const row = document.createElement('li');
      row.className = 'venue-detail__game';
      const date = document.createElement('span');
      date.textContent = i18n.formatDate(game.localDate);
      const score = document.createElement('span');
      score.textContent = formatScore(game, i18n.t('common.notPlayed'), i18n.formatNumber);
      row.append(date, score);
      list.append(row);
    }
    elements.detail.replaceChildren(heading, list);
    return heading;
  }

  function markActiveButton() {
    let activeButton = null;
    for (const button of elements.list.querySelectorAll('[data-venue-id]')) {
      const isActive = button.dataset.venueId === state.selectedVenueId;
      button.classList.toggle('venue-card--active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
      if (isActive) activeButton = button;
    }
    return activeButton;
  }

  function selectVenue(venueId) {
    const nextState = reduceTourState(state, { type: 'VENUE_SELECTED', venueId });
    if (nextState === state) return;
    state = nextState;
    const activeButton = markActiveButton();
    const detailHeading = renderDetail(state.venues.find((venue) => venue.id === state.selectedVenueId) ?? null);
    detailHeading?.focus?.({ preventScroll: true });
    activeButton?.scrollIntoView({ behavior: 'smooth' });
  }

  elements.list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-venue-id]');
    if (button) selectVenue(button.dataset.venueId);
  });

  async function load(isCurrent) {
    state = reduceTourState(state, { type: 'LOAD_STARTED' });

    const [stadiums, games] = await Promise.all([
      loadable.fetchOrFallback('stadiums'),
      loadable.fetchOrFallback('games')
    ]);

    // A newer load() or reset() started while these fetches were in flight —
    // this call is stale and must not overwrite fresher state.
    if (!isCurrent()) return false;

    hasCachedData = stadiums.stale || games.stale;
    state = reduceTourState(state, {
      type: 'DATA_LOADED',
      stadiums: stadiums.data,
      games: games.data,
      stadiumsFailed: stadiums.failed,
      gamesFailed: games.failed
    });

    if (state.stadiumsFailed) {
      renderFatalError(i18n.t('tour.loadError'));
    } else {
      renderList();
    }
    renderDetail(null);
    announceViewRendered(document, { route: 'tour' });
    return state.stadiumsFailed; // fatal failure: allow a future ensureLoaded() to retry
  }

  function ensureLoaded() {
    return loadable.ensureLoaded(load);
  }

  function reset() {
    loadable.reset();
    state = createInitialTourState();
    hasCachedData = false;
  }

  function renderLocale() {
    elements.list.setAttribute('aria-label', i18n.t('tour.venuesLabel'));
    if (state.stadiumsFailed) renderFatalError(i18n.t('tour.loadError'));
    else renderList();
    renderDetail(state.venues.find((venue) => venue.id === state.selectedVenueId) ?? null);
    markActiveButton();
  }

  return Object.freeze({ ensureLoaded, renderLocale, reset });
}
