import 'dotenv/config';

export const RIOT_API_KEY = process.env.RIOT_API_KEY || '';
export const DEFAULT_PLATFORM = process.env.DEFAULT_PLATFORM || 'kr';
export const DEFAULT_REGIONAL = process.env.DEFAULT_REGIONAL || 'asia';
export const PORT = Number(process.env.PORT || 8787);

if (!RIOT_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[pentabalance] RIOT_API_KEY is not set. Copy server/.env.example to server/.env and paste a key from https://developer.riotgames.com/',
  );
}
