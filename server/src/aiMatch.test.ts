import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aiAnalyze,
  aiMatchmake,
  AiValidationError,
  validateAssignments,
  validatePicks,
  validatePlayers,
  type AiRunner,
} from './aiMatch.js';
import { GeminiError, type CallGeminiOnce } from './gemini.js';
import type { AiPlayerInput, Position } from './types.js';

const POS: Position[] = ['TOP', 'JG', 'MID', 'AD', 'SUP'];

function mkPlayers(): AiPlayerInput[] {
  return Array.from({ length: 10 }, (_, i) => ({
    puuid: `puuid-${i}-abcdefghij`,
    score: 1000 + i * 40,
    mainPos: POS[i % 5],
    pref: null,
    form: { wr: 40 + i, trend: 'flat' as const },
    mainRoleKda: 2 + i * 0.1,
    lanes: {},
  }));
}

/** A pass-through runner: no cache/concurrency, just counts daily attempts (== real fetches). */
function fakeGuard(): AiRunner & { daily: number } {
  return {
    daily: 0,
    consumeDailyAttempt() {
      this.daily += 1;
    },
    run<T>(_key: string, leader: () => Promise<T>): Promise<T> {
      return leader();
    },
  };
}

/** Records the cache keys passed to run() so tests can assert canonicalization. */
function keyRecordingGuard(): AiRunner & { keys: string[] } {
  return {
    keys: [],
    consumeDailyAttempt() {},
    run<T>(key: string, leader: () => Promise<T>): Promise<T> {
      this.keys.push(key);
      return leader();
    },
  };
}

interface Anon {
  id: string;
  mmr: number;
  mainPos: Position;
  pref: Position | null;
}

function parseAnon(user: string): Anon[] {
  const m = user.match(/\[.*\]/s);
  return JSON.parse(m![0]) as Anon[];
}

/** Replicates aiBaseline on the anonymized players so the "balanced" mock == server baseline. */
function baselineOnAnon(anon: Anon[]) {
  const PAT = ['B', 'R', 'R', 'B', 'B', 'R', 'R', 'B', 'B', 'R'];
  const arr = [...anon].sort((a, b) => b.mmr - a.mmr);
  const blueP: Anon[] = [];
  const redP: Anon[] = [];
  arr.forEach((p, i) => (PAT[i] === 'B' ? blueP : redP).push(p));
  const assign = (players: Anon[]) => {
    const res: Partial<Record<Position, Anon>> = {};
    const sorted = [...players].sort((a, b) => b.mmr - a.mmr);
    const used = new Set<Anon>();
    for (const p of sorted) {
      const want = p.pref ?? p.mainPos;
      if (POS.includes(want) && !res[want]) {
        res[want] = p;
        used.add(p);
      }
    }
    const remain = sorted.filter((p) => !used.has(p));
    const rpos = POS.filter((o) => !res[o]);
    remain.forEach((p, i) => (res[rpos[i]] = p));
    return POS.map((pos) => ({ id: res[pos]!.id, pos }));
  };
  return { blue: assign(blueP), red: assign(redP) };
}

function laneMatchups() {
  return POS.map((pos) => ({ pos, favored: 'even', note: '균형' }));
}

function balancedResponse(user: string) {
  const { blue, red } = baselineOnAnon(parseAnon(user));
  return { blue, red, blueWinRate: 50, analysis: '균형 잡힌 매치', laneMatchups: laneMatchups() };
}

/** Stack the 5 highest-MMR players onto blue — structurally valid but badly balanced. */
function stackedResponse(user: string) {
  const anon = [...parseAnon(user)].sort((a, b) => b.mmr - a.mmr);
  const mk = (xs: Anon[]) => xs.map((p, i) => ({ id: p.id, pos: POS[i] }));
  return { blue: mk(anon.slice(0, 5)), red: mk(anon.slice(5)), blueWinRate: 50, analysis: 'x', laneMatchups: laneMatchups() };
}

function mockOnce(fn: (user: string, attempt: number) => unknown): CallGeminiOnce {
  let attempt = 0;
  return (async (_s: string, user: string) => {
    const out = fn(user, attempt);
    attempt += 1;
    if (out instanceof Error) throw out;
    return out;
  }) as unknown as CallGeminiOnce;
}

test('aiMatchmake: happy path maps P0x back to puuids, one fetch', async () => {
  const players = mkPlayers();
  const guard = fakeGuard();
  const result = await aiMatchmake(players, guard, mockOnce((user) => balancedResponse(user)));
  assert.equal(result.blue.length, 5);
  assert.equal(result.red.length, 5);
  const puuids = new Set([...result.blue, ...result.red].map((a) => a.puuid));
  assert.equal(puuids.size, 10);
  for (const p of players) assert.ok(puuids.has(p.puuid));
  assert.equal(result.blueWinRate, 50);
  assert.equal(guard.daily, 1);
});

test('aiMatchmake: prompt is anonymized (P01 present, no real puuid, no tier)', async () => {
  const players = mkPlayers();
  let captured = '';
  const spy = mockOnce((user) => {
    captured = user;
    return balancedResponse(user);
  });
  await aiMatchmake(players, fakeGuard(), spy);
  assert.match(captured, /P01/);
  assert.doesNotMatch(captured, /puuid-0-abcdefghij/);
  assert.doesNotMatch(captured, /tier/i);
});

test('aiMatchmake: MMR-stacked (valid structure, bad balance) is rejected and retried', async () => {
  const guard = fakeGuard();
  await assert.rejects(aiMatchmake(mkPlayers(), guard, mockOnce((user) => stackedResponse(user))));
  assert.equal(guard.daily, 2); // both attempts spent
});

test('aiMatchmake: invalid first response then valid → resolves on 2nd fetch', async () => {
  const guard = fakeGuard();
  const result = await aiMatchmake(
    mkPlayers(),
    guard,
    mockOnce((user, attempt) => (attempt === 0 ? { blue: [], red: [], blueWinRate: 50, analysis: 'x', laneMatchups: laneMatchups() } : balancedResponse(user))),
  );
  assert.equal(result.blue.length, 5);
  assert.equal(guard.daily, 2);
});

test('aiMatchmake: out-of-range blueWinRate is rejected (not clamped)', async () => {
  const guard = fakeGuard();
  await assert.rejects(
    aiMatchmake(mkPlayers(), guard, mockOnce((user) => ({ ...balancedResponse(user), blueWinRate: 95 }))),
  );
  assert.equal(guard.daily, 2);
});

test('aiMatchmake: 429 stops immediately (no retry)', async () => {
  const guard = fakeGuard();
  await assert.rejects(
    aiMatchmake(mkPlayers(), guard, mockOnce(() => new GeminiError(429, 'rate limited'))),
    (e) => e instanceof GeminiError && e.status === 429,
  );
  assert.equal(guard.daily, 1);
});

test('aiAnalyze: returns win rate + analysis for a fixed assignment', async () => {
  const players = mkPlayers();
  const blue = players.slice(0, 5).map((p, i) => ({ puuid: p.puuid, pos: POS[i] }));
  const red = players.slice(5).map((p, i) => ({ puuid: p.puuid, pos: POS[i] }));
  const result = await aiAnalyze(
    blue,
    red,
    players,
    [],
    fakeGuard(),
    mockOnce(() => ({ blueWinRate: 57, analysis: '블루 상체 우위', laneMatchups: laneMatchups() })),
  );
  assert.equal(result.blueWinRate, 57);
  assert.equal(result.laneMatchups.length, 5);
});

test('aiMatchmake: a persistent network error retries once then exhausts at exactly 2 fetches', async () => {
  const guard = fakeGuard();
  await assert.rejects(
    aiMatchmake(mkPlayers(), guard, mockOnce(() => new GeminiError(0, 'network error'))),
    (e) => e instanceof GeminiError,
  );
  assert.equal(guard.daily, 2); // budget cap: no third call
});

test('aiMatchmake: rejects a 6:4 split', async () => {
  await assert.rejects(
    aiMatchmake(
      mkPlayers(),
      fakeGuard(),
      mockOnce((user) => {
        const r = balancedResponse(user);
        r.blue.push(r.red.pop()!); // 6 blue / 4 red
        return r;
      }),
    ),
  );
});

test('aiMatchmake: rejects duplicate ids across teams', async () => {
  await assert.rejects(
    aiMatchmake(
      mkPlayers(),
      fakeGuard(),
      mockOnce((user) => {
        const r = balancedResponse(user);
        r.red[0] = { id: r.blue[0].id, pos: r.red[0].pos }; // same id on both teams
        return r;
      }),
    ),
  );
});

test('aiMatchmake: rejects a missing laneMatchups entry', async () => {
  await assert.rejects(
    aiMatchmake(
      mkPlayers(),
      fakeGuard(),
      mockOnce((user) => {
        const r = balancedResponse(user);
        r.laneMatchups = r.laneMatchups.slice(0, 4); // only 4 lanes
        return r;
      }),
    ),
  );
});

test('aiAnalyze: cache key is order-independent for the same picks and team assignment', async () => {
  const players = mkPlayers();
  const blue = players.slice(0, 5).map((p, i) => ({ puuid: p.puuid, pos: POS[i] }));
  const red = players.slice(5).map((p, i) => ({ puuid: p.puuid, pos: POS[i] }));
  const picksA = [
    { puuid: players[0].puuid, champKey: 'Ahri' },
    { puuid: players[1].puuid, champKey: 'Zed' },
  ];
  const picksB = [picksA[1], picksA[0]]; // reversed picks + reversed team arrays
  const analyzeMock = () => mockOnce(() => ({ blueWinRate: 50, analysis: 'x', laneMatchups: laneMatchups() }));

  const g1 = keyRecordingGuard();
  const g2 = keyRecordingGuard();
  await aiAnalyze(blue, red, players, picksA, g1, analyzeMock());
  await aiAnalyze([...blue].reverse(), [...red].reverse(), players, picksB, g2, analyzeMock());
  assert.equal(g1.keys[0], g2.keys[0]);
});

test('aiMatchmake: null items in the AI response are rejected (retry), never a TypeError/500', async () => {
  const guard = fakeGuard();
  const bad = {
    blue: [null, null, null, null, null],
    red: [null, null, null, null, null],
    blueWinRate: 50,
    analysis: 'x',
    laneMatchups: laneMatchups(),
  };
  await assert.rejects(
    aiMatchmake(mkPlayers(), guard, mockOnce(() => bad)),
    (e) => e instanceof GeminiError, // classified as a validation failure, not an unhandled TypeError
  );
  assert.equal(guard.daily, 2);
});

test('aiMatchmake: unexpected extra keys in the AI response are rejected then retried', async () => {
  const guard = fakeGuard();
  const result = await aiMatchmake(
    mkPlayers(),
    guard,
    mockOnce((user, attempt) => (attempt === 0 ? { ...balancedResponse(user), sneaky: 'x' } : balancedResponse(user))),
  );
  assert.equal(result.blue.length, 5);
  assert.equal(guard.daily, 2);
});

test('aiAnalyze: the selected champion is passed into the prompt', async () => {
  const players = mkPlayers();
  const blue = players.slice(0, 5).map((p, i) => ({ puuid: p.puuid, pos: POS[i] }));
  const red = players.slice(5).map((p, i) => ({ puuid: p.puuid, pos: POS[i] }));
  let captured = '';
  await aiAnalyze(
    blue,
    red,
    players,
    [{ puuid: players[0].puuid, champKey: 'Ahri' }],
    fakeGuard(),
    mockOnce((user) => {
      captured = user;
      return { blueWinRate: 50, analysis: 'x', laneMatchups: laneMatchups() };
    }),
  );
  assert.match(captured, /selectedChampion/);
  assert.match(captured, /Ahri/);
});

test('validatePlayers: a null/non-object entry raises AiValidationError (not TypeError)', () => {
  const arr: unknown[] = mkPlayers();
  arr[0] = null;
  assert.throws(() => validatePlayers(arr), (e) => e instanceof AiValidationError);
});

test('validatePlayers: more than 3 champions in a lane is rejected', () => {
  const players = mkPlayers();
  players[0].lanes = { TOP: [1, 2, 3, 4].map(() => ({ champKey: 'Ahri', games: 1, wr: 50 })) };
  assert.throws(() => validatePlayers(players as unknown), (e) => e instanceof AiValidationError);
});

test('validatePlayers rejects wrong count and duplicate puuids', () => {
  assert.throws(() => validatePlayers(mkPlayers().slice(0, 9)));
  const dup = mkPlayers();
  dup[1].puuid = dup[0].puuid;
  assert.throws(() => validatePlayers(dup));
});

test('validateAssignments enforces 5v5, known puuids, unique positions', () => {
  const players = mkPlayers();
  const blue = players.slice(0, 5).map((p, i) => ({ puuid: p.puuid, pos: POS[i] }));
  const red = players.slice(5).map((p, i) => ({ puuid: p.puuid, pos: POS[i] }));
  assert.doesNotThrow(() => validateAssignments(blue, red, players));
  // duplicate position within a team
  const badPos = players.slice(0, 5).map((p) => ({ puuid: p.puuid, pos: 'TOP' as Position }));
  assert.throws(() => validateAssignments(badPos, red, players));
  // unknown puuid
  const unknown = [...blue];
  unknown[0] = { puuid: 'stranger', pos: 'TOP' };
  assert.throws(() => validateAssignments(unknown, red, players));
});

test('validatePicks rejects overflow, duplicates, and unknown players', () => {
  const players = mkPlayers();
  assert.deepEqual(validatePicks([], players), []);
  const tooMany = Array.from({ length: 11 }, (_, i) => ({ puuid: players[i % 10].puuid, champKey: 'Ahri' }));
  assert.throws(() => validatePicks(tooMany, players));
  assert.throws(() => validatePicks([{ puuid: 'stranger', champKey: 'Ahri' }], players));
  assert.throws(() =>
    validatePicks(
      [
        { puuid: players[0].puuid, champKey: 'Ahri' },
        { puuid: players[0].puuid, champKey: 'Zed' },
      ],
      players,
    ),
  );
});
