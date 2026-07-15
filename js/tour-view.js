import { requireElement } from './dom.js';
import { createInitialTourState, reduceTourState } from './tour.js';
import { createLoadableView, formatScore } from './loadable-view.js';

export function createTourView(document, api) {
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
    button.dataset.venueId = venue.id;
    button.setAttribute('aria-pressed', 'false');

    const name = document.createElement('span');
    name.className = 'venue-card__name';
    name.textContent = venue.name;

    const city = document.createElement('span');
    city.className = 'venue-card__city';
    city.textContent = venue.city ?? 'City to be confirmed';

    const gamesLabel = document.createElement('span');
    gamesLabel.className = 'venue-card__games';
    gamesLabel.textContent = venue.gamesError
      ? 'Match data unavailable'
      : `${venue.games.length} match${venue.games.length === 1 ? '' : 'es'}`;

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

  function renderDetail(venue) {
    if (!venue) {
      elements.detail.replaceChildren(paragraph('venue-detail__hint', 'Select a venue to see its matches.'));
      return;
    }

    if (venue.gamesError) {
      elements.detail.replaceChildren(paragraph(
        'venue-detail__error',
        `Match data for ${venue.name} is unavailable right now. Try another venue or refresh later.`,
        { role: 'alert' }
      ));
      return;
    }

    const heading = document.createElement('h3');
    heading.textContent = hasCachedData ? `${venue.name} (cached data)` : venue.name;

    if (venue.games.length === 0) {
      elements.detail.replaceChildren(heading, paragraph('venue-detail__hint', `No matches are scheduled for ${venue.name} yet.`));
      return;
    }

    const list = document.createElement('ul');
    list.className = 'venue-detail__games';
    for (const game of venue.games) {
      const row = document.createElement('li');
      row.className = 'venue-detail__game';
      const date = document.createElement('span');
      date.textContent = game.localDate ?? 'Date to be confirmed';
      const score = document.createElement('span');
      score.textContent = formatScore(game);
      row.append(date, score);
      list.append(row);
    }
    elements.detail.replaceChildren(heading, list);
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
    renderDetail(state.venues.find((venue) => venue.id === state.selectedVenueId) ?? null);
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
      renderFatalError('Venues could not be loaded. Try again later.');
    } else {
      renderList();
    }
    renderDetail(null);
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

  return Object.freeze({ ensureLoaded, reset });
}
