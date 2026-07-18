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
  /** Champion pool for the player's detected main position only (posChampPool[mainPos]). */
  champPool: { champ: ChampSummary; games: number; winRate: number }[];
  /** Champion pool broken out per lane actually played in the sample — use posChampPool[entry.pos] for any drafted slot, since it may differ from mainPos (explicit pref, or an off-role fill). */
  posChampPool: Partial<Record<Position, { champ: ChampSummary; games: number; winRate: number }[]>>;
  masteryChamps: MasteryChamp[];
  /** Champions this player has a hot hand with in the sampled recent games (>=3 games, >=60% win rate) — worth banning. */
  dangerPicks: { champ: ChampSummary; games: number; winRate: number }[];
  /** Real per-game average (K/D/A/CS/damage/gold) from the sampled matches in this lane — grounds the game simulator in this player's actual numbers. Null if no games in this lane. */
  avgStats: { games: number; kills: number; deaths: number; assists: number; cs: number; damage: number; gold: number } | null;
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
  /** Average (kills+assists)/deaths per team, from real recent-match averages when available. */
  bKda: number;
  rKda: number;
  /** What blue's % would be if only that one factor were in play — lets the UI explain the number. */
  breakdown: {
    scoreOnlyPct: number;
    formOnlyPct: number;
    kdaOnlyPct: number;
  };
}

export type Screen = 'input' | 'analyzing' | 'result' | 'game';

/** A locally-remembered player, kept in localStorage so the sidebar has real history instead of mock data. */
export interface SavedPlayer {
  name: string;
  tag: string;
  region: string;
  tier: Tier;
  mainPos: Position;
  hue: number;
  lastUsed: number;
  /** From the server-side shared roster, not this browser's localStorage — can't be deleted locally. */
  pinned?: boolean;
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

export interface PlayerGameStat {
  puuid: string;
  pos: Position;
  team: 'blue' | 'red';
  champ: ChampSummary;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  win: boolean;
}

/** One kill in the simulated match's play-by-play feed. */
export interface KillEvent {
  /** Seconds into the (simulated) game. */
  t: number;
  team: 'blue' | 'red';
  killerPuuid: string;
  victimPuuid: string;
  assistPuuids: string[];
  /** Set when this is the killer's 2nd+ kill within 15s of their last one (더블 킬 / 트리플 킬 / ...). */
  multi?: string;
}

/** A just-for-fun simulated match, weighted by the computed win rate — not a real Riot game. */
export interface GameResult {
  winner: 'blue' | 'red';
  durationSec: number;
  blueKills: number;
  redKills: number;
  stats: PlayerGameStat[];
  events: KillEvent[];
  mvpPuuid: string;
}
