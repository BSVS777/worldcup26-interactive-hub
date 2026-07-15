const BATCH_SIZE = 10;

function normalizeLocalDate(rawDate) {
  return rawDate ? String(rawDate).slice(0, 10) : null;
}

function gameSortKey(game) {
  return normalizeLocalDate(game.localDate) ?? '9999-99-99';
}

function uniqueSortedGames(games) {
  const byId = new Map();
  for (const game of games) {
    if (!game?.id || byId.has(game.id)) continue;
    byId.set(game.id, Object.freeze({ ...game, localDate: normalizeLocalDate(game.localDate) }));
  }
  return Object.freeze(
    [...byId.values()].sort((a, b) => {
      const dateCompare = gameSortKey(a).localeCompare(gameSortKey(b));
      return dateCompare !== 0 ? dateCompare : String(a.id).localeCompare(String(b.id));
    })
  );
}

export function createInitialTimelineState() {
  return Object.freeze({
    status: 'idle',
    games: Object.freeze([]),
    visibleCount: 0,
    gamesFailed: false,
    retrying: false,
    retryAttempt: 0,
    retrySecondsRemaining: 0,
    announcement: ''
  });
}

export function visibleTimelineGames(state) {
  return state.games.slice(0, state.visibleCount);
}

export function hasMoreTimelineGames(state) {
  return state.visibleCount < state.games.length;
}

export function reduceTimelineState(state, action) {
  switch (action?.type) {
    case 'LOAD_STARTED':
      return Object.freeze({
        ...state,
        status: 'loading',
        gamesFailed: false,
        retrying: Boolean(action.retrying),
        retryAttempt: 0,
        retrySecondsRemaining: 0,
        announcement: action.retrying ? 'Retrying match timeline.' : 'Loading match timeline.'
      });
    case 'RETRY_TICK':
      return Object.freeze({
        ...state,
        retrying: true,
        retryAttempt: Number(action.attempt) || state.retryAttempt,
        retrySecondsRemaining: Math.max(0, Math.ceil((Number(action.delayMs) || 0) / 1000)),
        announcement: `Retry ${Number(action.attempt) || state.retryAttempt} scheduled.`
      });
    case 'RETRY_COUNTDOWN':
      return Object.freeze({
        ...state,
        retrySecondsRemaining: Math.max(0, Number(action.secondsRemaining) || 0),
        announcement: state.retrying ? `Retrying in ${Math.max(0, Number(action.secondsRemaining) || 0)} seconds.` : state.announcement
      });
    case 'DATA_LOADED': {
      const games = uniqueSortedGames(action.games ?? []);
      const visibleCount = Math.min(BATCH_SIZE, games.length);
      return Object.freeze({
        ...state,
        status: 'loaded',
        games,
        visibleCount,
        gamesFailed: false,
        retrying: false,
        retryAttempt: 0,
        retrySecondsRemaining: 0,
        announcement: games.length === 0 ? 'No matches are available yet.' : `${visibleCount} matches loaded.`
      });
    }
    case 'LOAD_FAILED':
      return Object.freeze({
        ...state,
        status: 'error',
        games: Object.freeze([]),
        visibleCount: 0,
        gamesFailed: true,
        retrying: false,
        retryAttempt: 0,
        retrySecondsRemaining: 0,
        announcement: 'Match timeline unavailable. Use retry to try again.'
      });
    case 'SHOW_NEXT': {
      if (!hasMoreTimelineGames(state)) return state;
      const previous = state.visibleCount;
      const visibleCount = Math.min(state.visibleCount + BATCH_SIZE, state.games.length);
      return Object.freeze({
        ...state,
        visibleCount,
        announcement: `${visibleCount - previous} more matches added.`
      });
    }
    case 'RESET':
      return createInitialTimelineState();
    default:
      return state;
  }
}
