import { formatClock } from '../../lib/gameSim';
import { teamColor } from '../../lib/colors';

export function ScoreHeader({
  blueScore,
  redScore,
  clock,
  durationSec,
}: {
  blueScore: number;
  redScore: number;
  clock: number;
  durationSec: number;
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, marginBottom: 6 }}>
        <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 15, letterSpacing: 3, color: teamColor('blue') }}>BLUE</span>
        <span style={{ fontFamily: "'IBM Plex Mono'", fontWeight: 600, fontSize: 52, color: teamColor('blue'), lineHeight: 1, minWidth: 60, textAlign: 'right' }}>
          {blueScore}
        </span>
        <span style={{ fontFamily: 'Rajdhani', fontSize: 26, color: '#4a5573' }}>:</span>
        <span style={{ fontFamily: "'IBM Plex Mono'", fontWeight: 600, fontSize: 52, color: teamColor('red'), lineHeight: 1, minWidth: 60 }}>{redScore}</span>
        <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 15, letterSpacing: 3, color: teamColor('red') }}>RED</span>
      </div>
      <div style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono'", fontSize: 13, color: '#8b93a7', marginBottom: 18 }}>
        경기 시간 <span style={{ color: '#d8b463' }}>{formatClock(clock)}</span> / {formatClock(durationSec)}
      </div>
    </>
  );
}
