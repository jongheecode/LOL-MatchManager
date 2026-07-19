import 'dotenv/config';

export const RIOT_API_KEY = process.env.RIOT_API_KEY || '';
export const DEFAULT_PLATFORM = process.env.DEFAULT_PLATFORM || 'kr';
export const DEFAULT_REGIONAL = process.env.DEFAULT_REGIONAL || 'asia';
export const PORT = Number(process.env.PORT || 8787);

// --- AI (Gemini) mode ---
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
/** Global daily Gemini call cap (rolling 24h). Keep <= ~60-70% of the project's real RPD. */
export const AI_GLOBAL_DAILY_LIMIT = Number(process.env.AI_GLOBAL_DAILY_LIMIT || 50);
export const AI_IP_LIMIT_PER_MINUTE = Number(process.env.AI_IP_LIMIT_PER_MINUTE || 2);
export const AI_MAX_CONCURRENT = Number(process.env.AI_MAX_CONCURRENT || 2);
/** Production CORS allowlist origin. Empty = allow all (dev / same-origin deploy). */
export const APP_ORIGIN = process.env.APP_ORIGIN || '';

if (!RIOT_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[matchmanager] RIOT_API_KEY is not set. Copy server/.env.example to server/.env and paste a key from https://developer.riotgames.com/',
  );
}
