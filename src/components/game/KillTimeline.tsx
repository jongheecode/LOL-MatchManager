import type { KillEvent } from '../../types';
import { teamColor } from '../../lib/colors';

export function KillTimeline({
  events,
  revealedCount,
  clock,
  durationSec,
}: {
  events: KillEvent[];
  revealedCount: number;
  clock: number;
  durationSec: number;
}) {
  return (
    <div style={{ position: 'relative', height: 34, marginBottom: 20, background: '#0d1424', border: '1px solid #1e2740', borderRadius: 10 }}>
      <div style={{ position: 'absolute', top: '50%', left: 12, right: 12, height: 2, transform: 'translateY(-50%)', background: '#182036' }} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 2,
          background: '#e6c574',
          boxShadow: '0 0 10px #e6c574',
          transition: 'left .3s ease',
          left: `${((clock / durationSec) * 100).toFixed(2)}%`,
        }}
      />
      {events.map((ev, i) => {
        const revealed = i < revealedCount;
        const col = teamColor(ev.team);
        const size = revealed ? 9 : 6;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: '50%',
              left: `${((ev.t / durationSec) * 100).toFixed(2)}%`,
              transform: 'translate(-50%,-50%) rotate(45deg)',
              width: size,
              height: size,
              background: revealed ? col : '#2a3350',
              transition: 'all .3s',
              boxShadow: revealed ? `0 0 6px ${col}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
