function crossReferenceVenues(stadiums, games, gamesFailed) {
  const gameList = gamesFailed ? [] : games;
  return stadiums.map((stadium) => Object.freeze({
    id: stadium.id,
    name: stadium.name,
    city: stadium.city,
    capacity: stadium.capacity,
    games: Object.freeze(gameList.filter((game) => game.stadiumId === stadium.id)),
    gamesError: gamesFailed
  }));
}

export function createInitialTourState() {
  return Object.freeze({
    status: 'idle',
    venues: [],
    gamesFailed: false,
    selectedVenueId: null
  });
}

export function reduceTourState(state, action) {
  switch (action?.type) {
    case 'LOAD_STARTED':
      return state.status === 'idle' ? Object.freeze({ ...state, status: 'loading' }) : state;
    case 'DATA_LOADED':
      return Object.freeze({
        ...state,
        status: 'loaded',
        venues: crossReferenceVenues(action.stadiums ?? [], action.games ?? [], Boolean(action.gamesFailed)),
        gamesFailed: Boolean(action.gamesFailed)
      });
    case 'VENUE_SELECTED':
      return state.selectedVenueId === action.venueId
        ? state
        : Object.freeze({ ...state, selectedVenueId: action.venueId });
    default:
      return state;
  }
}
