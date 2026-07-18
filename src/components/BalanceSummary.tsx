import type { Rates, Teams } from '../types';
import { POSITION_ORDER, posLabel } from '../lib/positions';

export function BalanceSummary({
  teams,
  rates,
  open,
  onToggle,
}: {
  teams: Teams;
  rates: Rates;
  open: boolean;
  onToggle: () => void;
}) {
  const maxS = Math.max(rates.bScore, rates.rScore) || 1;
  const sGap = Math.abs(rates.bScore - rates.rScore);
  const scoreVerdict =
    sGap < 40 ? `평균 MMR 차이 ${sGap}점 — 거의 동일` : `평균 MMR 차이 ${sGap}점 (${rates.bScore > rates.rScore ? '블루' : '레드'} 우세)`;

  const coverage = POSITION_ORDER.map((pos) => {
    const b = teams.blue.find((c) => c.pos === pos)!;
    const r = teams.red.find((c) => c.pos === pos)!;
    return {
      label: posLabel(pos),
      blueName: b.player.name,
      redName: r.player.name,
      blueDot: b.honored ? '#5aa9ff' : '#3a445e',
      redDot: r.honored ? '#f0656a' : '#3a445e',
    };
  });
  const honoredCount = [...teams.blue, ...teams.red].filter((c) => c.honored).length;
  const honoredPct = Math.round((honoredCount / 10) * 100);

  const maxF = Math.max(rates.bForm, rates.rForm) || 1;
  const formVerdict =
    Math.abs(rates.bForm - rates.rForm) < 3 ? '양 팀 최근 폼 대등' : `${rates.bForm > rates.rForm ? '블루' : '레드'}팀 최근 폼이 조금 더 좋음`;

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
        <div style={{ padding: '4px 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, animation: 'fadeUp .25s' }}>
          <div style={{ background: '#0b1120', border: '1px solid #1a2236', borderRadius: 11, padding: 15 }}>
            <div style={{ fontSize: 11.5, color: '#6f7b96', marginBottom: 12, letterSpacing: 0.3 }}>평균 티어 점수 (MMR)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, fontSize: 11, color: '#5aa9ff', fontWeight: 600 }}>BLUE</span>
                <div style={{ flex: 1, height: 7, background: '#131a29', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#5aa9ff', width: `${(rates.bScore / maxS) * 100}%` }} />
                </div>
                <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: '#dbe1ee', width: 44, textAlign: 'right' }}>
                  {rates.bScore}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 34, fontSize: 11, color: '#f0656a', fontWeight: 600 }}>RED</span>
                <div style={{ flex: 1, height: 7, background: '#131a29', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#f0656a', width: `${(rates.rScore / maxS) * 100}%` }} />
                </div>
                <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: '#dbe1ee', width: 44, textAlign: 'right' }}>
                  {rates.rScore}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: '#7f8aa3' }}>{scoreVerdict}</div>
          </div>

          <div style={{ background: '#0b1120', border: '1px solid #1a2236', borderRadius: 11, padding: 15 }}>
            <div style={{ fontSize: 11.5, color: '#6f7b96', marginBottom: 12, letterSpacing: 0.3 }}>포지션 커버리지</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {coverage.map((cv) => (
                <div key={cv.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 30, color: '#8b93a7' }}>{cv.label}</span>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: cv.blueDot }} />
                  <span style={{ flex: 1, color: '#b6c0d6', fontSize: 11 }}>{cv.blueName}</span>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: cv.redDot }} />
                  <span style={{ flex: 1, color: '#b6c0d6', fontSize: 11, textAlign: 'right' }}>{cv.redName}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: '#7f8aa3' }}>주포지션 배정 {honoredPct}% · 전 라인 충족</div>
          </div>

          <div style={{ background: '#0b1120', border: '1px solid #1a2236', borderRadius: 11, padding: 15 }}>
            <div style={{ fontSize: 11.5, color: '#6f7b96', marginBottom: 12, letterSpacing: 0.3 }}>최근 폼 비교</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 30, height: 92 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, justifyContent: 'flex-end', height: '100%' }}>
                <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: '#5aa9ff' }}>{rates.bForm}%</span>
                <div
                  style={{
                    width: 34,
                    background: 'linear-gradient(#5aa9ff, #2f5fb0)',
                    borderRadius: '5px 5px 0 0',
                    height: `${(rates.bForm / maxF) * 70}px`,
                  }}
                />
                <span style={{ fontSize: 11, color: '#5aa9ff', fontWeight: 600 }}>BLUE</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, justifyContent: 'flex-end', height: '100%' }}>
                <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: '#f0656a' }}>{rates.rForm}%</span>
                <div
                  style={{
                    width: 34,
                    background: 'linear-gradient(#f0656a, #b0353a)',
                    borderRadius: '5px 5px 0 0',
                    height: `${(rates.rForm / maxF) * 70}px`,
                  }}
                />
                <span style={{ fontSize: 11, color: '#f0656a', fontWeight: 600 }}>RED</span>
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 11.5, color: '#7f8aa3', textAlign: 'center' }}>{formVerdict}</div>
          </div>
        </div>
      )}
    </div>
  );
}
