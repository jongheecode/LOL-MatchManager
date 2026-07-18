export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarGradient(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue} 42% 36%), hsl(${hue} 46% 22%))`;
}

export function posEmblemGradient(color: string): string {
  return `linear-gradient(140deg, ${color}, ${color}bb)`;
}

const DDRAGON_VERSION_FALLBACK = '14.23.1';
let cachedVersion: string | null = null;

/** Best-effort Data Dragon version for building CDN asset URLs (falls back to a pinned version). */
export function setDdragonVersion(v: string) {
  cachedVersion = v;
}

export function champIconUrl(iconId: string): string | null {
  if (!iconId) return null;
  const v = cachedVersion || DDRAGON_VERSION_FALLBACK;
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${iconId}.png`;
}

export function profileIconUrl(profileIconId: number | null): string | null {
  if (profileIconId == null) return null;
  const v = cachedVersion || DDRAGON_VERSION_FALLBACK;
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/profileicon/${profileIconId}.png`;
}
