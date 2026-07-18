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
  /** Every champion seen in the sampled recent matches, with that player's real games/winRate on it. */
  champPool: { champ: ChampSummary; games: number; winRate: number }[];
  masteryChamps: MasteryChamp[];
  dangerPicks: { champ: ChampSummary; games: number; winRate: number }[];
  liveGame: boolean;
  pref: Position | null;
}

export type AnalyzeEvent =
  | { type: 'start'; index: number; name: string }
  | { type: 'phase'; index: number; name: string; phase: string }
  | { type: 'done'; index: number; player: Player }
  | { type: 'error'; index: number; message: string }
  | { type: 'complete' };
