export type Position = 'TOP' | 'JG' | 'MID' | 'AD' | 'SUP';
export type Trend = 'up' | 'flat' | 'down';

export interface Tier {
  name: string;
  short: string;
  text: string;
  color: string;
}

export interface ChampSummary {
  name: string;
  iconId: string;
}

export interface MasteryChamp extends ChampSummary {
  points: number;
}

export interface Player {
  puuid: string;
  name: string;
  tag: string;
  profileIconId: number | null;
  score: number;
  tier: Tier;
  ranked: boolean;
  mainPos: Position;
  hue: number;
  form: { wr: number; trend: Trend };
  champs: ChampSummary[];
  /** Champion pool for the player's detected main position only (posChampPool[mainPos]). */
  champPool: { champ: ChampSummary; games: number; winRate: number }[];
  /** Champion pool broken out per lane actually played in the sample — use posChampPool[entry.pos] for any drafted slot, since it may differ from mainPos (explicit pref, or an off-role fill). */
  posChampPool: Partial<Record<Position, { champ: ChampSummary; games: number; winRate: number }[]>>;
  masteryChamps: MasteryChamp[];
  dangerPicks: { champ: ChampSummary; games: number; winRate: number }[];
  /** Real per-game average (kills/deaths/assists/cs/damage/gold) from the sampled matches in this lane — grounds the game simulator in this player's actual numbers. Null if no games in this lane. */
  avgStats: {
    games: number;
    /** Average real game length (minutes) these numbers were measured over — needed to scale CS/gold/damage to a simulated game of a different length. */
    durationMin: number;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    damage: number;
    gold: number;
  } | null;
  liveGame: boolean;
  pref: Position | null;
}

export type AnalyzeEvent =
  | { type: 'start'; index: number; name: string }
  | { type: 'phase'; index: number; name: string; phase: string }
  | { type: 'done'; index: number; player: Player }
  | { type: 'error'; index: number; message: string }
  | { type: 'complete' };
