import type { GameResult, PlayerGameStat, Position, Rates, Teams } from '../types';
import { effectiveWr, resolveChamp, type ChampPicks } from './balance';

/** Fun, made-up post-game stat ranges per lane — not real LoL data, just plausible flavor. */
const BASE: Record<Position, { k: [number, number]; d: [number, number]; a: [number, number]; cs: [number, number] }> = {
  TOP: { k: [3, 9], d: [3, 7], a: [3, 8], cs: [160, 230] },
  JG: { k: [3, 8], d: [3, 6], a: [6, 13], cs: [130, 180] },
  MID: { k: [4, 10], d: [2, 6], a: [4, 9], cs: [170, 230] },
  AD: { k: [5, 11], d: [2, 5], a: [4, 9], cs: [180, 240] },
  SUP: { k: [0, 3], d: [3, 7], a: [9, 18], cs: [15, 45] },
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function randIn([lo, hi]: [number, number]) {
  return lo + Math.random() * (hi - lo);
}

function score(s: { kills: number; deaths: number; assists: number; cs: number }) {
  return s.kills * 3 + s.assists * 1.5 - s.deaths * 1.2 + s.cs * 0.02;
}

/** A just-for-fun simulated match: winner is weighted by the computed win rate, and each player's
 * KDA leans on whether their team won plus their (pick-adjusted) recent form — not a real Riot game. */
export function simulateGame(teams: Teams, rates: Rates, picks: ChampPicks): GameResult {
  const winner: 'blue' | 'red' = Math.random() * 100 < rates.blue ? 'blue' : 'red';

  const stats: PlayerGameStat[] = [];
  (['blue', 'red'] as const).forEach((team) => {
    const isWin = team === winner;
    for (const entry of teams[team]) {
      const p = entry.player;
      const base = BASE[entry.pos];
      const wr = effectiveWr(p, picks);
      const perf = clamp(1 + (isWin ? 0.22 : -0.15) + (wr - 50) / 130 + (Math.random() * 0.34 - 0.17), 0.55, 1.6);

      const kills = Math.max(0, Math.round(randIn(base.k) * perf));
      const assists = Math.max(0, Math.round(randIn(base.a) * (0.7 + perf * 0.5)));
      const deaths = Math.max(0, Math.round(randIn(base.d) * (2 - perf)));
      const cs = Math.max(0, Math.round(randIn(base.cs) * (0.85 + perf * 0.18)));

      stats.push({
        puuid: p.puuid,
        pos: entry.pos,
        team,
        champ: resolveChamp(p, picks),
        kills,
        deaths,
        assists,
        cs,
        win: isWin,
      });
    }
  });

  const winnerStats = stats.filter((s) => s.win);
  const mvp = winnerStats.reduce((best, s) => (score(s) > score(best) ? s : best), winnerStats[0]);

  return { winner, stats, mvpPuuid: mvp.puuid };
}

export function kdaRatio(s: PlayerGameStat): number {
  return Math.round(((s.kills + s.assists) / Math.max(1, s.deaths)) * 100) / 100;
}
