const ENDPOINT_NORMALIZERS = {
  stadiums: normalizeStadium,
  games: normalizeGame,
  teams: normalizeTeam,
  groups: normalizeGroup
};

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function requiredId(value, label) {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
    throw new TypeError(`Missing ${label}`);
  }
  return String(value);
}

function optionalId(value) {
  return value === undefined || value === null || String(value).trim() === '' ? null : String(value);
}

function optionalNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeStadium(raw) {
  return {
    id: requiredId(firstDefined(raw?.id, raw?.stadium_id), 'stadium id'),
    name: String(firstDefined(raw?.name_en, raw?.name, 'Unknown stadium')),
    city: firstDefined(raw?.city_en, raw?.city) == null ? null : String(firstDefined(raw.city_en, raw.city)),
    capacity: optionalNumber(raw?.capacity)
  };
}

export function normalizeTeam(raw) {
  return {
    id: requiredId(firstDefined(raw?.id, raw?.team_id), 'team id'),
    name: String(firstDefined(raw?.name_en, raw?.name, 'Unknown team')),
    groupId: optionalId(firstDefined(raw?.groups, raw?.group_id, raw?.group)),
    flagUrl: firstDefined(raw?.flag, raw?.flag_url) == null ? null : String(firstDefined(raw.flag, raw.flag_url))
  };
}

export function normalizeGame(raw) {
  const homeScore = optionalNumber(firstDefined(raw?.home_score, raw?.home_team_score));
  const awayScore = optionalNumber(firstDefined(raw?.away_score, raw?.away_team_score));
  const status = String(firstDefined(raw?.status, raw?.time_elapsed, '')).toLowerCase();
  const playedStatuses = new Set(['completed', 'finished', 'played', 'full-time', 'ft']);
  const hasFinishedFlag = raw?.finished !== undefined && raw?.finished !== null;
  const finishedFlag = raw?.finished === true || ['true', '1'].includes(String(raw?.finished).toLowerCase());

  return {
    id: requiredId(firstDefined(raw?.id, raw?.game_id), 'game id'),
    stadiumId: optionalId(firstDefined(raw?.stadium_id, raw?.stadium?.id)),
    homeTeamId: optionalId(firstDefined(raw?.home_team_id, raw?.home_team?.id)),
    awayTeamId: optionalId(firstDefined(raw?.away_team_id, raw?.away_team?.id)),
    homeScore,
    awayScore,
    localDate: firstDefined(raw?.local_date, raw?.date) == null ? null : String(firstDefined(raw.local_date, raw.date)),
    played: hasFinishedFlag
      ? finishedFlag
      : playedStatuses.has(status) || (status === '' && homeScore !== null && awayScore !== null)
  };
}

function normalizeStanding(raw) {
  const team = raw?.team ?? raw;
  return {
    teamId: requiredId(firstDefined(raw?.team_id, team?.id), 'group team id'),
    points: optionalNumber(firstDefined(raw?.points, raw?.pts)) ?? 0,
    goalsFor: optionalNumber(firstDefined(raw?.gf, raw?.goals_for)) ?? 0,
    goalsAgainst: optionalNumber(firstDefined(raw?.ga, raw?.goals_against)) ?? 0
  };
}

export function normalizeGroup(raw) {
  const id = requiredId(firstDefined(raw?.id, raw?.group, raw?.name), 'group id');
  const teams = Array.isArray(raw?.teams) ? raw.teams.map(normalizeStanding) : [];
  return {
    id,
    name: String(firstDefined(raw?.name, raw?.group_name, `Group ${id}`)),
    teams
  };
}

export function normalizePayload(endpoint, payload) {
  const normalize = ENDPOINT_NORMALIZERS[endpoint];
  if (!normalize) throw new TypeError(`Unknown data endpoint: ${endpoint}`);
  const rows = payload?.[endpoint];
  if (!Array.isArray(rows)) throw new TypeError(`Expected ${endpoint} array in API response`);
  return rows.map(normalize);
}
