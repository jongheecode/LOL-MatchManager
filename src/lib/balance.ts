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

export function effectiveWr(player: Player, picks?: ChampPicks): number {
  const picked = picks?.[player.puuid];
  if (!picked) return player.form.wr;
  const entry = player.champPool.find((c) => c.champ.name === picked.name);
  return entry ? entry.winRate : player.form.wr;
}

/** The champion a player will play this round: their explicit pick, else their most-played recent champ. */
export function resolveChamp(player: Player, picks?: ChampPicks): ChampSummary {
  return picks?.[player.puuid] ?? player.champs[0] ?? { name: '알 수 없음', iconId: '' };
}

/** Logistic win-rate estimate from combined MMR + recent-form gap, clamped to a believable 38~62% band. */
export function rates(teams: Teams, picks?: ChampPicks): Rates {
  const sum = (t: TeamEntry[]) => t.reduce((a, c) => a + c.player.score, 0);
  const form = (t: TeamEntry[]) => t.reduce((a, c) => a + (effectiveWr(c.player, picks) - 50), 0);
  const b = sum(teams.blue);
  const r = sum(teams.red);
  const bf = form(teams.blue);
  const rf = form(teams.red);
  const diff = b - r + (bf - rf) * 5;
  const p = 1 / (1 + Math.exp(-diff / 470));
  const blue = Math.max(38, Math.min(62, Math.round(p * 100)));
  return {
    blue,
    red: 100 - blue,
    bScore: Math.round(b / 5),
    rScore: Math.round(r / 5),
    bForm: Math.round(bf / 5 + 50),
    rForm: Math.round(rf / 5 + 50),
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
