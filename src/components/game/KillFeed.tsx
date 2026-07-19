import type { KillEvent } from '../../types';
import { Avatar } from '../Avatar';
import { formatClock } from '../../lib/gameSim';
import { teamColor, teamRgba } from '../../lib/colors';

interface FeedPlayer {
  name: string;
  hue: number;
  profileIconId: number | null;
}

export function KillFeed({ events, index }: { events: KillEvent[]; index: Map<string, FeedPlayer> }) {
  return (
    <div
      style={{
        background: '#0c1220',
        border: '1px solid #1a2236',
        borderRadius: 14,
        padding: '12px 16px 16px',
        height: 296,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
      }}
    >
      {events.map((ev, i) => {
        const killer = index.get(ev.killerPuuid);
        const victim = index.get(ev.victimPuuid);
        const col = teamColor(ev.team);
        if (!killer || !victim) return null;
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 9,
              marginTop: 7,
              flex: 'none',
              background: `linear-gradient(90deg, ${teamRgba(ev.team, 0.13)}, transparent)`,
              borderLeft: `3px solid ${col}`,
              animation: 'killIn .45s ease both',
            }}
          >
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: '#6f7b96', width: 40, flex: 'none' }}>{formatClock(ev.t)}</span>
            <Avatar name={killer.name} hue={killer.hue} profileIconId={killer.profileIconId} size={27} radius={7} fontSize={12} />
            <span style={{ fontSize: 12.5, color: '#dbe1ee', fontWeight: 500 }}>{killer.name}</span>
            <span style={{ fontSize: 15, color: col }}>⚔</span>
            <div style={{ filter: 'grayscale(.55)', opacity: 0.75 }}>
              <Avatar name={victim.name} hue={victim.hue} profileIconId={victim.profileIconId} size={27} radius={7} fontSize={12} />
            </div>
            <span style={{ fontSize: 12.5, color: '#8b93a7' }}>{victim.name} 처치</span>
            <span style={{ flex: 1 }} />
            {ev.multi && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#0b0f18',
                  background: 'linear-gradient(135deg,#e6c574,#c19a3f)',
                  padding: '2px 8px',
                  borderRadius: 5,
                  flex: 'none',
                }}
              >
                {ev.multi}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
