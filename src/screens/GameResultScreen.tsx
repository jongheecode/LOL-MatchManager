import { useEffect, useMemo, useRef, useState } from 'react';
import type { GameResult, Teams } from '../types';
import { Logo } from '../components/Logo';
import { Avatar } from '../components/Avatar';
import { ChampIcon } from '../components/ChampIcon';
import { posLabel } from '../lib/positions';
import { kdaRatio, formatClock } from '../lib/gameSim';

const COLS = '28px 1fr 34px 34px 34px 50px 50px 56px 90px';

function playerIndex(teams: Teams) {
  const map = new Map<string, { name: string; hue: number; profileIconId: number | null; team: 'blue' | 'red' }>();
  (['blue', 'red'] as const).forEach((team) => {
    for (const e of teams[team]) map.set(e.player.puuid, { name: e.player.name, hue: e.player.hue, profileIconId: e.player.profileIconId, team });
  });
  return map;
}

function KillFeed({ teams, result }: { teams: Teams; result: GameResult }) {
  const index = useMemo(() => playerIndex(teams), [teams]);
  const statsByPuuid = useMemo(() => new Map(result.stats.map((s) => [s.puuid, s])), [result.stats]);
  const [visible, setVisible] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setInterval>>();

  const play = () => {
    setVisible(0);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setVisible((v) => {
        if (v >= result.events.length) {
          clearInterval(timer.current);
          return v;
        }
        return v + 1;
      });
    }, 420);
  };

  useEffect(() => {
    play();
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [visible]);

  const done = visible >= result.events.length;

  return (
    <div style={{ background: '#0f1524', border: '1px solid #1e2740', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: '1px solid #1e2740' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#e8ebf3' }}>킬 피드</span>
        {!done && <span style={{ fontSize: 10.5, color: '#d8b463', animation: 'pulse 1.2s infinite' }}>재생 중...</span>}
        {done && (
          <button
            type="button"
            onClick={play}
            style={{ background: 'transparent', border: '1px solid #2a3350', color: '#8b93a7', fontSize: 10.5, padding: '3px 9px', borderRadius: 6, cursor: 'pointer' }}
          >
            다시보기
          </button>
        )}
      </div>
      <div ref={feedRef} style={{ maxHeight: 220, overflowY: 'auto', padding: '8px 14px' }}>
        {result.events.slice(0, visible).map((ev, i) => {
          const killer = index.get(ev.killerPuuid);
          const victim = index.get(ev.victimPuuid);
          const killerChamp = statsByPuuid.get(ev.killerPuuid)?.champ;
          const victimChamp = statsByPuuid.get(ev.victimPuuid)?.champ;
          const accent = ev.team === 'blue' ? '#5aa9ff' : '#f0656a';
          if (!killer || !victim || !killerChamp || !victimChamp) return null;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 8px',
                marginBottom: 4,
                borderRadius: 8,
                borderLeft: `2px solid ${accent}`,
                background: '#0b1120',
                animation: 'fadeUp .3s',
                fontSize: 11.5,
              }}
            >
              <span style={{ fontFamily: "'IBM Plex Mono'", color: '#6f7b96', flex: 'none', width: 38 }}>{formatClock(ev.t)}</span>
              <ChampIcon champ={killerChamp} size={18} />
              <span style={{ color: accent, fontWeight: 600, whiteSpace: 'nowrap' }}>{killer.name}</span>
              <span style={{ color: '#4a5573' }}>⚔</span>
              <ChampIcon champ={victimChamp} size={18} />
              <span style={{ color: '#8b93a7', whiteSpace: 'nowrap' }}>{victim.name}</span>
              {ev.assistPuuids.length > 0 && (
                <span style={{ color: '#55617a', fontSize: 10.5, marginLeft: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  어시스트 {ev.assistPuuids.map((a) => index.get(a)?.name).filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamTable({ teams, team, result }: { teams: Teams; team: 'blue' | 'red'; result: GameResult }) {
  const accent = team === 'blue' ? '#5aa9ff' : '#f0656a';
  const won = result.winner === team;
  const rows = teams[team];
  const teamKills = team === 'blue' ? result.blueKills : result.redKills;
  // A team's total deaths is exactly the *other* team's total kills — every kill has one death,
  // no self-inflicted ones — so this always cross-checks against the opposing team's kill number.
  const teamDeaths = rows.reduce((a, e) => a + (result.stats.find((s) => s.puuid === e.player.puuid)?.deaths ?? 0), 0);
  const maxDamage = Math.max(...result.stats.map((s) => s.damage));

  return (
    <div style={{ background: '#0f1524', border: `1px solid ${won ? `${accent}55` : '#1e2740'}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: won ? `${accent}14` : 'transparent' }}>
        <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 14, letterSpacing: 2, color: accent }}>{team === 'blue' ? 'BLUE' : 'RED'}</span>
        <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, color: '#8b93a7' }}>
          킬 <span style={{ color: accent, fontWeight: 700 }}>{teamKills}</span> · 데스 <span style={{ color: '#f0797d', fontWeight: 700 }}>{teamDeaths}</span>
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: won ? accent : '#55617a' }}>{won ? '승리' : '패배'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 6, padding: '6px 16px', fontSize: 10, color: '#55617a' }}>
        <span />
        <span>플레이어 / 챔피언</span>
        <span style={{ textAlign: 'center' }}>K</span>
        <span style={{ textAlign: 'center' }}>D</span>
        <span style={{ textAlign: 'center' }}>A</span>
        <span style={{ textAlign: 'center' }}>KDA</span>
        <span style={{ textAlign: 'right' }}>CS</span>
        <span style={{ textAlign: 'right' }}>골드</span>
        <span style={{ textAlign: 'right' }}>딜량</span>
      </div>
      {rows.map((entry) => {
        const stat = result.stats.find((s) => s.puuid === entry.player.puuid)!;
        const isMvp = stat.puuid === result.mvpPuuid;
        const ratio = kdaRatio(stat);
        return (
          <div
            key={entry.pos}
            style={{
              display: 'grid',
              gridTemplateColumns: COLS,
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderTop: '1px solid #16203380',
              background: isMvp ? 'rgba(216,180,99,.06)' : 'transparent',
            }}
          >
            <span style={{ fontSize: 10, color: '#6f7b96' }}>{posLabel(entry.pos)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <Avatar name={entry.player.name} hue={entry.player.hue} profileIconId={entry.player.profileIconId} size={28} radius={7} fontSize={12} />
              <ChampIcon champ={stat.champ} size={20} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#dbe1ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isMvp && <span title="MVP">👑</span>}
                  {entry.player.name}
                </div>
                <div style={{ fontSize: 10, color: '#7f8aa3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stat.champ.name}</div>
              </div>
            </div>
            <span style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono'", fontSize: 13, color: '#dbe1ee' }}>{stat.kills}</span>
            <span style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono'", fontSize: 13, color: '#f0797d' }}>{stat.deaths}</span>
            <span style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono'", fontSize: 13, color: '#dbe1ee' }}>{stat.assists}</span>
            <span style={{ textAlign: 'center', fontFamily: "'IBM Plex Mono'", fontSize: 12, fontWeight: 700, color: ratio >= 4 ? '#4fd18a' : ratio >= 2 ? '#c8cede' : '#f0797d' }}>
              {ratio.toFixed(1)}
            </span>
            <span style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono'", fontSize: 12, color: '#8b93a7' }}>{stat.cs}</span>
            <span style={{ textAlign: 'right', fontFamily: "'IBM Plex Mono'", fontSize: 11.5, color: '#d8b463' }}>{(stat.gold / 1000).toFixed(1)}k</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ flex: 1, height: 5, background: '#131a29', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(stat.damage / maxDamage) * 100}%`, background: accent, borderRadius: 3 }} />
              </div>
              <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: '#8b93a7', width: 30, textAlign: 'right' }}>{Math.round(stat.damage / 1000)}k</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function GameResultScreen({
  teams,
  result,
  onResimulate,
  onBackToResult,
  onReset,
}: {
  teams: Teams;
  result: GameResult;
  onResimulate: () => void;
  onBackToResult: () => void;
  onReset: () => void;
}) {
  const accent = result.winner === 'blue' ? '#5aa9ff' : '#f0656a';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 40px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Logo size={34} fontSize={17} />
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 20, letterSpacing: 0.5 }}>게임 결과</div>
        <span style={{ fontSize: 11, color: '#55617a' }}>(재미로 보는 가상 시뮬레이션)</span>
      </div>

      <div
        style={{
          textAlign: 'center',
          padding: '26px 20px',
          marginBottom: 22,
          borderRadius: 16,
          background: `linear-gradient(160deg, ${accent}22, #0d1220)`,
          border: `1px solid ${accent}55`,
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: 3, color: accent, fontWeight: 700, marginBottom: 6 }}>
          {result.winner === 'blue' ? 'BLUE TEAM' : 'RED TEAM'}
        </div>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 40, color: '#eef2fb', letterSpacing: 2 }}>VICTORY</div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 14, marginTop: 10 }}>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 22, fontWeight: 600, color: '#5aa9ff' }}>{result.blueKills}</span>
          <span style={{ fontSize: 12, color: '#55617a' }}>KILLS</span>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 22, fontWeight: 600, color: '#f0656a' }}>{result.redKills}</span>
          <span style={{ fontSize: 12, color: '#55617a', marginLeft: 12 }}>{formatClock(result.durationSec)} 경기 시간</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <KillFeed teams={teams} result={result} />
        <TeamTable teams={teams} team="blue" result={result} />
        <TeamTable teams={teams} team="red" result={result} />
      </div>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onResimulate}
          style={{ background: '#151c2d', border: '1px solid #2a3350', color: '#dbe1ee', padding: '13px 22px', borderRadius: 11, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
        >
          다시 시뮬레이션
        </button>
        <button
          type="button"
          onClick={onBackToResult}
          style={{ background: 'linear-gradient(140deg, #e6c574, #c19a3f)', border: 'none', color: '#0b0f18', padding: '13px 24px', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          매칭 결과로 돌아가기
        </button>
        <button
          type="button"
          onClick={onReset}
          style={{ background: 'transparent', border: '1px solid #2a3350', color: '#8b93a7', padding: '13px 22px', borderRadius: 11, fontSize: 14, cursor: 'pointer' }}
        >
          처음으로
        </button>
      </div>
    </div>
  );
}
