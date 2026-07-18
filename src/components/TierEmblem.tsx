const CLIP = 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)';

export function TierEmblem({ color, width = 15, height = 17 }: { color: string; width?: number; height?: number }) {
  return <div style={{ width, height, flex: 'none', clipPath: CLIP, background: color }} />;
}
