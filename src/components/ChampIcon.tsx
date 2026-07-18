import { useState } from 'react';
import { champIconUrl, hashStr } from '../lib/avatar';
import type { ChampSummary } from '../types';

export function ChampIcon({ champ, size = 24 }: { champ: ChampSummary; size?: number }) {
  const [broken, setBroken] = useState(false);
  const src = champ.iconId && !broken ? champIconUrl(champ.iconId) : null;
  const hue = hashStr(champ.name) % 360;

  return (
    <div
      title={champ.name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 8.5,
        fontWeight: 700,
        color: '#f2f5fc',
        border: '1px solid rgba(255,255,255,.14)',
        overflow: 'hidden',
        background: `linear-gradient(135deg, hsl(${hue} 44% 42%), hsl(${hue} 46% 28%))`,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={champ.name}
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setBroken(true)}
        />
      ) : (
        (champ.name[0] || '') + (champ.name[1] || '')
      )}
    </div>
  );
}
