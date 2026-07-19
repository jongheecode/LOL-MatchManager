import type { Position, SavedPlayer, Slot } from '../types';
import { SlotCard } from '../components/SlotCard';
import { SavedPlayerList } from '../components/SavedPlayerList';

export function InputScreen({
  slots,
  filledCount,
  onQueryChange,
  onCommit,
  onTogglePref,
  onClearAll,
  onClearSlot,
  saved,
  onPickSaved,
  onFillMany,
  onDeleteSaved,
  onStart,
}: {
  slots: Slot[];
  filledCount: number;
  onQueryChange: (i: number, v: string) => void;
  onCommit: (i: number) => void;
  onTogglePref: (i: number, pos: Position) => void;
  onClearAll: () => void;
  onClearSlot: (i: number) => void;
  saved: SavedPlayer[];
  onPickSaved: (p: SavedPlayer) => void;
  onFillMany: () => void;
  onDeleteSaved: (p: SavedPlayer) => void;
  onStart: () => void;
}) {
  const startDisabled = filledCount < 10;
  const usedKeys = new Set(slots.filter((s) => s.data).map((s) => `${s.data!.name}#${s.data!.tag}`));

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '30px 44px 120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 }}>
        <div>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 22, letterSpacing: 0.3 }}>내전 팀 짜기</div>
          <div style={{ fontSize: 12.5, color: '#8b93a7', marginTop: 3 }}>10명만 넣으면 끝. 공정한 5:5 내전 팀 자동 매칭</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 13, color: '#8b93a7' }}>
            등록 <span style={{ color: '#d8b463', fontWeight: 600 }}>{filledCount}</span> / 10
          </div>
          <button
            type="button"
            onClick={onClearAll}
            style={{
              background: 'transparent',
              border: '1px solid #2a3350',
              color: '#8b93a7',
              padding: '8px 14px',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            전체 지우기
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 22, alignItems: 'start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {slots.map((slot, i) => (
            <SlotCard
              key={i}
              index={i}
              slot={slot}
              onQueryChange={(v) => onQueryChange(i, v)}
              onCommit={() => onCommit(i)}
              onTogglePref={(pos) => onTogglePref(i, pos)}
              onClear={() => onClearSlot(i)}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 20 }}>
          <SavedPlayerList saved={saved} usedKeys={usedKeys} onPick={onPickSaved} onFillMany={onFillMany} onDelete={onDeleteSaved} />
          <div
            style={{
              background: '#0e1422',
              border: '1px solid #1c2338',
              borderRadius: 12,
              padding: '13px 15px',
              fontSize: 11.5,
              color: '#6f7b96',
              lineHeight: 1.7,
            }}
          >
            <span style={{ color: '#8b93a7', fontWeight: 600 }}>TIP</span> · 슬롯 오른쪽{' '}
            <span style={{ color: '#b6c0d6' }}>포지션 버튼</span>으로 선호 라인을 지정하면 배정에 우선 반영됩니다. Riot ID는{' '}
            <span style={{ color: '#b6c0d6' }}>닉네임#태그</span> 형식으로 입력하세요 (태그 생략 시 KR1로 조회).
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 24,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 30,
        }}
      >
        <div style={{ pointerEvents: 'auto', borderRadius: 15, boxShadow: '0 14px 40px rgba(8,11,19,.7)' }}>
          <button
            type="button"
            onClick={onStart}
            disabled={startDisabled}
            style={
              startDisabled
                ? {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    whiteSpace: 'nowrap',
                    background: '#1a2033',
                    border: '1px solid #262f45',
                    color: '#4a5573',
                    padding: '16px 54px',
                    borderRadius: 13,
                    fontSize: 17,
                    fontWeight: 700,
                    cursor: 'not-allowed',
                    fontFamily: "'Rajdhani','Noto Sans KR'",
                    letterSpacing: 0.5,
                  }
                : {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    whiteSpace: 'nowrap',
                    background: 'linear-gradient(140deg,#e6c574,#c19a3f)',
                    border: 'none',
                    color: '#0b0f18',
                    padding: '16px 60px',
                    borderRadius: 13,
                    fontSize: 18,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Rajdhani','Noto Sans KR'",
                    letterSpacing: 0.5,
                    boxShadow: '0 8px 30px rgba(216,180,99,.25)',
                  }
            }
          >
            <span>팀 짜기</span>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 14, opacity: 0.8 }}>{filledCount}/10</span>
          </button>
        </div>
      </div>
    </div>
  );
}
