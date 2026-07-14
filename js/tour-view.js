import { createInitialTourState, reduceTourState } from './tour.js';

function requireElement(document, id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing tour element: ${id}`);
  return element;
}

export function createTourView(document, api) {
  const elements = {
    list: requireElement(document, 'tour-venue-list'),
    detail: requireElement(document, 'tour-venue-detail')
  };
  let state = createInitialTourState();
  let loadPromise = null;

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
    const error = document.createElement('p');
    error.className = 'venue-detail__error';
    error.setAttribute('role', 'alert');
    error.textContent = message;
    elements.list.replaceChildren(error);
  }

  function renderDetail(venue) {
    if (!venue) {
      const hint = document.createElement('p');
      hint.className = 'venue-detail__hint';
      hint.textContent = 'Select a venue to see its matches.';
      elements.detail.replaceChildren(hint);
      return;
    }

    if (venue.gamesError) {
      const error = document.createElement('p');
      error.className = 'venue-detail__error';
      error.setAttribute('role', 'alert');
      error.textContent = `Match data for ${venue.name} is unavailable right now. Try another venue or refresh later.`;
      elements.detail.replaceChildren(error);
      return;
    }

    const heading = document.createElement('h3');
    heading.textContent = venue.name;

    if (venue.games.length === 0) {
      const hint = document.createElement('p');
      hint.className = 'venue-detail__hint';
      hint.textContent = `No matches are scheduled for ${venue.name} yet.`;
      elements.detail.replaceChildren(heading, hint);
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
      score.textContent = game.played && game.homeScore !== null && game.awayScore !== null
        ? `${game.homeScore} – ${game.awayScore}`
        : 'Not played yet';
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
    state = reduceTourState(state, { type: 'VENUE_SELECTED', venueId });
    const activeButton = markActiveButton();
    renderDetail(state.venues.find((venue) => venue.id === state.selectedVenueId) ?? null);
    activeButton?.scrollIntoView({ behavior: 'smooth' });
  }

  elements.list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-venue-id]');
    if (button) selectVenue(button.dataset.venueId);
  });

  async function load() {
    state = reduceTourState(state, { type: 'LOAD_STARTED' });

    let stadiums = [];
    let stadiumsFailed = false;
    try {
      ({ data: stadiums } = await api.apiRequest('stadiums'));
    } catch {
      stadiumsFailed = true;
    }

    let games = [];
    let gamesFailed = false;
    try {
      ({ data: games } = await api.apiRequest('games'));
    } catch {
      gamesFailed = true;
    }

    state = reduceTourState(state, { type: 'DATA_LOADED', stadiums, games, gamesFailed });

    if (stadiumsFailed) {
      renderFatalError('Venues could not be loaded. Try again later.');
    } else {
      renderList();
    }
    renderDetail(null);
  }

  function ensureLoaded() {
    if (!loadPromise) loadPromise = load();
    return loadPromise;
  }

  function reset() {
    loadPromise = null;
    state = createInitialTourState();
  }

  return Object.freeze({ ensureLoaded, reset });
}
