import { FAVORITE_TEAM_KEY, fanSnapshotKey } from './cache.js';

function normalizeDate(rawDate) {
  return rawDate ? String(rawDate).slice(0, 10) : null;
}

function teamGames(games, teamId) {
  return games
    .filter((game) => game.homeTeamId === teamId || game.awayTeamId === teamId)
    .sort((a, b) => (normalizeDate(a.localDate) ?? '9999-99-99').localeCompare(normalizeDate(b.localDate) ?? '9999-99-99'));
}

function findStanding(groups, teamId) {
  for (const group of groups) {
    const standing = group.teams.find((entry) => entry.teamId === teamId);
    if (standing) return Object.freeze({ groupId: group.id, groupName: group.name, ...standing });
  }
  return null;
}

function computeGoals(games, teamId) {
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const game of games) {
    if (!game.played || game.homeScore === null || game.awayScore === null) continue;
    if (game.homeTeamId === teamId) {
      goalsFor += game.homeScore;
      goalsAgainst += game.awayScore;
    } else if (game.awayTeamId === teamId) {
      goalsFor += game.awayScore;
      goalsAgainst += game.homeScore;
    }
  }
  return { goalsFor, goalsAgainst };
}

function buildDashboard(teams, games, groups, favoriteTeamId, sources) {
  const selectedTeam = teams.find((team) => team.id === favoriteTeamId) ?? teams[0] ?? null;
  if (!selectedTeam) return null;
  const selectedGames = teamGames(games, selectedTeam.id);
  const standing = findStanding(groups, selectedTeam.id);
  const fallbackGoals = computeGoals(selectedGames, selectedTeam.id);
  const metrics = Object.freeze({
    points: standing?.points ?? 0,
    goalsFor: standing?.goalsFor ?? fallbackGoals.goalsFor,
    goalsAgainst: standing?.goalsAgainst ?? fallbackGoals.goalsAgainst,
    matches: selectedGames.length
  });
  return Object.freeze({
    team: Object.freeze(selectedTeam),
    group: standing ? Object.freeze({ id: standing.groupId, name: standing.groupName }) : null,
    metrics,
    games: Object.freeze(selectedGames.map((game) => Object.freeze({ ...game, localDate: normalizeDate(game.localDate) }))),
    stale: Boolean(sources.snapshot),
    partial: Object.freeze({
      gamesFailed: Boolean(sources.gamesFailed),
      groupsFailed: Boolean(sources.groupsFailed),
      teamsFailed: Boolean(sources.teamsFailed)
    })
  });
}

function safeGet(storage, key) {
  try { return storage?.getItem?.(key) ?? null; } catch { return null; }
}

function safeSet(storage, key, value) {
  try { storage?.setItem?.(key, value); } catch { /* best effort */ }
}

function safeParseSnapshot(raw) {
  if (typeof raw !== 'string') return null;
  try {
    const snapshot = JSON.parse(raw);
    if (snapshot?.version !== 1 || typeof snapshot.savedAt !== 'string' || !snapshot.dashboard?.team?.id) return null;
    return snapshot.dashboard;
  } catch {
    return null;
  }
}

export function readFavoriteTeamId(storage = globalThis.localStorage) {
  const value = safeGet(storage, FAVORITE_TEAM_KEY);
  return value && value.trim() !== '' ? value : null;
}

export function writeFavoriteTeamId(teamId, storage = globalThis.localStorage) {
  if (!teamId) return;
  safeSet(storage, FAVORITE_TEAM_KEY, String(teamId));
}

export function readFanSnapshot(teamId, storage = globalThis.localStorage) {
  if (!teamId) return null;
  const snapshot = safeParseSnapshot(safeGet(storage, fanSnapshotKey(teamId)));
  return snapshot ? Object.freeze({ ...snapshot, stale: true }) : null;
}

export function writeFanSnapshot(dashboard, storage = globalThis.localStorage, now = new Date()) {
  if (!dashboard?.team?.id || dashboard.stale) return;
  safeSet(storage, fanSnapshotKey(dashboard.team.id), JSON.stringify({
    version: 1,
    savedAt: now.toISOString(),
    dashboard
  }));
}

export function createInitialFanDashboardState({ favoriteTeamId = null } = {}) {
  return Object.freeze({
    status: 'idle',
    teams: Object.freeze([]),
    favoriteTeamId,
    dashboard: null,
    teamsFailed: false,
    gamesFailed: false,
    groupsFailed: false,
    snapshotUsed: false
  });
}

export function reduceFanDashboardState(state, action) {
  switch (action?.type) {
    case 'LOAD_STARTED':
      return Object.freeze({ ...state, status: 'loading' });
    case 'DATA_LOADED': {
      const teams = Object.freeze([...(action.teams ?? [])].sort((a, b) => a.name.localeCompare(b.name)));
      const favoriteTeamId = state.favoriteTeamId && teams.some((team) => team.id === state.favoriteTeamId)
        ? state.favoriteTeamId
        : teams[0]?.id ?? state.favoriteTeamId;
      const dashboard = buildDashboard(teams, action.games ?? [], action.groups ?? [], favoriteTeamId, {
        teamsFailed: Boolean(action.teamsFailed),
        gamesFailed: Boolean(action.gamesFailed),
        groupsFailed: Boolean(action.groupsFailed),
        snapshot: false
      });
      return Object.freeze({
        ...state,
        status: 'loaded',
        teams,
        favoriteTeamId,
        dashboard,
        teamsFailed: Boolean(action.teamsFailed),
        gamesFailed: Boolean(action.gamesFailed),
        groupsFailed: Boolean(action.groupsFailed),
        snapshotUsed: false
      });
    }
    case 'SNAPSHOT_LOADED':
      return Object.freeze({
        ...state,
        status: 'loaded',
        favoriteTeamId: action.dashboard?.team?.id ?? state.favoriteTeamId,
        dashboard: action.dashboard ? Object.freeze({ ...action.dashboard, stale: true }) : null,
        snapshotUsed: Boolean(action.dashboard)
      });
    case 'FAVORITE_SELECTED': {
      const favoriteTeamId = String(action.teamId ?? '');
      if (favoriteTeamId === '' || favoriteTeamId === state.favoriteTeamId) return state;
      const dashboard = buildDashboard(state.teams, action.games ?? [], action.groups ?? [], favoriteTeamId, {
        teamsFailed: state.teamsFailed,
        gamesFailed: state.gamesFailed,
        groupsFailed: state.groupsFailed,
        snapshot: false
      });
      return Object.freeze({ ...state, favoriteTeamId, dashboard, snapshotUsed: false });
    }
    case 'RESET':
      return createInitialFanDashboardState({ favoriteTeamId: state.favoriteTeamId });
    default:
      return state;
  }
}