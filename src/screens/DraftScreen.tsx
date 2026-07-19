import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { ChampSummary, Teams } from '../types';
import type { ChampPicks } from '../lib/balance';
import { SNAKE_PATTERN } from '../lib/balance';
import type { Team } from '../lib/colors';
import { teamColor } from '../lib/colors';
import { posLabel } from '../lib/positions';
import { TeamDraftBoard } from '../components/draft/TeamDraftBoard';
import { ChampGrid } from '../components/draft/ChampGrid';

const BANS_PER_TEAM = 3;
const BAN_ORDER: Team[] = ['blue', 'red', 'blue', 'red', 'blue', 'red'];
const PICK_ORDER: Team[] = SNAKE_PATTERN.map((c) => (c === 'B' ? 'blue' : 'red'));

type DraftAction = { kind: 'ban'; team: Team; champ: ChampSummary } | { kind: 'pick'; puuid: string; champ: ChampSummary };

function ghostBtnStyle(disabled: boolean): CSSProperties {
  return {
    background: '#151c2d',
    border: '1px solid #2a3350',
    color: disabled ? '#4a5573' : '#dbe1ee',
    padding: '9px 16px',
    borderRadius: 9,
    fontSize: 12.5,
    fontWeight: 500,
    cursor: disabled ? 'default' : 'pointer',
  };
}

export function DraftScreen({
  teams,
  allChampions,
  onComplete,
  onSimulate,
  onCancel,
}: {
  teams: Teams;
  allChampions: ChampSummary[];
  onComplete: (picks: ChampPicks) => void;
  onSimulate: (picks: ChampPicks) => void;
  onCancel: () => void;
}) {
  const [history, setHistory] = useState<DraftAction[]>([]);

  const banStep = history.filter((a) => a.kind === 'ban').length;
  const pickStep = history.filter((a) => a.kind === 'pick').length;
  const phase: 'ban' | 'pick' | 'done' = banStep < BAN_ORDER.length ? 'ban' : pickStep < PICK_ORDER.length ? 'pick' : 'done';
  const currentTeam = phase === 'ban' ? BAN_ORDER[banStep] : phase === 'pick' ? PICK_ORDER[pickStep] : null;
  const currentPosIndex =
    phase === 'pick' && currentTeam ? PICK_ORDER.slice(0, pickStep).filter((t) => t === currentTeam).length : null;
  const currentEntry = phase === 'pick' && currentTeam && currentPosIndex != null ? teams[currentTeam][currentPosIndex] : null;

  const bansByTeam: Record<Team, ChampSummary[]> = {
    blue: history.filter((a): a is DraftAction & { kind: 'ban' } => a.kind === 'ban' && a.team === 'blue').map((a) => a.champ),
    red: history.filter((a): a is DraftAction & { kind: 'ban' } => a.kind === 'ban' && a.team === 'red').map((a) => a.champ),
  };
  const picks: ChampPicks = Object.fromEntries(
    history.filter((a): a is DraftAction & { kind: 'pick' } => a.kind === 'pick').map((a) => [a.puuid, a.champ]),
  );
  const excludedNames = new Set(history.map((a) => a.champ.name));

  const handleSelect = (champ: ChampSummary) => {
    if (phase === 'ban' && currentTeam) {
      setHistory((h) => [...h, { kind: 'ban', team: currentTeam, champ }]);
    } else if (phase === 'pick' && currentEntry) {
      setHistory((h) => [...h, { kind: 'pick', puuid: currentEntry.player.puuid, champ }]);
    }
  };

  const handleUndo = () => setHistory((h) => h.slice(0, -1));

  const turnText =
    phase === 'ban'
      ? `밴 ${bansByTeam[currentTeam!].length + 1}/${BANS_PER_TEAM}`
      : phase === 'pick'
        ? `${posLabel(currentEntry!.pos)} · ${currentEntry!.player.name} 픽 차례`
        : '';

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '26px 40px 44px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 20, letterSpacing: 0.5 }}>모의 밴픽</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={handleUndo} disabled={history.length === 0} style={ghostBtnStyle(history.length === 0)}>
            이전으로
          </button>
          <button type="button" onClick={onCancel} style={ghostBtnStyle(false)}>
            드래프트 취소
          </button>
        </div>
      </div>

      {phase !== 'done' && (
        <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 14 }}>
          <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, letterSpacing: 2, color: teamColor(currentTeam!) }}>
            {phase === 'ban' ? 'BAN' : 'PICK'} · {currentTeam === 'blue' ? 'BLUE' : 'RED'}
          </span>
          <span style={{ color: '#8b93a7', marginLeft: 8 }}>{turnText}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <TeamDraftBoard
          team="blue"
          entries={teams.blue}
          bans={bansByTeam.blue}
          banSlots={BANS_PER_TEAM}
          picks={picks}
          activeBan={phase === 'ban' && currentTeam === 'blue'}
          activePosIndex={phase === 'pick' && currentTeam === 'blue' ? currentPosIndex : null}
        />
        <TeamDraftBoard
          team="red"
          entries={teams.red}
          bans={bansByTeam.red}
          banSlots={BANS_PER_TEAM}
          picks={picks}
          activeBan={phase === 'ban' && currentTeam === 'red'}
          activePosIndex={phase === 'pick' && currentTeam === 'red' ? currentPosIndex : null}
        />
      </div>

      {phase !== 'done' ? (
        <ChampGrid allChampions={allChampions} excluded={excludedNames} onSelect={handleSelect} />
      ) : (
        <div style={{ textAlign: 'center', background: '#0c1220', border: '1px solid #1a2236', borderRadius: 14, padding: '28px 16px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e8ebf3', marginBottom: 14 }}>드래프트 완료 ✓</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button type="button" onClick={() => onComplete(picks)} style={ghostBtnStyle(false)}>
              결과 화면으로 돌아가기
            </button>
            <button
              type="button"
              onClick={() => onSimulate(picks)}
              style={{
                background: 'linear-gradient(140deg, #e6c574, #c19a3f)',
                border: 'none',
                color: '#0b0f18',
                padding: '13px 30px',
                borderRadius: 11,
                fontSize: 14.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              바로 시뮬레이션 시작 ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
