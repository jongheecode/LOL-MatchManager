import type { ChampPicks } from '../lib/balance';
import { effectiveWr } from '../lib/balance';
import { tierFromScore } from '../lib/tier';
import { POSITION_ORDER, posLabel } from '../lib/positions';
import type { Rates, TeamEntry, Teams } from '../types';
import { teamColor } from '../lib/colors';

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function BalanceSummary({
  teams,
  rates,
  picks,
  open,
  onToggle,
}: {
  teams: Teams;
  rates: Rates;
  picks: ChampPicks;
  open: boolean;
  onToggle: () => void;
}) {
  const sgap = Math.abs(rates.bScore - rates.rScore);
  const fgap = Math.abs(rates.bForm - rates.rForm);
  const gap = Math.abs(rates.blue - rates.red);
  const honored = [...teams.blue, ...teams.red].filter((c) => c.honored).length;

  const summaryLines = [
    `양 팀 평균 티어는 블루 ${tierFromScore(rates.bScore).name} · 레드 ${tierFromScore(rates.rScore).name}로 ${
      sgap < 40 ? '사실상 동일한 실력대입니다' : rates.bScore > rates.rScore ? '블루가 근소하게 높습니다' : '레드가 근소하게 높습니다'
    }.`,
    `최근 전적 폼은 블루 ${rates.bForm}% · 레드 ${rates.rForm}%로 ${
      fgap < 3 ? '대등합니다' : rates.bForm > rates.rForm ? '블루가 살짝 상승세입니다' : '레드가 살짝 상승세입니다'
    }.`,
    `평균 KDA는 블루 ${rates.bKda.toFixed(2)} · 레드 ${rates.rKda.toFixed(2)}로, 승률 계산에 보조 지표로 반영됩니다.`,
    `스네이크 드래프트로 상위 실력자를 양 팀에 나눠 배치해 예상 승률 격차를 ${gap}%p로 맞췄습니다.`,
    `10명 중 ${honored}명이 주 포지션에 배정됐고, 전 라인이 빈틈없이 채워졌습니다.`,
  ];

  const lineMatchups = POSITION_ORDER.map((pos) => {
    const b = teams.blue.find((c) => c.pos === pos)!;
    const r = teams.red.find((c) => c.pos === pos)!;
    const strength = (c: TeamEntry) => c.player.score + (effectiveWr(c, picks) - 50) * 8;
    const p = 1 / (1 + Math.exp(-(strength(b) - strength(r)) / 300));
    const bluePct = clamp(Math.round(p * 100), 30, 70);
    const redPct = 100 - bluePct;
    const favorGap = Math.abs(bluePct - 50);
    const favorLabel = favorGap <= 4 ? '백중세' : bluePct > 50 ? '블루 우세' : '레드 우세';
    const favorColor = favorGap <= 4 ? '#d8b463' : bluePct > 50 ? teamColor('blue') : teamColor('red');
    return {
      pos,
      blueName: b.player.name,
      blueSub: `${tierFromScore(b.player.score).name} · 폼 ${b.player.form.wr}%`,
      redName: r.player.name,
      redSub: `${tierFromScore(r.player.score).name} · 폼 ${r.player.form.wr}%`,
      bluePct,
      redPct,
      favorLabel,
      favorColor,
    };
  });

  return (
    <div style={{ marginTop: 22, background: '#0f1524', border: '1px solid #1e2740', borderRadius: 14, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'transparent',
          border: 'none',
          color: '#e8ebf3',
          padding: '15px 20px',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <span>팀 밸런스 근거 요약</span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono'",
            color: '#8b93a7',
            transition: 'transform .2s',
            display: 'inline-block',
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div style={{ padding: '4px 20px 22px', animation: 'fadeUp .25s' }}>
          <div style={{ background: '#0b1120', border: '1px solid #1a2236', borderRadius: 11, padding: '15px 18px', marginBottom: 16 }}>
            {summaryLines.map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#c8cede', lineHeight: 1.6, marginTop: i === 0 ? 0 : 7 }}>
                <span style={{ color: '#d8b463', flex: 'none', fontSize: 9, marginTop: 5 }}>◆</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: '#6f7b96', margin: '0 2px 10px', letterSpacing: 0.3 }}>
            라인 상대 밸런스 <span style={{ color: '#55617a' }}>· 최근 전적 · 티어 기반 예상</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lineMatchups.map((m) => (
              <div
                key={m.pos}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 210px 1fr',
                  gap: 16,
                  alignItems: 'center',
                  background: '#0b1120',
                  border: '1px solid #1a2236',
                  borderRadius: 10,
                  padding: '10px 16px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#dbe1ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.blueName}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10.5, color: '#7f8aa3', marginTop: 2 }}>{m.blueSub}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#8b93a7', background: '#171f30', padding: '2px 7px', borderRadius: 5, letterSpacing: 0.5 }}>
                      {posLabel(m.pos)}
                    </span>
                    <span style={{ fontSize: 10.5, color: m.favorColor, fontWeight: 600, whiteSpace: 'nowrap' }}>{m.favorLabel}</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#131a29', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ height: '100%', background: teamColor('blue'), width: `${m.bluePct}%` }} />
                    <div style={{ height: '100%', flex: 1, background: teamColor('red') }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontFamily: "'IBM Plex Mono'", fontSize: 10 }}>
                    <span style={{ color: teamColor('blue') }}>{m.bluePct}%</span>
                    <span style={{ color: teamColor('red') }}>{m.redPct}%</span>
                  </div>
                </div>
                <div style={{ minWidth: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 13, color: '#dbe1ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.redName}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10.5, color: '#7f8aa3', marginTop: 2 }}>{m.redSub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
