function teamName(team) {
  return team?.name ?? 'Unknown team';
}

function normalizeDate(rawDate) {
  return rawDate ? String(rawDate).slice(0, 10) : null;
}

function sortByName(items) {
  return [...items].sort((a, b) => teamName(a).localeCompare(teamName(b)));
}

function gameKey(a, b) {
  return [a, b].sort().join('::');
}

function scoreForTeam(game, teamId) {
  if (!game?.played || game.homeScore === null || game.awayScore === null) return null;
  if (game.homeTeamId === teamId) return Object.freeze({ for: game.homeScore, against: game.awayScore });
  if (game.awayTeamId === teamId) return Object.freeze({ for: game.awayScore, against: game.homeScore });
  return null;
}

function indexGames(games) {
  const map = new Map();
  for (const game of games) {
    if (!game.homeTeamId || !game.awayTeamId) continue;
    map.set(gameKey(game.homeTeamId, game.awayTeamId), Object.freeze({ ...game, localDate: normalizeDate(game.localDate) }));
  }
  return map;
}

function teamsForGroup(group, teamsById, allTeams) {
  const standingTeams = group.teams
    .map((standing) => teamsById.get(standing.teamId) ?? { id: standing.teamId, name: 'Unknown team', groupId: group.id })
    .filter((team) => team.id);
  if (standingTeams.length > 0) return standingTeams;
  return allTeams.filter((team) => team.groupId === group.id);
}

function buildCell(rowTeam, columnTeam, gamesByPair, gamesFailed) {
  const diagonal = rowTeam.id === columnTeam.id;
  if (diagonal) {
    return Object.freeze({ rowTeamId: rowTeam.id, columnTeamId: columnTeam.id, diagonal: true, label: 'Same team', score: '—', scores: null, gameId: null, date: null, status: 'disabled' });
  }
  const game = gamesByPair.get(gameKey(rowTeam.id, columnTeam.id)) ?? null;
  const scores = scoreForTeam(game, rowTeam.id);
  const score = scores ? `${scores.for} - ${scores.against}` : null;
  const label = score ? `${rowTeam.name} ${score} ${columnTeam.name}` : `${rowTeam.name} vs ${columnTeam.name} pending`;
  return Object.freeze({
    rowTeamId: rowTeam.id,
    columnTeamId: columnTeam.id,
    diagonal: false,
    label,
    score: score ?? 'Pending',
    scores,
    gameId: game?.id ?? null,
    date: game?.localDate ?? null,
    status: scores ? 'played' : (gamesFailed ? 'unknown' : 'pending')
  });
}

export function createInitialMatrixState() {
  return Object.freeze({
    status: 'idle',
    matrices: Object.freeze([]),
    groupsFailed: false,
    teamsFailed: false,
    gamesFailed: false
  });
}

export function buildGroupMatrices(groups, teams, games, { groupsFailed = false, teamsFailed = false, gamesFailed = false } = {}) {
  if (groupsFailed) return Object.freeze([]);
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const gamesByPair = indexGames(games);
  return Object.freeze(groups.map((group) => {
    const groupTeams = sortByName(teamsForGroup(group, teamsById, teams));
    const rows = groupTeams.map((rowTeam) => Object.freeze({
      team: Object.freeze(rowTeam),
      cells: Object.freeze(groupTeams.map((columnTeam) => buildCell(rowTeam, columnTeam, gamesByPair, gamesFailed)))
    }));
    return Object.freeze({
      id: group.id,
      name: group.name,
      teams: Object.freeze(groupTeams.map((team) => Object.freeze(team))),
      rows: Object.freeze(rows),
      completeFourByFour: groupTeams.length === 4,
      partial: Object.freeze({ groupsFailed, teamsFailed, gamesFailed })
    });
  }));
}

export function reduceMatrixState(state, action) {
  switch (action?.type) {
    case 'LOAD_STARTED':
      return Object.freeze({ ...state, status: 'loading' });
    case 'DATA_LOADED': {
      const groupsFailed = Boolean(action.groupsFailed);
      const teamsFailed = Boolean(action.teamsFailed);
      const gamesFailed = Boolean(action.gamesFailed);
      return Object.freeze({
        status: 'loaded',
        matrices: buildGroupMatrices(action.groups ?? [], action.teams ?? [], action.games ?? [], { groupsFailed, teamsFailed, gamesFailed }),
        groupsFailed,
        teamsFailed,
        gamesFailed
      });
    }
    case 'RESET':
      return createInitialMatrixState();
    default:
      return state;
  }
}
