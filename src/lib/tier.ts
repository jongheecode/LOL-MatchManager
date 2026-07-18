import type { Tier } from '../types';

export const TIERS: { name: string; color: string }[] = [
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

export const UNRANKED_TIER: Tier = {
  name: '언랭크',
  short: 'UNR',
  text: '언랭크',
  color: '#6f7b96',
};

/** Mirrors the design's tierFromScore(): score(0~3999) -> display tier. */
export function tierFromScore(scoreIn: number): Tier {
  const s = Math.max(0, Math.min(3999, Math.round(scoreIn)));
  const idx = Math.min(9, Math.floor(s / 400));
  const t = TIERS[idx];
  if (idx >= 7) {
    const lp = Math.max(0, Math.round((s - 2800) * 0.7));
    const short = ['M', 'GM', 'C'][idx - 7];
    return { name: t.name, short, text: `${t.name} ${lp}LP`, color: t.color };
  }
  const within = s % 400;
  const div = 4 - Math.floor(within / 100);
  const roman = ['I', 'II', 'III', 'IV'][div - 1];
  const lp = within % 100;
  return { name: t.name, short: roman, text: `${t.name} ${roman} ${lp}LP`, color: t.color };
}
