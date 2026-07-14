function normalizeLocalDate(rawDate) {
  return rawDate ? String(rawDate).slice(0, 10) : null;
}

function buildTeamNameLookup(teams) {
  const lookup = new Map();
  for (const team of teams) lookup.set(team.id, team.name);
  return lookup;
}

function crossReferenceGame(game, teamNames, teamsFailed) {
  return Object.freeze({
    id: game.id,
    localDate: normalizeLocalDate(game.localDate),
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    homeTeamName: teamsFailed ? null : (teamNames.get(game.homeTeamId) ?? 'Unknown team'),
    awayTeamName: teamsFailed ? null : (teamNames.get(game.awayTeamId) ?? 'Unknown team'),
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    played: game.played
  });
}

function groupByDate(games) {
  const grouped = new Map();
  for (const game of games) {
    const date = normalizeLocalDate(game.localDate);
    if (!date) continue;
    const list = grouped.get(date) ?? [];
    list.push(game);
    grouped.set(date, list);
  }
  return grouped;
}

const MIN_SIMULTANEOUS_GAMES = 2;

function buildDates(games, teams, gamesFailed, teamsFailed) {
  if (gamesFailed) return Object.freeze([]);
  const teamNames = buildTeamNameLookup(teams);
  const grouped = groupByDate(games);
  return Object.freeze(
    [...grouped.entries()]
      .filter(([, list]) => list.length >= MIN_SIMULTANEOUS_GAMES)
      .sort(([dateA], [dateB]) => (dateA < dateB ? -1 : dateA > dateB ? 1 : 0))
      .map(([date, list]) => Object.freeze({
        date,
        games: Object.freeze(list.map((game) => crossReferenceGame(game, teamNames, teamsFailed)))
      }))
  );
}

export function createInitialAgendaState() {
  return Object.freeze({
    status: 'idle',
    dates: Object.freeze([]),
    currentIndex: 0,
    gamesFailed: false,
    teamsFailed: false
  });
}

export function reduceAgendaState(state, action) {
  switch (action?.type) {
    case 'LOAD_STARTED':
      return Object.freeze({ ...state, status: 'loading' });
    case 'DATA_LOADED':
      return Object.freeze({
        ...state,
        status: 'loaded',
        dates: buildDates(action.games ?? [], action.teams ?? [], Boolean(action.gamesFailed), Boolean(action.teamsFailed)),
        currentIndex: 0,
        gamesFailed: Boolean(action.gamesFailed),
        teamsFailed: Boolean(action.teamsFailed)
      });
    case 'DATE_NEXT':
      return state.currentIndex >= state.dates.length - 1
        ? state
        : Object.freeze({ ...state, currentIndex: state.currentIndex + 1 });
    case 'DATE_PREV':
      return state.currentIndex <= 0
        ? state
        : Object.freeze({ ...state, currentIndex: state.currentIndex - 1 });
    default:
      return state;
  }
}
