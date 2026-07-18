import { POSITIONS } from '../lib/positions';
import type { Position } from '../types';

export function PositionButtons({
  pref,
  mainPos,
  onToggle,
}: {
  pref: Position | null;
  mainPos: Position | null;
  onToggle: (pos: Position) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {POSITIONS.map((pb) => {
        const isPref = pref === pb.key;
        const sel = (pref || mainPos) === pb.key;
        return (
          <button
            key={pb.key}
            type="button"
            title={pb.label}
            onClick={() => onToggle(pb.key)}
            style={{
              width: 24,
              height: 22,
              borderRadius: 6,
              fontSize: 9,
              fontWeight: 700,
              fontFamily: "'IBM Plex Mono'",
              cursor: 'pointer',
              padding: 0,
              border: `1px solid ${isPref ? pb.color : '#28324c'}`,
              background: isPref ? `${pb.color}22` : '#0e1524',
              color: sel ? pb.color : '#5c6884',
            }}
          >
            {pb.abbr}
          </button>
        );
      })}
    </div>
  );
}
