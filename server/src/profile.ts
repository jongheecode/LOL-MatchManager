import { hashStr } from './hash.js';
import { scoreFromRank, tierDisplay, UNRANKED_SCORE, UNRANKED_TIER } from './tier.js';
import { championByEnglishKey, championByNumericId } from './ddragon.js';
import { fromRiotTeamPosition } from './riotPosition.js';
import {
  getAccountByRiotId,
  getActiveGame,
  getLeagueByPuuid,
  getMasteryTop,
  getMatchDetail,
  getMatchIds,
  getSummonerByPuuid,
  type RiotAccount,
  type RiotMatchParticipant,
} from './riot.js';
import type { Priority } from './queue.js';
import type { ChampSummary, MasteryChamp, Player, Position } from './types.js';

const POSITION_FALLBACK: Position[] = ['TOP', 'JG', 'MID', 'AD', 'SUP'];

export async function resolveAccount(
  regional: string,
  gameName: string,
  tagLine: string,
  priority: Priority = 'high',
): Promise<RiotAccount | null> {
  return getAccountByRiotId(regional, gameName, tagLine, priority);
}

export interface ProfileOptions {
  matchCount: number;
  includeMastery: boolean;
  includeLive: boolean;
  /** 'low' for background work (e.g. warming the shared roster) so it always yields to a real visitor's request. */
  priority?: Priority;
  onPhase?: (phase: string) => void;
}

function championSummary(englishKey: string): ChampSummary {
  const c = championByEnglishKey(englishKey);
  return c ? { name: c.name, iconId: c.id } : { name: englishKey, iconId: '' };
}

export async function buildPlayerProfile(
  platform: string,
  regional: string,
  account: RiotAccount,
  opts: ProfileOptions,
): Promise<Player> {
  const { puuid } = account;
  const phase = (p: string) => opts.onPhase?.(p);
  const priority = opts.priority ?? 'high';

  phase('소환사 정보 조회 중...');
  const summoner = await getSummonerByPuuid(platform, puuid, priority);

  phase('티어 · LP 확인 중...');
  const leagues = await getLeagueByPuuid(platform, puuid, priority);
  const solo = leagues.find((l) => l.queueType === 'RANKED_SOLO_5x5') ?? leagues.find((l) => l.queueType === 'RANKED_FLEX_SR');
  const ranked = !!solo;
  const score = solo ? scoreFromRank(solo.tier, solo.rank, solo.leaguePoints) : UNRANKED_SCORE;
  const tier = solo ? tierDisplay(solo.tier, solo.rank, solo.leaguePoints) : UNRANKED_TIER;

  phase('최근 전적 분석 중...');
  const matchIds = await getMatchIds(regional, puuid, opts.matchCount, priority);
  const matches = (await Promise.all(matchIds.map((id) => getMatchDetail(regional, id, priority)))).filter(
    (m): m is NonNullable<typeof m> => !!m,
  );
  // Carry each match's real length alongside the participant row — CS/gold/damage only make sense
  // once converted to a per-minute rate, since the simulator's game length won't match this game's.
  const records = matches
    .map((m) => {
      const p = m.info.participants.find((pp: RiotMatchParticipant) => pp.puuid === puuid);
      return p ? { ...p, gameDurationSec: m.info.gameDuration } : null;
    })
    .filter((p): p is RiotMatchParticipant & { gameDurationSec: number } => !!p);

  phase('주 포지션 파악 중...');
  // Group every sampled game by the lane it was actually played in — not just the single most
  // common lane — so that a player who got slotted into a *different* lane this draft (their
  // own explicit position preference, or a leftover-fill) can still show real champion data for
  // THAT lane instead of leaking in champs from their main lane (e.g. "ADC" showing a jungle champ).
  type RecordWithDuration = RiotMatchParticipant & { gameDurationSec: number };
  const byPos = new Map<Position, RecordWithDuration[]>();
  for (const r of records) {
    const pos = fromRiotTeamPosition(r.teamPosition);
    if (!pos) continue;
    const arr = byPos.get(pos) ?? [];
    arr.push(r);
    byPos.set(pos, arr);
  }
  let mainPos: Position;
  if (byPos.size > 0) {
    mainPos = [...byPos.entries()].sort((a, b) => b[1].length - a[1].length)[0][0];
  } else {
    mainPos = POSITION_FALLBACK[hashStr(account.gameName.toLowerCase()) % 5];
  }

  const buildPool = (recs: RiotMatchParticipant[]): Player['champPool'] => {
    const stats = new Map<string, { games: number; wins: number }>();
    for (const r of recs) {
      const s = stats.get(r.championName) ?? { games: 0, wins: 0 };
      s.games += 1;
      if (r.win) s.wins += 1;
      stats.set(r.championName, s);
    }
    return [...stats.entries()]
      .map(([name, s]) => ({ champ: championSummary(name), games: s.games, winRate: Math.round((s.wins / s.games) * 100) }))
      .sort((a, b) => b.games - a.games);
  };

  // 표본(최근 전적) 안에서 실제로 플레이한 챔피언별 승률 — 추가 API 호출 없이 이미 받아온 매치 상세에서 바로 집계.
  // 밴픽 추천과 "이 챔피언으로 픽했을 때 팀 승률" 시뮬레이션에 라인별로 정확히 재사용된다.
  const posChampPool: Player['posChampPool'] = {};
  for (const [pos, recs] of byPos) posChampPool[pos] = buildPool(recs);

  const champPool: Player['champPool'] = posChampPool[mainPos] ?? [];
  let champs: ChampSummary[] = champPool.slice(0, 3).map((c) => c.champ);
  const dangerPicks: Player['dangerPicks'] = champPool
    .filter((d) => d.games >= 3 && d.winRate >= 60)
    .sort((a, b) => b.winRate - a.winRate || b.games - a.games)
    .slice(0, 2);

  // Real per-game average from the sampled matches in this lane (falls back to the full sample
  // if we couldn't determine a lane at all) — feeds both the win-rate math and the game simulator,
  // so "예상 승률"/시뮬레이션 KDA are grounded in this specific player's actual recent numbers
  // instead of a generic role archetype.
  const statsRecords = byPos.get(mainPos) ?? records;
  const sum = (pick: (r: RecordWithDuration) => number) => statsRecords.reduce((a, r) => a + pick(r), 0);
  const avgDurationMin = statsRecords.length ? sum((r) => r.gameDurationSec) / statsRecords.length / 60 : 0;
  const avgStats: Player['avgStats'] = statsRecords.length
    ? {
        games: statsRecords.length,
        durationMin: Math.round(avgDurationMin * 10) / 10,
        kills: Math.round((sum((r) => r.kills) / statsRecords.length) * 10) / 10,
        deaths: Math.round((sum((r) => r.deaths) / statsRecords.length) * 10) / 10,
        assists: Math.round((sum((r) => r.assists) / statsRecords.length) * 10) / 10,
        cs: Math.round(sum((r) => r.totalMinionsKilled + r.neutralMinionsKilled) / statsRecords.length),
        damage: Math.round(sum((r) => r.totalDamageDealtToChampions) / statsRecords.length),
        gold: Math.round(sum((r) => r.goldEarned) / statsRecords.length),
      }
    : null;

  phase('최근 폼 계산 중...');
  const n = records.length;
  const winRate = (arr: RiotMatchParticipant[]) => (arr.length ? (arr.filter((r) => r.win).length / arr.length) * 100 : 50);
  const wr = Math.round(winRate(records));
  let trend: Player['form']['trend'] = 'flat';
  if (n >= 4) {
    const half = Math.floor(n / 2);
    const recentWR = winRate(records.slice(0, half));
    const olderWR = winRate(records.slice(half));
    if (recentWR - olderWR >= 10) trend = 'up';
    else if (recentWR - olderWR <= -10) trend = 'down';
  }

  // Riot's API has no "season stats" endpoint (that's what third-party sites crawl and store
  // themselves) — but Champion Mastery is an official, single-call, career-long signal of who a
  // player really mains. When the sampled recent games in their main lane are too thin to trust
  // (fresh account, long break, mostly ARAM, etc.), lean on mastery instead of a noisy 1-2 game sample.
  const sparse = champPool.length === 0 || (champPool[0]?.games ?? 0) < 3;
  let masteryChamps: MasteryChamp[] = [];
  if (opts.includeMastery || sparse) {
    phase('챔피언 숙련도 분석 중...');
    const top = await getMasteryTop(platform, puuid, 3, priority);
    masteryChamps = top.map((m) => {
      const c = championByNumericId(m.championId);
      return { name: c?.name ?? String(m.championId), iconId: c?.id ?? '', points: m.championPoints };
    });
  }

  let liveGame = false;
  if (opts.includeLive) {
    liveGame = await getActiveGame(platform, puuid, priority);
  }

  // When the recent-match sample is too thin to trust, lead with career mastery instead (still
  // filling any remaining slots from the thin match sample); otherwise mastery only fills gaps
  // left by a short match-based list.
  if (masteryChamps.length) {
    const merge = (primary: ChampSummary[], secondary: ChampSummary[]) => {
      const out = [...primary];
      const have = new Set(out.map((c) => c.name));
      for (const c of secondary) {
        if (out.length >= 3) break;
        if (have.has(c.name)) continue;
        out.push(c);
        have.add(c.name);
      }
      return out;
    };
    champs = sparse ? merge(masteryChamps, champs) : merge(champs, masteryChamps);
  }

  return {
    puuid,
    name: account.gameName,
    tag: account.tagLine,
    profileIconId: summoner?.profileIconId ?? null,
    score,
    tier,
    ranked,
    mainPos,
    hue: hashStr(account.gameName.toLowerCase()) % 360,
    form: { wr, trend },
    champs,
    champPool,
    posChampPool,
    avgStats,
    masteryChamps,
    dangerPicks,
    liveGame,
    pref: null,
  };
}
