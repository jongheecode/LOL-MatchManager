import type { Team } from '../../lib/colors';
import { teamColor } from '../../lib/colors';

export function VictoryBanner({ winner }: { winner: Team }) {
  const winnerColor = teamColor(winner);
  return (
    <div style={{ textAlign: 'center', margin: '26px 0 4px', animation: 'bannerIn .6s cubic-bezier(.2,1.3,.4,1) both' }}>
      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 15, letterSpacing: 8, color: '#8b93a7' }}>VICTORY</div>
      <div
        style={{
          fontFamily: 'Rajdhani',
          fontWeight: 700,
          fontSize: 56,
          letterSpacing: 2,
          color: winnerColor,
          textShadow: `0 0 34px ${winnerColor}`,
          lineHeight: 1.15,
        }}
      >
        {winner === 'blue' ? 'BLUE' : 'RED'} 팀 승리
      </div>
    </div>
  );
}
