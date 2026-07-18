import type { ChampSummary, Rates, Teams } from '../types';
import type { ChampPicks, TeamSlotRef } from '../lib/balance';
import { topScore } from '../lib/balance';
import { Logo } from '../components/Logo';
import { WinGauge } from '../components/WinGauge';
import { ResultCard } from '../components/ResultCard';
import { BalanceSummary } from '../components/BalanceSummary';
import { DraftPanel } from '../components/DraftPanel';

export function ResultScreen({
  teams,
  rates,
  dragSrc,
  onDragStart,
  onDrop,
  onDragEnd,
  summaryOpen,
  onToggleSummary,
  draftOpen,
  onToggleDraft,
  champPicks,
  onSelectChamp,
  allChampions,
  onReshuffle,
  onCopy,
  onReset,
  onStartGame,
}: {
  teams: Teams;
  rates: Rates;
  dragSrc: TeamSlotRef | null;
  onDragStart: (ref: TeamSlotRef) => void;
  onDrop: (ref: TeamSlotRef) => void;
  onDragEnd: () => void;
  summaryOpen: boolean;
  onToggleSummary: () => void;
  draftOpen: boolean;
  onToggleDraft: () => void;
  champPicks: ChampPicks;
  onSelectChamp: (puuid: string, champ: ChampSummary | null) => void;
  allChampions: ChampSummary[];
  onReshuffle: () => void;
  onCopy: () => void;
  onReset: () => void;
  onStartGame: () => void;
}) {
  const gap = Math.abs(rates.blue - rates.red);
  const verdict =
    gap <= 10 ? '⚖ 매우 균형 잡힌 매치 — 백중세 예상' : gap <= 25 ? '살짝 기울지만 해볼 만한 매치' : '한쪽이 다소 유리 — 스왑으로 조정해 보세요';

  const blueTop = topScore(teams.blue);
  const redTop = topScore(teams.red);

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '26px 40px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo size={34} fontSize={17} />
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 20, letterSpacing: 0.5 }}>매칭 결과</div>
        </div>
        <div style={{ fontSize: 12, color: '#6f7b96' }}>
          카드를 <span style={{ color: '#d8b463' }}>드래그</span>해 두 팀 간 스왑하면 승률이 실시간 갱신됩니다
        </div>
      </div>

      <WinGauge blue={rates.blue} red={rates.red} verdict={verdict} />

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
          <div style={{ width: 1, flex: 1, background: 'linear-gradient(#5aa9ff33, #2a3350, #f0656a33)', minHeight: 200 }} />
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

      <BalanceSummary teams={teams} rates={rates} open={summaryOpen} onToggle={onToggleSummary} />
      <DraftPanel teams={teams} open={draftOpen} onToggle={onToggleDraft} />

      <div style={{ marginTop: 26, display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onStartGame}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'linear-gradient(140deg, #3ddc84, #1e9e5c)',
            border: 'none',
            color: '#04150c',
            padding: '15px 40px',
            borderRadius: 13,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Rajdhani','Noto Sans KR'",
            letterSpacing: 0.5,
            boxShadow: '0 10px 30px rgba(61,220,132,.25)',
          }}
        >
          <span>게임 시작</span>
          <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>픽 반영해서 결과 시뮬레이션</span>
        </button>
      </div>

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 12 }}>
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
          다시 짜기 (다른 조합)
        </button>
        <button
          type="button"
          onClick={onCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(140deg, #e6c574, #c19a3f)',
            border: 'none',
            color: '#0b0f18',
            padding: '13px 24px',
            borderRadius: 11,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          결과 복사 (디스코드용)
        </button>
        <button
          type="button"
          onClick={onReset}
          style={{
            background: 'transparent',
            border: '1px solid #2a3350',
            color: '#8b93a7',
            padding: '13px 22px',
            borderRadius: 11,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          처음으로
        </button>
      </div>
    </div>
  );
}
