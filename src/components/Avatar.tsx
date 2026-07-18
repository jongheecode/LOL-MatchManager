import { useState } from 'react';
import { avatarGradient, profileIconUrl } from '../lib/avatar';

export function Avatar({
  name,
  hue,
  profileIconId,
  size,
  radius,
  fontSize,
}: {
  name: string;
  hue: number;
  profileIconId?: number | null;
  size: number;
  radius: number;
  fontSize?: number;
}) {
  const [broken, setBroken] = useState(false);
  const src = !broken ? profileIconUrl(profileIconId ?? null) : null;

  return (
    <div
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: fontSize ?? Math.round(size * 0.4),
        color: '#dfe6f5',
        border: '1px solid rgba(255,255,255,.08)',
        background: avatarGradient(hue),
        overflow: 'hidden',
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setBroken(true)}
        />
      ) : (
        name[0] || '?'
      )}
    </div>
  );
}
