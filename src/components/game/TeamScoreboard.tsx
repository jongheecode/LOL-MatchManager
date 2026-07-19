import type { PlayerGameStat, TeamEntry } from '../../types';
import type { Team } from '../../lib/colors';
import { ChampIcon } from '../ChampIcon';
import { posLabel } from '../../lib/positions';
import { kdaRatio } from '../../lib/gameSim';
import { teamColor, teamDarkRgba, teamRgba } from '../../lib/colors';

export function TeamScoreboard({
  team,
  entries,
  statsByPuuid,
  maxDamage,
  mvpPuuid,
}: {
  team: Team;
  entries: TeamEntry[];
  statsByPuuid: Map<string, PlayerGameStat>;
  maxDamage: number;
  mvpPuuid: string;
}) {
  const accent = teamColor(team);
  const bg = teamDarkRgba(team, 0.1);
  const headerBg = teamRgba(team, 0.07);
  const border = teamRgba(team, 0.22);

  return (
    <div style={{ background: `linear-gradient(160deg, ${bg}, #0d1220)`, border: `1px solid ${border}`, borderRadius: 13, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 15px', background: headerBg }}>
        <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: 2, color: accent }}>{team === 'blue' ? 'BLUE TEAM' : 'RED TEAM'}</span>
        <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: '#6f7b96' }}>KDA · CS · 골드</span>
      </div>
      {entries.map((entry) => {
        const stat = statsByPuuid.get(entry.player.puuid)!;
        const isMvp = stat.puuid === mvpPuuid;
        const ratio = kdaRatio(stat);
        return (
          <div key={entry.pos} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px', borderTop: '1px solid #131b2c' }}>
            <ChampIcon champ={stat.champ} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 12.5, color: '#e8ebf3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 108 }}>
                  {entry.player.name}
                </span>
                {isMvp && (
                  <span
                    style={{
                      fontSize: 8.5,
                      fontWeight: 700,
                      color: '#0b0f18',
                      background: 'linear-gradient(135deg,#e6c574,#c19a3f)',
                      padding: '1px 6px',
                      borderRadius: 4,
                      letterSpacing: 0.5,
                    }}
                  >
                    MVP
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                <span style={{ fontSize: 9, color: '#6f7b96', width: 28, flex: 'none' }}>{posLabel(entry.pos)}</span>
                <div style={{ flex: 1, height: 5, background: '#131a29', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, width: `${(stat.damage / maxDamage) * 100}%`, background: accent }} />
                </div>
                <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: '#8b93a7', width: 50, textAlign: 'right', flex: 'none' }}>
                  {stat.damage.toLocaleString()}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: 'none', width: 62 }}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: '#dbe1ee' }}>
                {stat.kills}/{stat.deaths}/{stat.assists}
              </div>
              <div style={{ fontSize: 9, color: '#6f7b96' }}>KDA {ratio.toFixed(1)}</div>
            </div>
            <div style={{ textAlign: 'right', flex: 'none', width: 58 }}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, color: '#d8b463' }}>{stat.gold.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: '#6f7b96' }}>{stat.cs} CS</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
