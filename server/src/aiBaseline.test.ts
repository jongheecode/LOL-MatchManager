import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBaselineAssignments, balancePenalty, isBalanceAcceptable } from './aiBaseline.js';
import type { AiPlayerInput, Position } from './types.js';

const POS: Position[] = ['TOP', 'JG', 'MID', 'AD', 'SUP'];

function mkPlayers(scores: number[], prefs?: (Position | null)[]): AiPlayerInput[] {
  return scores.map((score, i) => ({
    puuid: `p${i}`,
    score,
    mainPos: POS[i % 5],
    pref: prefs ? prefs[i] : null,
    form: { wr: 50, trend: 'flat' },
    mainRoleKda: 2.5,
    lanes: {},
  }));
}

test('buildBaselineAssignments: snake split by score + 5 unique positions per team', () => {
  // scores desc-sorted are indices 0..9; pattern B,R,R,B,B,R,R,B,B,R
  const players = mkPlayers([1000, 900, 800, 700, 600, 500, 400, 300, 200, 100]);
  const { blue, red } = buildBaselineAssignments(players);

  assert.equal(blue.length, 5);
  assert.equal(red.length, 5);
  assert.equal(new Set(blue.map((a) => a.pos)).size, 5);
  assert.equal(new Set(red.map((a) => a.pos)).size, 5);

  const bluePuuids = new Set(blue.map((a) => a.puuid));
  // pattern indices B: 0,3,4,7,8 → scores 1000,700,600,300,200 → puuids p0,p3,p4,p7,p8
  assert.deepEqual(bluePuuids, new Set(['p0', 'p3', 'p4', 'p7', 'p8']));
  const all = new Set([...blue, ...red].map((a) => a.puuid));
  assert.equal(all.size, 10);
});

test('buildBaselineAssignments: honors pref where each snake team covers all 5 lanes', () => {
  // Strictly descending scores → sort == input order. Snake blue = idx 0,3,4,7,8; red = 1,2,5,6,9.
  // Prefs arranged so each team's 5 members cover TOP..SUP → every player fully honored.
  const scores = [100, 99, 98, 97, 96, 95, 94, 93, 92, 91];
  const prefs: Position[] = ['TOP', 'TOP', 'JG', 'JG', 'MID', 'MID', 'AD', 'AD', 'SUP', 'SUP'];
  const { blue, red } = buildBaselineAssignments(mkPlayers(scores, prefs));
  assert.deepEqual(blue, [
    { puuid: 'p0', pos: 'TOP' },
    { puuid: 'p3', pos: 'JG' },
    { puuid: 'p4', pos: 'MID' },
    { puuid: 'p7', pos: 'AD' },
    { puuid: 'p8', pos: 'SUP' },
  ]);
  assert.deepEqual(red, [
    { puuid: 'p1', pos: 'TOP' },
    { puuid: 'p2', pos: 'JG' },
    { puuid: 'p5', pos: 'MID' },
    { puuid: 'p6', pos: 'AD' },
    { puuid: 'p9', pos: 'SUP' },
  ]);
});

test('balancePenalty: mirror-balanced honored teams → exactly 0', () => {
  const players = mkPlayers([500, 500, 500, 500, 500, 500, 500, 500, 500, 500]);
  const byPuuid = new Map(players.map((p) => [p.puuid, p]));
  // p0..p4 mainPos TOP..SUP → blue; p5..p9 mainPos TOP..SUP → red; all honored, equal mmr/form
  const blue = players.slice(0, 5).map((p, i) => ({ puuid: p.puuid, pos: POS[i] }));
  const red = players.slice(5).map((p, i) => ({ puuid: p.puuid, pos: POS[i] }));
  assert.equal(balancePenalty({ blue, red }, byPuuid), 0);
});

test('balancePenalty: MMR imbalance is penalized', () => {
  const players = mkPlayers([900, 900, 900, 900, 900, 100, 100, 100, 100, 100]);
  const byPuuid = new Map(players.map((p) => [p.puuid, p]));
  const blue = players.slice(0, 5).map((p, i) => ({ puuid: p.puuid, pos: POS[i] }));
  const red = players.slice(5).map((p, i) => ({ puuid: p.puuid, pos: POS[i] }));
  // |4500 - 500| MMR gap dominates
  assert.equal(balancePenalty({ blue, red }, byPuuid), 4000);
});

test('isBalanceAcceptable: tolerance = max(base*1.25, base+100)', () => {
  // base 0 → threshold 100
  assert.equal(isBalanceAcceptable(100, 0), true);
  assert.equal(isBalanceAcceptable(101, 0), false);
  // base 1000 → threshold max(1250, 1100) = 1250
  assert.equal(isBalanceAcceptable(1250, 1000), true);
  assert.equal(isBalanceAcceptable(1251, 1000), false);
});
