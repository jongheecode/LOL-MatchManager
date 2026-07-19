import type { AiLaneMatchup } from '../types';
import { posLabel } from '../lib/positions';

const FAVOR = {
  blue: { label: '블루 우세', color: '#5aa9ff' },
  red: { label: '레드 우세', color: '#f0656a' },
  even: { label: '백중세', color: '#d8b463' },
} as const;

export function AiAnalysisPanel({
  analysis,
  laneMatchups,
  stale,
  loading,
  onReanalyze,
  open,
  onToggle,
}: {
  analysis: string;
  laneMatchups: AiLaneMatchup[];
  stale: boolean;
  loading: boolean;
  onReanalyze: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{ marginTop: 22, background: '#0f1524', border: '1px solid #2a2340', borderRadius: 14, overflow: 'hidden' }}>
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              color: '#0b0f18',
              background: 'linear-gradient(140deg, #b79cff, #8f7bd0)',
              padding: '3px 8px',
              borderRadius: 6,
              letterSpacing: 0.4,
            }}
          >
            🤖 AI 모드
          </span>
          AI 팀 밸런스 분석
        </span>
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
          {stale && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: '#241c10',
                border: '1px solid #4a3a18',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 14,
                fontSize: 12.5,
                color: '#e0c07a',
              }}
            >
              <span>팀이 변경되어 아래 AI 분석이 현재 구성과 다를 수 있습니다. 승률은 알고리즘 값으로 표시 중입니다.</span>
              <button
                type="button"
                onClick={onReanalyze}
                disabled={loading}
                style={{
                  flex: 'none',
                  background: loading ? '#2a2a2a' : 'linear-gradient(140deg, #b79cff, #8f7bd0)',
                  border: 'none',
                  color: loading ? '#888' : '#0b0f18',
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: loading ? 'default' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {loading ? 'AI 분석 중…' : '🔄 AI 재분석'}
              </button>
            </div>
          )}
          <div
            style={{
              background: '#0b1120',
              border: '1px solid #1a2236',
              borderRadius: 11,
              padding: '15px 18px',
              marginBottom: 16,
              fontSize: 13,
              color: '#c8cede',
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
            }}
          >
            {analysis}
          </div>
          <div style={{ fontSize: 11.5, color: '#6f7b96', margin: '0 2px 10px', letterSpacing: 0.3 }}>
            라인별 매치업 <span style={{ color: '#55617a' }}>· AI 분석</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {laneMatchups.map((m) => {
              const f = FAVOR[m.favored];
              return (
                <div
                  key={m.pos}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '96px 1fr',
                    gap: 14,
                    alignItems: 'center',
                    background: '#0b1120',
                    border: '1px solid #1a2236',
                    borderRadius: 10,
                    padding: '10px 16px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span
                      style={{ fontSize: 10, fontWeight: 700, color: '#8b93a7', background: '#171f30', padding: '2px 7px', borderRadius: 5, letterSpacing: 0.5, width: 'fit-content' }}
                    >
                      {posLabel(m.pos)}
                    </span>
                    <span style={{ fontSize: 11, color: f.color, fontWeight: 600 }}>{f.label}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#c8cede', lineHeight: 1.55 }}>{m.note}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
