import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeGame,
  normalizeGroup,
  normalizePayload,
  normalizeStadium,
  normalizeTeam
} from '../js/normalizers.js';

test('normalizes the verified API fields into stable application models', () => {
  assert.deepEqual(normalizeStadium({ id: 7, name_en: 'Central Stadium', city_en: 'Test City', capacity: 50000 }), {
    id: '7', name: 'Central Stadium', city: 'Test City', capacity: 50000
  });
  assert.deepEqual(normalizeTeam({ id: 12, name_en: 'Canada', groups: 'B', flag: '/flags/canada.svg' }), {
    id: '12', name: 'Canada', groupId: 'B', flagUrl: '/flags/canada.svg'
  });
  assert.deepEqual(normalizeGame({
    id: 3,
    stadium_id: 7,
    home_team_id: 12,
    away_team_id: 13,
    home_score: 2,
    away_score: 1,
    local_date: '2026-06-12T18:00:00Z',
    status: 'completed'
  }), {
    id: '3', stadiumId: '7', homeTeamId: '12', awayTeamId: '13',
    homeScore: 2, awayScore: 1, localDate: '2026-06-12T18:00:00Z', played: true
  });
  assert.deepEqual(normalizeGroup({ id: 'B', name: 'Group B', teams: [{ team_id: 12, points: 4, gf: 3, ga: 1 }] }), {
    id: 'B', name: 'Group B', teams: [{ teamId: '12', points: 4, goalsFor: 3, goalsAgainst: 1 }]
  });
});

test('normalizes only the endpoint root and rejects malformed successful payloads', () => {
  assert.deepEqual(normalizePayload('teams', { teams: [{ id: 1, name_en: 'Mexico', groups: 'A' }] }), [
    { id: '1', name: 'Mexico', groupId: 'A', flagUrl: null }
  ]);
  assert.throws(() => normalizePayload('games', { data: [] }), /games array/);
  assert.throws(() => normalizeTeam({ name_en: 'Missing id' }), /team id/);
});

test('uses the API finished flag instead of zero placeholder scores to detect played games', () => {
  assert.equal(normalizeGame({
    id: 1, home_score: 0, away_score: 0, finished: 'FALSE', time_elapsed: 'notstarted'
  }).played, false);
  assert.equal(normalizeGame({
    id: 2, home_score: 0, away_score: 0, finished: 'TRUE', time_elapsed: 'finished'
  }).played, true);
});
