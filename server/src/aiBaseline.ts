import type { AiPlayerInput, AiTeamAssignment, Position } from './types.js';

// Mirrors the frontend algorithm in src/lib/balance.ts (buildTeams + assign). The frontend package
// can't be imported here (separate rootDir, and the input is AiPlayerInput, not Player), so the
// logic is duplicated and pinned by the aiBaseline fixture test.

const POSITION_ORDER: Position[] = ['TOP', 'JG', 'MID', 'AD', 'SUP'];
const PATTERN = ['B', 'R', 'R', 'B', 'B', 'R', 'R', 'B', 'B', 'R'] as const;

export const FORM_WEIGHT = 2;
export const OFF_ROLE_PENALTY = 150;
export const BASELINE_TOLERANCE = 1.25;
export const ABSOLUTE_TOLERANCE = 100;

export interface TeamAssignments {
  blue: AiTeamAssignment[];
  red: AiTeamAssignment[];
}

/** Give each player their preferred/main position where possible, fill the rest by leftover MMR. */
function assign(players: AiPlayerInput[]): AiTeamAssignment[] {
  const res: Partial<Record<Position, AiPlayerInput>> = {};
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const used = new Set<AiPlayerInput>();

  for (const p of sorted) {
    const want = p.pref ?? p.mainPos;
    if (POSITION_ORDER.includes(want) && !res[want]) {
      res[want] = p;
      used.add(p);
    }
  }
  const remainP = sorted.filter((p) => !used.has(p));
  const remainPos = POSITION_ORDER.filter((o) => !res[o]);
  remainP.forEach((p, i) => {
    res[remainPos[i]] = p;
  });

  return POSITION_ORDER.map((pos) => ({ puuid: res[pos]!.puuid, pos }));
}

/** Snake-draft the 10 players into two pools by score, then assign positions. Deterministic (no jitter). */
export function buildBaselineAssignments(players: AiPlayerInput[]): TeamAssignments {
  const arr = [...players].sort((a, b) => b.score - a.score);
  const blueP: AiPlayerInput[] = [];
  const redP: AiPlayerInput[] = [];
  arr.forEach((p, i) => (PATTERN[i] === 'B' ? blueP : redP).push(p));
  return { blue: assign(blueP), red: assign(redP) };
}

function teamStats(team: AiTeamAssignment[], byPuuid: Map<string, AiPlayerInput>) {
  let mmr = 0;
  let form = 0;
  let offRole = 0;
  for (const e of team) {
    const p = byPuuid.get(e.puuid)!;
    mmr += p.score;
    form += p.form.wr;
    if ((p.pref ?? p.mainPos) !== e.pos) offRole += 1;
  }
  return { mmr, form, offRole };
}

/** Objective function: lower is more balanced. MMR gap + weighted form gap + off-role count. */
export function balancePenalty(a: TeamAssignments, byPuuid: Map<string, AiPlayerInput>): number {
  const b = teamStats(a.blue, byPuuid);
  const r = teamStats(a.red, byPuuid);
  return (
    Math.abs(b.mmr - r.mmr) +
    Math.abs(b.form - r.form) * FORM_WEIGHT +
    (b.offRole + r.offRole) * OFF_ROLE_PENALTY
  );
}

/** AI result is acceptable when it's not meaningfully worse-balanced than the algorithm baseline. */
export function isBalanceAcceptable(aiPenalty: number, baselinePenalty: number): boolean {
  return aiPenalty <= Math.max(baselinePenalty * BASELINE_TOLERANCE, baselinePenalty + ABSOLUTE_TOLERANCE);
}
