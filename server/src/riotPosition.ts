import type { Position } from './types.js';

const MAP: Record<string, Position> = {
  TOP: 'TOP',
  JUNGLE: 'JG',
  MIDDLE: 'MID',
  BOTTOM: 'AD',
  UTILITY: 'SUP',
};

export function fromRiotTeamPosition(teamPosition: string): Position | null {
  return MAP[teamPosition] ?? null;
}
