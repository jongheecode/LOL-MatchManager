import type { ChampSummary, Player, Rates, TeamEntry, Teams } from '../types';
import { POSITION_ORDER, posLabel } from './positions';

/** Snake-draft the 10 players into two balanced pools by score, then assign positions. */
export function buildTeams(players: Player[], jitter: boolean): Teams {
  const arr = players.map((p) => ({
    p,
    key: p.score + (jitter ? Math.random() * 420 - 210 : 0),
  }));
  arr.sort((a, b) => b.key - a.key);

  const pattern = ['B', 'R', 'R', 'B', 'B', 'R', 'R', 'B', 'B', 'R'];
  const blueP: Player[] = [];
  const redP: Player[] = [];
  arr.forEach((x, i) => (pattern[i] === 'B' ? blueP : redP).push(x.p));

  return { blue: assign(blueP), red: assign(redP) };
}

/** Give each player their preferred/main position where possible, fill the rest by leftover MMR. */
export function assign(players: Player[]): TeamEntry[] {
  const res: Partial<Record<string, { player: Player; honored: boolean }>> = {};
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const used = new Set<Player>();

  sorted.forEach((p) => {
    const want = p.pref || p.mainPos;
    if (POSITION_ORDER.includes(want) && !res[want]) {
      res[want] = { player: p, honored: true };
      used.add(p);
    }
  });

  const remainP = sorted.filter((p) => !used.has(p));
  const remainPos = POSITION_ORDER.filter((o) => !res[o]);
  remainP.forEach((p, i) => {
    res[remainPos[i]] = { player: p, honored: false };
  });

  return POSITION_ORDER.map((pos) => ({
    pos,
    player: res[pos]!.player,
    honored: res[pos]!.honored,
  }));
}

/** puuid -> selected champion. When a player has a champ picked here, their historical win rate on that specific champion (from champPool) replaces their overall recent form in the win-rate math. */
export type ChampPicks = Record<string, ChampSummary>;

/** Champion pool for the exact slot a player is drafted into — a player's history in a *different*
 * lane isn't relevant here (that's the mismatch bug: showing a jungle main's champs under an ADC tag). */
export function champPoolFor(entry: TeamEntry): { champ: ChampSummary; games: number; winRate: number }[] {
  return entry.player.posChampPool[entry.pos] ?? [];
}

export function dangerPicksFor(entry: TeamEntry): { champ: ChampSummary; games: number; winRate: number }[] {
  return champPoolFor(entry)
    .filter((d) => d.games >= 3 && d.winRate >= 60)
    .sort((a, b) => b.winRate - a.winRate || b.games - a.games)
    .slice(0, 2);
}

export function effectiveWr(entry: TeamEntry, picks?: ChampPicks): number {
  const picked = picks?.[entry.player.puuid];
  if (!picked) return entry.player.form.wr;
  const found = champPoolFor(entry).find((c) => c.champ.name === picked.name);
  return found ? found.winRate : entry.player.form.wr;
}

/** The champion a player will play this round: their explicit pick, else their most-played champ in this exact slot. */
export function resolveChamp(entry: TeamEntry, picks?: ChampPicks): ChampSummary {
  return picks?.[entry.player.puuid] ?? champPoolFor(entry)[0]?.champ ?? { name: '알 수 없음', iconId: '' };
}

/** True when this slot has no real champion data to fall back on (no games in this exact lane) and
 * no explicit pick has been made — the game simulator shouldn't quietly guess a champion here. */
export function needsManualPick(entry: TeamEntry, picks?: ChampPicks): boolean {
  return champPoolFor(entry).length === 0 && !picks?.[entry.player.puuid];
}

const NEUTRAL_KDA = 2.5;

/** (kills+assists)/deaths from this player's real per-game average in this lane, when we have one —
 * falls back to a neutral league-average-ish 2.5 so a missing sample doesn't skew the team sum. */
function kdaRatioOf(entry: TeamEntry): number {
  const s = entry.player.avgStats;
  if (!s) return NEUTRAL_KDA;
  return (s.kills + s.assists) / Math.max(1, s.deaths);
}

const sigmoidPct = (x: number) => Math.round((1 / (1 + Math.exp(-x / 650))) * 100);

/** Logistic win-rate estimate from MMR + recent-form + real KDA gaps, clamped to a believable 20~80%
 * band. The divisor/weights are tuned for *real* Riot MMR (roughly 0~4000, unranked through apex),
 * which spans far wider than the design mock's synthetic 2380~2900 band — the original constants
 * saturated the sigmoid (and thus the old 38~62 clamp) on almost every real draft with a mixed-skill
 * friend group. KDA is a secondary signal (small weight) since win-rate and MMR already capture most
 * of it; it mainly nudges close calls using each player's actual recent kill participation. */
export function rates(teams: Teams, picks?: ChampPicks): Rates {
  const sum = (t: TeamEntry[]) => t.reduce((a, c) => a + c.player.score, 0);
  const form = (t: TeamEntry[]) => t.reduce((a, c) => a + (effectiveWr(c, picks) - 50), 0);
  const kda = (t: TeamEntry[]) => t.reduce((a, c) => a + (kdaRatioOf(c) - NEUTRAL_KDA), 0);
  const b = sum(teams.blue);
  const r = sum(teams.red);
  const bf = form(teams.blue);
  const rf = form(teams.red);
  const bk = kda(teams.blue);
  const rk = kda(teams.red);

  const scoreTerm = b - r;
  const formTerm = (bf - rf) * 2;
  const kdaTerm = (bk - rk) * 18;
  const diff = scoreTerm + formTerm + kdaTerm;
  const p = 1 / (1 + Math.exp(-diff / 650));
  const blue = Math.max(20, Math.min(80, Math.round(p * 100)));
  return {
    blue,
    red: 100 - blue,
    bScore: Math.round(b / 5),
    rScore: Math.round(r / 5),
    bForm: Math.round(bf / 5 + 50),
    rForm: Math.round(rf / 5 + 50),
    bKda: Math.round((teams.blue.reduce((a, c) => a + kdaRatioOf(c), 0) / 5) * 100) / 100,
    rKda: Math.round((teams.red.reduce((a, c) => a + kdaRatioOf(c), 0) / 5) * 100) / 100,
    breakdown: {
      scoreOnlyPct: sigmoidPct(scoreTerm),
      formOnlyPct: sigmoidPct(formTerm),
      kdaOnlyPct: sigmoidPct(kdaTerm),
    },
  };
}

export function reasonText(pos: TeamEntry['pos'], player: Player, honored: boolean, isTop: boolean): string {
  const posK = posLabel(pos);
  const parts = [honored ? `${posK} 주포지션` : `${posK} 부포지션 소화`];
  if (player.form.trend === 'up') parts.push('최근 폼 상승');
  else if (player.form.trend === 'down') parts.push('폼 하락, 밸런싱 반영');
  else if (isTop) parts.push('팀 내 최상위 MMR');
  else parts.push('안정적인 폼 유지');
  return parts.join(' · ');
}

export function topScore(entries: TeamEntry[]): number {
  return Math.max(...entries.map((c) => c.player.score));
}

export interface TeamSlotRef {
  team: 'blue' | 'red';
  idx: number;
}

/** Swap two players (same team or cross-team) and recompute whether each now sits in their preferred lane. */
export function swapPlayers(teams: Teams, src: TeamSlotRef, dst: TeamSlotRef): Teams {
  if (src.team === dst.team && src.idx === dst.idx) return teams;
  const next: Teams = {
    blue: teams.blue.map((x) => ({ ...x })),
    red: teams.red.map((x) => ({ ...x })),
  };
  const a = next[src.team][src.idx].player;
  const b = next[dst.team][dst.idx].player;
  next[src.team][src.idx].player = b;
  next[dst.team][dst.idx].player = a;
  next[src.team][src.idx].honored = (b.pref || b.mainPos) === next[src.team][src.idx].pos;
  next[dst.team][dst.idx].honored = (a.pref || a.mainPos) === next[dst.team][dst.idx].pos;
  return next;
}
