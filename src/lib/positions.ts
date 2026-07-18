import type { Position } from '../types';

export interface PositionMeta {
  key: Position;
  label: string;
  abbr: string;
  color: string;
}

export const POSITIONS: PositionMeta[] = [
  { key: 'TOP', label: '탑', abbr: 'TOP', color: '#e0a94f' },
  { key: 'JG', label: '정글', abbr: 'JG', color: '#4fd18a' },
  { key: 'MID', label: '미드', abbr: 'MID', color: '#5aa9ff' },
  { key: 'AD', label: '원딜', abbr: 'AD', color: '#f0724b' },
  { key: 'SUP', label: '서폿', abbr: 'SP', color: '#c07be0' },
];

export const POSITION_ORDER: Position[] = ['TOP', 'JG', 'MID', 'AD', 'SUP'];

const byKey = new Map(POSITIONS.map((p) => [p.key, p]));

export function posMeta(key: Position): PositionMeta {
  return byKey.get(key)!;
}

export function posLabel(key: Position): string {
  return posMeta(key).label;
}

export function posColor(key: Position): string {
  return posMeta(key).color;
}
