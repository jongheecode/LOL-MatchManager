import type { ChampSummary, TeamEntry } from '../../types';
import type { Team } from '../../lib/colors';
import { teamColor, teamRgba } from '../../lib/colors';
import { ChampIcon } from '../ChampIcon';
import { posLabel } from '../../lib/positions';

export function TeamDraftBoard({
  team,
  entries,
  bans,
  banSlots,
  picks,
  activeBan,
  activePosIndex,
}: {
  team: Team;
  entries: TeamEntry[];
  bans: ChampSummary[];
  banSlots: number;
  picks: Record<string, ChampSummary>;
  activeBan: boolean;
  activePosIndex: number | null;
}) {
  const accent = teamColor(team);

  return (
    <div style={{ background: teamRgba(team, 0.05), border: `1px solid ${teamRgba(team, 0.22)}`, borderRadius: 13, padding: '14px 16px', flex: 1 }}>
      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: 2, color: accent, marginBottom: 10 }}>
        {team === 'blue' ? 'BLUE' : 'RED'}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {Array.from({ length: banSlots }).map((_, i) => {
          const champ = bans[i];
          const isNext = activeBan && i === bans.length;
          return (
            <div
              key={i}
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: champ ? 'transparent' : '#0e1524',
                border: `1px dashed ${isNext ? accent : '#2a3350'}`,
                animation: isNext ? 'pulse 1.6s ease-in-out infinite' : undefined,
                opacity: champ ? 0.55 : 1,
                filter: champ ? 'grayscale(1)' : undefined,
              }}
            >
              {champ && <ChampIcon champ={champ} size={26} />}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map((entry, i) => {
          const champ = picks[entry.player.puuid];
          const isActive = activePosIndex === i;
          return (
            <div
              key={entry.pos}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 10px',
                borderRadius: 9,
                background: isActive ? teamRgba(team, 0.13) : '#0b1120',
                border: `1px solid ${isActive ? accent : '#1a2236'}`,
                animation: isActive ? 'pulse 1.6s ease-in-out infinite' : undefined,
              }}
            >
              <span style={{ fontSize: 9.5, color: '#6f7b96', width: 26, flex: 'none' }}>{posLabel(entry.pos)}</span>
              <span
                style={{
                  fontSize: 12.5,
                  color: '#dbe1ee',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {entry.player.name}
              </span>
              {champ ? (
                <>
                  <span style={{ fontSize: 11, color: '#8b93a7' }}>{champ.name}</span>
                  <ChampIcon champ={champ} size={26} />
                </>
              ) : (
                <span style={{ width: 26, height: 26, borderRadius: '50%', border: '1px dashed #2a3350', flex: 'none' }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
