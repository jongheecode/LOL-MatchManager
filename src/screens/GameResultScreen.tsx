import { useEffect, useRef, useState } from 'react';
import type { GameResult, Teams } from '../types';
import { Avatar } from '../components/Avatar';
import { ChampIcon } from '../components/ChampIcon';
import { posLabel } from '../lib/positions';
import { kdaRatio, formatClock } from '../lib/gameSim';
import { teamColor, teamDarkRgba, teamRgba } from '../lib/colors';

const TICK_MS = 360;
const BANNER_DELAY_MS = 450;
const BOARD_DELAY_MS = 1600;

function playerIndex(teams: Teams) {
  const map = new Map<string, { name: string; hue: number; profileIconId: number | null; team: 'blue' | 'red' }>();
  (['blue', 'red'] as const).forEach((team) => {
    for (const e of teams[team]) map.set(e.player.puuid, { name: e.player.name, hue: e.player.hue, profileIconId: e.player.profileIconId, team });
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
  const winnerColor = teamColor(result.winner);

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '26px 40px 44px' }}>
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
        경기 시간 <span style={{ color: '#d8b463' }}>{formatClock(clock)}</span> / {formatClock(result.durationSec)}
      </div>

      {/* timeline */}
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
            left: `${((clock / result.durationSec) * 100).toFixed(2)}%`,
          }}
        />
        {result.events.map((ev, i) => {
          const revealed = i < revealedCount;
          const col = teamColor(ev.team);
          const size = revealed ? 9 : 6;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: `${((ev.t / result.durationSec) * 100).toFixed(2)}%`,
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

      {/* kill feed */}
      <div style={{ background: '#0c1220', border: '1px solid #1a2236', borderRadius: 14, padding: '12px 16px 16px', height: 296, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        {shown.map((ev, i) => {
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

      {showBanner && (
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
            {result.winner === 'blue' ? 'BLUE' : 'RED'} 팀 승리
          </div>
        </div>
      )}

      {showBoard && (
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, animation: 'fadeUp .4s both' }}>
          {(['blue', 'red'] as const).map((team) => {
            const accent = teamColor(team);
            const bg = teamDarkRgba(team, 0.1);
            const headerBg = teamRgba(team, 0.07);
            const border = teamRgba(team, 0.22);
            return (
              <div key={team} style={{ background: `linear-gradient(160deg, ${bg}, #0d1220)`, border: `1px solid ${border}`, borderRadius: 13, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 15px', background: headerBg }}>
                  <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: 2, color: accent }}>{team === 'blue' ? 'BLUE TEAM' : 'RED TEAM'}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: '#6f7b96' }}>KDA · CS · 골드</span>
                </div>
                {teams[team].map((entry) => {
                  const stat = statsByPuuid.get(entry.player.puuid)!;
                  const isMvp = stat.puuid === result.mvpPuuid;
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
          })}
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
