import type { Player, SavedPlayer } from '../types';

const KEY = 'pentabalance.savedPlayers.v1';
const MAX_SAVED = 24;

function read(): SavedPlayer[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPlayer[];
  } catch {
    return [];
  }
}

function write(list: SavedPlayer[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
  } catch {
    /* storage unavailable (private mode, quota) — silently no-op */
  }
}

export function getSavedPlayers(): SavedPlayer[] {
  return read().sort((a, b) => b.lastUsed - a.lastUsed);
}

/** Remembers a successfully-resolved player locally so the sidebar has real history to offer next time. */
export function rememberPlayer(player: Player, region: string) {
  const list = read();
  const idx = list.findIndex((p) => p.name === player.name && p.tag === player.tag);
  const entry: SavedPlayer = {
    name: player.name,
    tag: player.tag,
    region,
    tier: player.tier,
    mainPos: player.mainPos,
    hue: player.hue,
    lastUsed: Date.now(),
  };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  write(list);
}

export function forgetPlayer(name: string, tag: string) {
  write(read().filter((p) => !(p.name === name && p.tag === tag)));
}
