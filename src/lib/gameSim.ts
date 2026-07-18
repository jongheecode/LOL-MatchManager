import type { GameResult, KillEvent, PlayerGameStat, Position, Rates, Teams, TeamEntry } from '../types';
import { effectiveWr, resolveChamp, type ChampPicks } from './balance';

/** Fallback role tendencies for players with no real avgStats sample (e.g. forced off-role fill) —
 * made-up flavor, not real LoL data. Whenever a player has a real per-game average, that's used instead. */
const ROLE_WEIGHT: Record<Position, { kill: number; death: number; assist: number; cs: [number, number]; gold: [number, number] }> = {
  TOP: { kill: 0.9, death: 0.9, assist: 0.75, cs: [6.2, 8.4], gold: [280, 340] },
  JG: { kill: 1.0, death: 0.85, assist: 1.35, cs: [4.4, 6.2], gold: [270, 330] },
  MID: { kill: 1.2, death: 1.0, assist: 0.85, cs: [6.6, 8.8], gold: [300, 360] },
  AD: { kill: 1.3, death: 1.1, assist: 0.7, cs: [7.0, 9.2], gold: [300, 370] },
  SUP: { kill: 0.35, death: 1.05, assist: 1.5, cs: [0.6, 1.6], gold: [180, 230] },
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function randInt(lo: number, hi: number) {
  return Math.round(lo + Math.random() * (hi - lo));
}

function pickWeighted<T>(items: T[], weight: (t: T) => number): T {
  const weights = items.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function perfOf(entry: TeamEntry, isWin: boolean, picks: ChampPicks) {
  const wr = effectiveWr(entry, picks);
  return clamp(1 + (isWin ? 0.16 : -0.12) + (wr - 50) / 160 + (Math.random() * 0.3 - 0.15), 0.6, 1.5);
}

/** How likely this player is to land a kill this event — their own real average kills/game if we
 * have one, else a generic role tendency. Either way scaled by this game's performance factor. */
function killWeight(entry: TeamEntry, perf: number): number {
  const base = entry.player.avgStats ? entry.player.avgStats.kills + 0.4 : ROLE_WEIGHT[entry.pos].kill;
  return base * perf;
}

function deathWeight(entry: TeamEntry, perf: number): number {
  const base = entry.player.avgStats ? entry.player.avgStats.deaths + 0.4 : ROLE_WEIGHT[entry.pos].death;
  return base / perf;
}

function assistWeight(entry: TeamEntry): number {
  return entry.player.avgStats ? entry.player.avgStats.assists + 0.4 : ROLE_WEIGHT[entry.pos].assist;
}

/** A just-for-fun simulated match: winner weighted by the computed win rate, then a real kill-by-kill
 * feed is generated (not just aggregate stats) so kills/deaths/assists per player fall out of actual
 * events — good for an animated "replay" and internally consistent numbers. Every player's odds of
 * getting a kill/death/assist, and their final CS/gold/damage, are anchored to THEIR OWN real recent
 * per-game average (avgStats) whenever we have one, not a generic role template. Not real Riot data. */
export function simulateGame(teams: Teams, rates: Rates, picks: ChampPicks): GameResult {
  const winner: 'blue' | 'red' = Math.random() * 100 < rates.blue ? 'blue' : 'red';
  const loser: 'blue' | 'red' = winner === 'blue' ? 'red' : 'blue';

  const durationSec = randInt(16 * 60, 34 * 60);
  const totalKills = clamp(Math.round((durationSec / 60) * (0.55 + Math.random() * 0.35)), 12, 42);
  const winShare = clamp(0.52 + (rates[winner] - 50) / 130 + (Math.random() * 0.1 - 0.05), 0.5, 0.82);
  const winKills = Math.round(totalKills * winShare);
  const loseKills = totalKills - winKills;

  const perf = new Map<string, number>();
  (['blue', 'red'] as const).forEach((team) => {
    for (const entry of teams[team]) perf.set(entry.player.puuid, perfOf(entry, team === winner, picks));
  });

  const times = Array.from({ length: totalKills }, () => randInt(45, durationSec - 20)).sort((a, b) => a - b);

  const events: KillEvent[] = [];
  const kills = new Map<string, number>();
  const deaths = new Map<string, number>();
  const assists = new Map<string, number>();

  let winRemaining = winKills;
  let loseRemaining = loseKills;
  for (const t of times) {
    // Interleave roughly proportionally rather than dumping all of one team's kills first.
    const takeWin = winRemaining > 0 && (loseRemaining <= 0 || Math.random() < winRemaining / (winRemaining + loseRemaining));
    const killerTeam = takeWin ? winner : loser;
    if (takeWin) winRemaining--;
    else loseRemaining--;
    const victimTeam = killerTeam === 'blue' ? 'red' : 'blue';

    const killerEntry = pickWeighted(teams[killerTeam], (e) => killWeight(e, perf.get(e.player.puuid) ?? 1));
    const victimEntry = pickWeighted(teams[victimTeam], (e) => deathWeight(e, perf.get(e.player.puuid) ?? 1));

    const assistCount = (() => {
      const r = Math.random();
      if (r < 0.15) return 0;
      if (r < 0.45) return 1;
      if (r < 0.8) return 2;
      return 3;
    })();
    const assistCandidates = teams[killerTeam].filter((e) => e.player.puuid !== killerEntry.player.puuid);
    const assisters: TeamEntry[] = [];
    const pool = [...assistCandidates];
    for (let i = 0; i < assistCount && pool.length; i++) {
      const pick = pickWeighted(pool, assistWeight);
      assisters.push(pick);
      pool.splice(pool.indexOf(pick), 1);
    }

    kills.set(killerEntry.player.puuid, (kills.get(killerEntry.player.puuid) ?? 0) + 1);
    deaths.set(victimEntry.player.puuid, (deaths.get(victimEntry.player.puuid) ?? 0) + 1);
    for (const a of assisters) assists.set(a.player.puuid, (assists.get(a.player.puuid) ?? 0) + 1);

    events.push({
      t,
      team: killerTeam,
      killerPuuid: killerEntry.player.puuid,
      victimPuuid: victimEntry.player.puuid,
      assistPuuids: assisters.map((a) => a.player.puuid),
    });
  }

  // Multi-kill labels: a killer's 2nd+ kill within 15s of their previous one streaks up
  // (더블 킬 → 트리플 킬 → 쿼드라 킬 → 펜타 킬), same idea as LoL's own killstreak system.
  const MULTI_LABELS: Record<number, string> = { 2: '더블 킬', 3: '트리플 킬', 4: '쿼드라 킬', 5: '펜타 킬' };
  const lastKillTime = new Map<string, number>();
  const killStreak = new Map<string, number>();
  for (const ev of events) {
    const prev = lastKillTime.get(ev.killerPuuid);
    const streak = prev != null && ev.t - prev <= 15 ? (killStreak.get(ev.killerPuuid) ?? 1) + 1 : 1;
    killStreak.set(ev.killerPuuid, streak);
    lastKillTime.set(ev.killerPuuid, ev.t);
    if (streak >= 2) ev.multi = MULTI_LABELS[Math.min(5, streak)];
  }

  const minutes = durationSec / 60;
  const stats: PlayerGameStat[] = [];
  (['blue', 'red'] as const).forEach((team) => {
    const isWin = team === winner;
    for (const entry of teams[team]) {
      const p = entry.player;
      const factor = perf.get(p.puuid) ?? 1;
      const k = kills.get(p.puuid) ?? 0;
      const d = deaths.get(p.puuid) ?? 0;
      const a = assists.get(p.puuid) ?? 0;

      let cs: number;
      let gold: number;
      let damage: number;
      if (p.avgStats && p.avgStats.durationMin > 0) {
        // Center on this player's real per-MINUTE rate, then scale to *this* simulated game's
        // length — applying their raw per-game totals directly would inflate CS/gold/damage
        // whenever the simulated game is shorter than their real average game (e.g. 300+ CS in
        // a 22-minute game, which isn't physically possible).
        const jitter = () => 0.85 + Math.random() * 0.3;
        const csPerMin = p.avgStats.cs / p.avgStats.durationMin;
        const goldPerMin = p.avgStats.gold / p.avgStats.durationMin;
        const dmgPerMin = p.avgStats.damage / p.avgStats.durationMin;
        cs = Math.max(0, Math.round(csPerMin * minutes * jitter() * (0.92 + factor * 0.1)));
        gold = Math.max(500, Math.round(goldPerMin * minutes * jitter() * (0.9 + factor * 0.12) + (isWin ? 300 : 0)));
        damage = Math.max(1000, Math.round(dmgPerMin * minutes * jitter() * (0.85 + factor * 0.2)));
      } else {
        const w = ROLE_WEIGHT[entry.pos];
        cs = Math.max(0, Math.round((w.cs[0] + Math.random() * (w.cs[1] - w.cs[0])) * minutes));
        const goldPerMin = w.gold[0] + Math.random() * (w.gold[1] - w.gold[0]);
        gold = Math.max(500, Math.round(goldPerMin * minutes + k * 300 + a * 150 + (isWin ? 400 : 0)));
        damage = Math.max(1000, Math.round((cs * 22 + k * 900 + a * 220) * (0.85 + factor * 0.3) * (0.9 + Math.random() * 0.25)));
      }

      stats.push({ puuid: p.puuid, pos: entry.pos, team, champ: resolveChamp(entry, picks), kills: k, deaths: d, assists: a, cs, gold, damage, win: isWin });
    }
  });

  const score = (s: PlayerGameStat) => s.kills * 3 + s.assists * 1.5 - s.deaths * 1.2 + s.damage * 0.0006 + s.gold * 0.0003;
  const winnerStats = stats.filter((s) => s.win);
  const mvp = winnerStats.reduce((best, s) => (score(s) > score(best) ? s : best), winnerStats[0]);

  return {
    winner,
    durationSec,
    blueKills: winner === 'blue' ? winKills : loseKills,
    redKills: winner === 'red' ? winKills : loseKills,
    stats,
    events,
    mvpPuuid: mvp.puuid,
  };
}

export function kdaRatio(s: PlayerGameStat): number {
  return Math.round(((s.kills + s.assists) / Math.max(1, s.deaths)) * 100) / 100;
}

export function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
