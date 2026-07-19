import { HEX_CLIP } from './Hexagon';

export function TierEmblem({ color, width = 15, height = 17 }: { color: string; width?: number; height?: number }) {
  return <div style={{ width, height, flex: 'none', clipPath: HEX_CLIP, background: color }} />;
}
