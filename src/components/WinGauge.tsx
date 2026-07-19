import type { Rates } from '../types';

export function WinGauge({ rates, verdict, showBreakdown = true }: { rates: Rates; verdict: string; showBreakdown?: boolean }) {
  const { blue, red, breakdown, bKda, rKda } = rates;
  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #121826, #0d1220)',
        border: '1px solid #222b42',
        borderRadius: 16,
        padding: '20px 26px',
        marginBottom: 22,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 15, letterSpacing: 2, color: '#5aa9ff' }}>BLUE</span>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontWeight: 600, fontSize: 34, color: '#5aa9ff', lineHeight: 1 }}>{blue}%</span>
        </div>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 600, fontSize: 13, color: '#6f7b96', letterSpacing: 3, paddingBottom: 4 }}>
          예상 승률
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: "'IBM Plex Mono'", fontWeight: 600, fontSize: 34, color: '#f0656a', lineHeight: 1 }}>{red}%</span>
          <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 15, letterSpacing: 2, color: '#f0656a' }}>RED</span>
        </div>
      </div>
      <div style={{ height: 16, borderRadius: 9, overflow: 'hidden', display: 'flex', background: '#0d1220', border: '1px solid #1e2740' }}>
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #2f5fb0, #5aa9ff)',
            transition: 'width .5s cubic-bezier(.4,1.2,.4,1)',
            width: `${blue}%`,
          }}
        />
        <div style={{ height: '100%', flex: 1, background: 'linear-gradient(90deg, #f0656a, #b0353a)' }} />
      </div>
      <div style={{ textAlign: 'center', marginTop: 11, fontSize: 12.5, color: '#8b93a7' }}>{verdict}</div>
      {showBreakdown ? (
        <div
          style={{
            marginTop: 12,
            paddingTop: 11,
            borderTop: '1px solid #1a2236',
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '4px 16px',
            fontSize: 11,
            color: '#6f7b96',
          }}
        >
          <span>
            근거 분해 (블루 기준) — MMR만 <b style={{ color: '#b6c0d6' }}>{breakdown.scoreOnlyPct}%</b> · 최근 폼만{' '}
            <b style={{ color: '#b6c0d6' }}>{breakdown.formOnlyPct}%</b> · 평균 KDA만{' '}
            <b style={{ color: '#b6c0d6' }}>{breakdown.kdaOnlyPct}%</b> → 종합 <b style={{ color: '#d8b463' }}>{blue}%</b>
          </span>
          <span>
            평균 KDA 블루 <b style={{ color: '#5aa9ff' }}>{bKda.toFixed(2)}</b> · 레드 <b style={{ color: '#f0656a' }}>{rKda.toFixed(2)}</b>
          </span>
        </div>
      ) : (
        <div style={{ marginTop: 12, paddingTop: 11, borderTop: '1px solid #1a2236', textAlign: 'center', fontSize: 11, color: '#8f7bd0' }}>
          🤖 AI가 예측한 승률입니다 — 아래 AI 분석에서 근거를 확인하세요
        </div>
      )}
    </div>
  );
}
