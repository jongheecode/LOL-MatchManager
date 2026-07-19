import { useEffect, useRef, useState } from 'react';
import type { GameResult, Teams } from '../types';
import { ScoreHeader } from '../components/game/ScoreHeader';
import { KillTimeline } from '../components/game/KillTimeline';
import { KillFeed } from '../components/game/KillFeed';
import { VictoryBanner } from '../components/game/VictoryBanner';
import { TeamScoreboard } from '../components/game/TeamScoreboard';

const TICK_MS = 360;
const BANNER_DELAY_MS = 450;
const BOARD_DELAY_MS = 1600;

function playerIndex(teams: Teams) {
  const map = new Map<string, { name: string; hue: number; profileIconId: number | null }>();
  (['blue', 'red'] as const).forEach((team) => {
    for (const e of teams[team]) map.set(e.player.puuid, { name: e.player.name, hue: e.player.hue, profileIconId: e.player.profileIconId });
  });
  return map;
}

export function GameResultScreen({
  teams,
  result,
  onBackToResult,
  onReset,
}: {
  teams: Teams;
  result: GameResult;
  onBackToResult: () => void;
  onReset: () => void;
}) {
  const index = playerIndex(teams);
  const statsByPuuid = new Map(result.stats.map((s) => [s.puuid, s]));
  const maxDamage = Math.max(1, ...result.stats.map((s) => s.damage));

  const [revealedCount, setRevealedCount] = useState(0);
  const [showBanner, setShowBanner] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const runSim = () => {
    clearInterval(timer.current);
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setRevealedCount(0);
    setShowBanner(false);
    setShowBoard(false);
    timer.current = setInterval(() => {
      setRevealedCount((c) => {
        if (c >= result.events.length) {
          clearInterval(timer.current);
          timeouts.current.push(setTimeout(() => setShowBanner(true), BANNER_DELAY_MS));
          timeouts.current.push(setTimeout(() => setShowBoard(true), BOARD_DELAY_MS));
          return c;
        }
        return c + 1;
      });
    }, TICK_MS);
  };

  useEffect(() => {
    runSim();
    return () => {
      clearInterval(timer.current);
      timeouts.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const shown = result.events.slice(0, revealedCount);
  const blueScore = shown.filter((e) => e.team === 'blue').length;
  const redScore = shown.filter((e) => e.team === 'red').length;
  const lastT = revealedCount > 0 ? shown[revealedCount - 1].t : 0;
  const clock = showBoard ? result.durationSec : lastT;

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 40px 44px' }}>
      <ScoreHeader blueScore={blueScore} redScore={redScore} clock={clock} durationSec={result.durationSec} />
      <KillTimeline events={result.events} revealedCount={revealedCount} clock={clock} durationSec={result.durationSec} />
      <KillFeed events={shown} index={index} />

      {showBanner && <VictoryBanner winner={result.winner} />}

      {showBoard && (
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, animation: 'fadeUp .4s both' }}>
          {(['blue', 'red'] as const).map((team) => (
            <TeamScoreboard
              key={team}
              team={team}
              entries={teams[team]}
              statsByPuuid={statsByPuuid}
              maxDamage={maxDamage}
              mvpPuuid={result.mvpPuuid}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={runSim}
          style={{ background: '#151c2d', border: '1px solid #2a3350', color: '#dbe1ee', padding: '13px 22px', borderRadius: 11, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          다시 보기
        </button>
        <button
          type="button"
          onClick={onBackToResult}
          style={{ background: 'linear-gradient(140deg, #e6c574, #c19a3f)', border: 'none', color: '#0b0f18', padding: '13px 26px', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          결과 화면으로
        </button>
        <button type="button" onClick={onReset} style={{ background: 'transparent', border: 'none', color: '#6f7b96', padding: '13px 10px', fontSize: 13, cursor: 'pointer' }}>
          처음으로
        </button>
      </div>
    </div>
  );
}
