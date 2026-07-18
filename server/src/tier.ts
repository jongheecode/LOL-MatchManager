import type { Tier } from './types.js';

const TIERS: { name: string; color: string }[] = [
  { name: '아이언', color: '#7a6f66' },
  { name: '브론즈', color: '#a97142' },
  { name: '실버', color: '#9fb0bf' },
  { name: '골드', color: '#e0b458' },
  { name: '플래티넘', color: '#4fd1c5' },
  { name: '에메랄드', color: '#2ec77a' },
  { name: '다이아', color: '#6aa9ff' },
  { name: '마스터', color: '#c05ce0' },
  { name: '그마', color: '#f0656a' },
  { name: '챌린저', color: '#ecd98a' },
];

export const UNRANKED_TIER: Tier = { name: '언랭크', short: 'UNR', text: '언랭크', color: '#6f7b96' };
export const UNRANKED_SCORE = 1600;

const RIOT_TIER_KEYS = [
  'IRON',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'EMERALD',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'CHALLENGER',
];

const DIVISION_NUM: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

/**
 * Builds the display Tier directly from League-V4's real (tier, rank, LP) — never re-derives
 * apex tier (Master/GM/Challenger) from a collapsed score. LP alone does NOT determine apex tier:
 * a 700LP Master is still Master, not Challenger, and Challenger cutoffs vary by season/region.
 */
export function tierDisplay(tier: string, rank: string, leaguePoints: number): Tier {
  const idx = RIOT_TIER_KEYS.indexOf(tier.toUpperCase());
  if (idx < 0) return UNRANKED_TIER;
  const t = TIERS[idx];
  if (idx < 7) {
    const roman = DIVISION_NUM[rank] ? rank : 'IV';
    return { name: t.name, short: roman, text: `${t.name} ${roman} ${leaguePoints}LP`, color: t.color };
  }
  const short = idx === 7 ? 'M' : idx === 8 ? 'GM' : 'C';
  return { name: t.name, short, text: `${t.name} ${leaguePoints}LP`, color: t.color };
}

/**
 * A relative MMR-equivalent score used only for the balance algorithm's ordering/snake-draft math —
 * NOT re-mapped back into a tier label. Apex tiers (Master+) add real LP on top of a per-tier base so
 * two Masters with different LP are still ranked apart, without an artificial ceiling that collapses
 * high-LP players together.
 */
export function scoreFromRank(tier: string, rank: string, leaguePoints: number): number {
  const idx = RIOT_TIER_KEYS.indexOf(tier.toUpperCase());
  if (idx < 0) return UNRANKED_SCORE;
  if (idx < 7) {
    const divNum = DIVISION_NUM[rank] ?? 4;
    const within = (4 - divNum) * 100 + Math.max(0, Math.min(99, leaguePoints));
    return idx * 400 + within;
  }
  return 2800 + (idx - 7) * 400 + Math.max(0, leaguePoints);
}
