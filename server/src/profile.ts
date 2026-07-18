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
import type { ChampSummary, MasteryChamp, Player, Position } from './types.js';

const POSITION_FALLBACK: Position[] = ['TOP', 'JG', 'MID', 'AD', 'SUP'];

export async function resolveAccount(regional: string, gameName: string, tagLine: string): Promise<RiotAccount | null> {
  return getAccountByRiotId(regional, gameName, tagLine);
}

export interface ProfileOptions {
  matchCount: number;
  includeMastery: boolean;
  includeLive: boolean;
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

  phase('소환사 정보 조회 중...');
  const summoner = await getSummonerByPuuid(platform, puuid);

  phase('티어 · LP 확인 중...');
  const leagues = await getLeagueByPuuid(platform, puuid);
  const solo = leagues.find((l) => l.queueType === 'RANKED_SOLO_5x5') ?? leagues.find((l) => l.queueType === 'RANKED_FLEX_SR');
  const ranked = !!solo;
  const score = solo ? scoreFromRank(solo.tier, solo.rank, solo.leaguePoints) : UNRANKED_SCORE;
  const tier = solo ? tierDisplay(solo.tier, solo.rank, solo.leaguePoints) : UNRANKED_TIER;

  phase('최근 전적 분석 중...');
  const matchIds = await getMatchIds(regional, puuid, opts.matchCount);
  const matches = (await Promise.all(matchIds.map((id) => getMatchDetail(regional, id)))).filter(
    (m): m is NonNullable<typeof m> => !!m,
  );
  const records = matches
    .map((m) => m.info.participants.find((p: RiotMatchParticipant) => p.puuid === puuid))
    .filter((p): p is RiotMatchParticipant => !!p);

  phase('주 포지션 파악 중...');
  const posCounts = new Map<Position, number>();
  for (const r of records) {
    const pos = fromRiotTeamPosition(r.teamPosition);
    if (pos) posCounts.set(pos, (posCounts.get(pos) ?? 0) + 1);
  }
  let mainPos: Position;
  if (posCounts.size > 0) {
    mainPos = [...posCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  } else {
    mainPos = POSITION_FALLBACK[hashStr(account.gameName.toLowerCase()) % 5];
  }

  const champStats = new Map<string, { games: number; wins: number }>();
  for (const r of records) {
    const s = champStats.get(r.championName) ?? { games: 0, wins: 0 };
    s.games += 1;
    if (r.win) s.wins += 1;
    champStats.set(r.championName, s);
  }
  // 표본(최근 전적) 안에서 실제로 플레이한 챔피언별 승률 — 추가 API 호출 없이 이미 받아온 매치 상세에서 바로 집계.
  // 밴픽 추천과 "이 챔피언으로 픽했을 때 팀 승률" 시뮬레이션에 그대로 재사용된다.
  const champPool: Player['champPool'] = [...champStats.entries()]
    .map(([name, s]) => ({ champ: championSummary(name), games: s.games, winRate: Math.round((s.wins / s.games) * 100) }))
    .sort((a, b) => b.games - a.games);

  const champs: ChampSummary[] = champPool.slice(0, 3).map((c) => c.champ);

  const dangerPicks: Player['dangerPicks'] = champPool
    .filter((d) => d.games >= 3 && d.winRate >= 60)
    .sort((a, b) => b.winRate - a.winRate || b.games - a.games)
    .slice(0, 2);

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

  let masteryChamps: MasteryChamp[] = [];
  if (opts.includeMastery) {
    phase('챔피언 숙련도 분석 중...');
    const top = await getMasteryTop(platform, puuid, 3);
    masteryChamps = top.map((m) => {
      const c = championByNumericId(m.championId);
      return { name: c?.name ?? String(m.championId), iconId: c?.id ?? '', points: m.championPoints };
    });
  }

  let liveGame = false;
  if (opts.includeLive) {
    liveGame = await getActiveGame(platform, puuid);
  }

  // Sparse recent-match history (new accounts, ARAM-only players) leaves champs short;
  // top mastery champs are a reasonable stand-in for "signature champions" in that case.
  if (champs.length < 3 && masteryChamps.length) {
    const have = new Set(champs.map((c) => c.name));
    for (const m of masteryChamps) {
      if (champs.length >= 3) break;
      if (have.has(m.name)) continue;
      champs.push({ name: m.name, iconId: m.iconId });
      have.add(m.name);
    }
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
    masteryChamps,
    dangerPicks,
    liveGame,
    pref: null,
  };
}
