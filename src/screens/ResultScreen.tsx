import type { AiAnalysis, ChampSummary, Rates, Teams } from '../types';
import type { ChampPicks, TeamSlotRef } from '../lib/balance';
import { topScore } from '../lib/balance';
import { Logo } from '../components/Logo';
import { WinGauge } from '../components/WinGauge';
import { ResultCard } from '../components/ResultCard';
import { BalanceSummary } from '../components/BalanceSummary';
import { teamRgba } from '../lib/colors';
import { AiAnalysisPanel } from '../components/AiAnalysisPanel';

export function ResultScreen({
  teams,
  rates,
  dragSrc,
  onDragStart,
  onDrop,
  onDragEnd,
  summaryOpen,
  onToggleSummary,
  champPicks,
  onSelectChamp,
  allChampions,
  onReshuffle,
  onCopy,
  onReset,
  onStartGame,
  teamOrigin,
  aiStatus,
  aiAnalysis,
  onAiMatch,
  onAiReanalyze,
}: {
  teams: Teams;
  rates: Rates;
  dragSrc: TeamSlotRef | null;
  onDragStart: (ref: TeamSlotRef) => void;
  onDrop: (ref: TeamSlotRef) => void;
  onDragEnd: () => void;
  summaryOpen: boolean;
  onToggleSummary: () => void;
  champPicks: ChampPicks;
  onSelectChamp: (puuid: string, champ: ChampSummary | null) => void;
  allChampions: ChampSummary[];
  onReshuffle: () => void;
  onCopy: () => void;
  onReset: () => void;
  onStartGame: () => void;
  teamOrigin: 'algo' | 'ai';
  aiStatus: 'idle' | 'loading' | 'fresh' | 'stale';
  aiAnalysis: AiAnalysis | null;
  onAiMatch: () => void;
  onAiReanalyze: () => void;
}) {
  const gap = Math.abs(rates.blue - rates.red);
  const verdict =
    gap <= 10 ? '⚖ 매우 균형 잡힌 매치 — 백중세 예상' : gap <= 25 ? '살짝 기울지만 해볼 만한 매치' : '한쪽이 다소 유리 — 스왑으로 조정해 보세요';

  const blueTop = topScore(teams.blue);
  const redTop = topScore(teams.red);

  const aiMode = teamOrigin === 'ai';
  const aiFresh = aiMode && aiStatus === 'fresh' && !!aiAnalysis;
  const aiLoading = aiStatus === 'loading';

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '26px 40px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo size={34} fontSize={17} />
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 20, letterSpacing: 0.5 }}>매칭 결과</div>
        </div>
        <div style={{ fontSize: 12, color: '#6f7b96' }}>
          카드 <span style={{ color: '#d8b463' }}>드래그</span>로 팀 스왑 · 챔피언 아이콘을 눌러 <span style={{ color: '#d8b463' }}>이번 판 픽</span> 지정 — 승률에 실시간 반영
        </div>
      </div>

      <WinGauge rates={rates} verdict={verdict} showBreakdown={!aiFresh} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 54px 1fr', gap: 0, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {teams.blue.map((entry, idx) => {
            const ref: TeamSlotRef = { team: 'blue', idx };
            return (
              <ResultCard
                key={entry.pos}
                entry={entry}
                team="blue"
                isTop={entry.player.score === blueTop}
                dragging={dragSrc?.team === 'blue' && dragSrc.idx === idx}
                allChampions={allChampions}
                selectedChamp={champPicks[entry.player.puuid] ?? null}
                onSelectChamp={(champ) => onSelectChamp(entry.player.puuid, champ)}
                onDragStart={() => onDragStart(ref)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(ref)}
                onDragEnd={onDragEnd}
              />
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 100, gap: 12 }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 22, color: '#4a5573' }}>VS</div>
          <div style={{ width: 1, flex: 1, background: `linear-gradient(${teamRgba('blue', 0.2)}, #2a3350, ${teamRgba('red', 0.2)})`, minHeight: 200 }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {teams.red.map((entry, idx) => {
            const ref: TeamSlotRef = { team: 'red', idx };
            return (
              <ResultCard
                key={entry.pos}
                entry={entry}
                team="red"
                isTop={entry.player.score === redTop}
                dragging={dragSrc?.team === 'red' && dragSrc.idx === idx}
                allChampions={allChampions}
                selectedChamp={champPicks[entry.player.puuid] ?? null}
                onSelectChamp={(champ) => onSelectChamp(entry.player.puuid, champ)}
                onDragStart={() => onDragStart(ref)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(ref)}
                onDragEnd={onDragEnd}
              />
            );
          })}
        </div>
      </div>

      {aiMode && aiAnalysis ? (
        <AiAnalysisPanel
          analysis={aiAnalysis.analysis}
          laneMatchups={aiAnalysis.laneMatchups}
          stale={aiStatus === 'stale'}
          loading={aiLoading}
          onReanalyze={onAiReanalyze}
          open={summaryOpen}
          onToggle={onToggleSummary}
        />
      ) : (
        <BalanceSummary teams={teams} rates={rates} picks={champPicks} open={summaryOpen} onToggle={onToggleSummary} />
      )}

      <div style={{ marginTop: 22, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onReshuffle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#151c2d',
            border: '1px solid #2a3350',
            color: '#dbe1ee',
            padding: '13px 22px',
            borderRadius: 11,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          다시 짜기
        </button>
        <button
          type="button"
          onClick={onCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#151c2d',
            border: '1px solid #2a3350',
            color: '#dbe1ee',
            padding: '13px 22px',
            borderRadius: 11,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          결과 복사 (디스코드용)
        </button>
        <button
          type="button"
          onClick={aiMode && aiStatus === 'stale' ? onAiReanalyze : onAiMatch}
          disabled={aiLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: aiLoading ? '#20203a' : 'linear-gradient(140deg, #b79cff, #7d63c4)',
            border: 'none',
            color: aiLoading ? '#8b93a7' : '#0b0f18',
            padding: '13px 22px',
            borderRadius: 11,
            fontSize: 14,
            fontWeight: 700,
            cursor: aiLoading ? 'default' : 'pointer',
          }}
        >
          {aiLoading ? 'AI 분석 중…' : aiMode && aiStatus === 'stale' ? '🔄 AI 재분석' : '✨ AI로 짜기'}
        </button>
        <button
          type="button"
          onClick={onStartGame}
          disabled={aiLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: aiLoading ? '#3a3526' : 'linear-gradient(140deg, #e6c574, #c19a3f)',
            border: 'none',
            color: aiLoading ? '#8b8368' : '#0b0f18',
            padding: '14px 34px',
            borderRadius: 11,
            fontSize: 15.5,
            fontWeight: 700,
            cursor: aiLoading ? 'default' : 'pointer',
            boxShadow: aiLoading ? 'none' : '0 8px 26px rgba(216,180,99,.25)',
            fontFamily: "'Rajdhani','Noto Sans KR'",
            letterSpacing: 0.5,
          }}
        >
          게임 시작 ▶
        </button>
        <button
          type="button"
          onClick={onReset}
          style={{ background: 'transparent', border: 'none', color: '#6f7b96', padding: '13px 10px', fontSize: 13, cursor: 'pointer' }}
        >
          처음으로
        </button>
      </div>
    </div>
  );
}
