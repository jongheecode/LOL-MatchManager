import { RIOT_API_KEY } from './env.js';
import { riotLimiter } from './queue.js';
import { riotCache } from './cache.js';

export class RiotApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'RiotApiError';
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRiot<T>(url: string): Promise<T | null> {
  return riotLimiter.schedule(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, { headers: { 'X-Riot-Token': RIOT_API_KEY } });
      if (res.status === 404) return null;
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('retry-after')) || 1;
        await sleep(retryAfter * 1000 + 250);
        continue;
      }
      if (!res.ok) {
        throw new RiotApiError(res.status, await res.text().catch(() => res.statusText));
      }
      return (await res.json()) as T;
    }
    throw new RiotApiError(429, 'Rate limited after retries');
  });
}

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export function getAccountByRiotId(regional: string, gameName: string, tagLine: string) {
  const key = `account:${regional}:${gameName}#${tagLine}`.toLowerCase();
  return riotCache.getOrSet(key, 60 * 60_000, () =>
    fetchRiot<RiotAccount>(
      `https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    ),
  );
}

export interface RiotSummoner {
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
}

export function getSummonerByPuuid(platform: string, puuid: string) {
  return riotCache.getOrSet(`summoner:${platform}:${puuid}`, 30 * 60_000, () =>
    fetchRiot<RiotSummoner>(`https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`),
  );
}

export interface RiotLeagueEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

export function getLeagueByPuuid(platform: string, puuid: string) {
  return riotCache.getOrSet(`league:${platform}:${puuid}`, 5 * 60_000, async () => {
    const list = await fetchRiot<RiotLeagueEntry[]>(
      `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`,
    );
    return list ?? [];
  });
}

export function getMatchIds(regional: string, puuid: string, count: number) {
  return riotCache.getOrSet(`matchids:${regional}:${puuid}:${count}`, 2 * 60_000, async () => {
    const ids = await fetchRiot<string[]>(
      `https://${regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`,
    );
    return ids ?? [];
  });
}

export interface RiotMatchParticipant {
  puuid: string;
  win: boolean;
  championName: string;
  teamPosition: string;
}

export interface RiotMatch {
  metadata: { matchId: string };
  info: { participants: RiotMatchParticipant[]; gameDuration: number };
}

export function getMatchDetail(regional: string, matchId: string) {
  return riotCache.getOrSet(`match:${matchId}`, 24 * 60 * 60_000, () =>
    fetchRiot<RiotMatch>(`https://${regional}.api.riotgames.com/lol/match/v5/matches/${matchId}`),
  );
}

export interface RiotMastery {
  championId: number;
  championPoints: number;
}

export function getMasteryTop(platform: string, puuid: string, count: number) {
  return riotCache.getOrSet(`mastery:${platform}:${puuid}:${count}`, 15 * 60_000, async () => {
    const list = await fetchRiot<RiotMastery[]>(
      `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}`,
    );
    return list ?? [];
  });
}

export function getActiveGame(platform: string, puuid: string) {
  return riotCache.getOrSet(`live:${platform}:${puuid}`, 30_000, async () => {
    const game = await fetchRiot<{ gameId: number }>(
      `https://${platform}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`,
    );
    return !!game;
  });
}
