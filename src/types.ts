export type Position = 'TOP' | 'JG' | 'MID' | 'AD' | 'SUP';

export type Trend = 'up' | 'flat' | 'down';

export interface Tier {
  /** Korean tier name, e.g. "다이아" */
  name: string;
  /** Roman numeral division (I~IV) or M/GM/C for apex tiers */
  short: string;
  /** Full display text, e.g. "다이아 II 42LP" */
  text: string;
  color: string;
}

export interface ChampSummary {
  /** Korean display name */
  name: string;
  /** Data Dragon key, used to build the CDN icon URL. Empty if unknown. */
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
  /** Every champion seen in the sampled recent matches, with that player's real games/winRate on it — feeds the champion picker. */
  champPool: { champ: ChampSummary; games: number; winRate: number }[];
  masteryChamps: MasteryChamp[];
  /** Champions this player has a hot hand with in the sampled recent games (>=3 games, >=60% win rate) — worth banning. */
  dangerPicks: { champ: ChampSummary; games: number; winRate: number }[];
  liveGame: boolean;
  /** Preferred position chosen by the user for this session's draft, if any. */
  pref: Position | null;
}

export type SlotStatus = 'empty' | 'loading' | 'done' | 'error';

export interface Slot {
  query: string;
  status: SlotStatus;
  data: Player | null;
  pref: Position | null;
  errorMessage?: string;
}

export interface TeamEntry {
  pos: Position;
  player: Player;
  honored: boolean;
}

export interface Teams {
  blue: TeamEntry[];
  red: TeamEntry[];
}

export interface Rates {
  blue: number;
  red: number;
  bScore: number;
  rScore: number;
  bForm: number;
  rForm: number;
}

export type Screen = 'input' | 'analyzing' | 'result' | 'game';

export interface PlayerGameStat {
  puuid: string;
  pos: Position;
  team: 'blue' | 'red';
  champ: ChampSummary;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  win: boolean;
}

/** A just-for-fun simulated match, weighted by the computed win rate — not a real Riot game. */
export interface GameResult {
  winner: 'blue' | 'red';
  stats: PlayerGameStat[];
  mvpPuuid: string;
}

/** A locally-remembered player, kept in localStorage so the sidebar has real history instead of mock data. */
export interface SavedPlayer {
  name: string;
  tag: string;
  region: string;
  tier: Tier;
  mainPos: Position;
  hue: number;
  lastUsed: number;
}

/** Backend lookup response for a single Riot ID (used while typing in the input screen). */
export interface LookupResponse {
  ok: true;
  player: Player;
}

export interface LookupError {
  ok: false;
  code: 'NOT_FOUND' | 'RATE_LIMITED' | 'UPSTREAM_ERROR' | 'BAD_REQUEST';
  message: string;
}

/** NDJSON stream events emitted by POST /api/analyze */
export type AnalyzeEvent =
  | { type: 'start'; index: number; name: string }
  | { type: 'phase'; index: number; name: string; phase: string }
  | { type: 'done'; index: number; player: Player }
  | { type: 'error'; index: number; message: string }
  | { type: 'complete' };

export interface AnalyzeRequestPlayer {
  puuid: string;
  name: string;
  tag: string;
  pref: Position | null;
}
