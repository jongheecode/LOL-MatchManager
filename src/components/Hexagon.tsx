import type { CSSProperties, ReactNode } from 'react';

/** The hexagon clip-path used across position badges, avatars, and tier emblems throughout the app. */
export const HEX_CLIP = 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)';

export function Hexagon({
  width,
  height,
  background,
  children,
  style,
}: {
  width: number;
  height: number;
  background: string;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        flex: 'none',
        background,
        clipPath: HEX_CLIP,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
