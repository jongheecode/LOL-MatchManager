import type { SavedPlayer } from '../types';
import { Avatar } from './Avatar';
import { posLabel } from '../lib/positions';

export function SavedPlayerList({
  saved,
  usedKeys,
  onPick,
  onFillMany,
  onDelete,
}: {
  saved: SavedPlayer[];
  usedKeys: Set<string>;
  onPick: (p: SavedPlayer) => void;
  onFillMany: () => void;
  onDelete: (p: SavedPlayer) => void;
}) {
  return (
    <div
      style={{
        background: 'linear-gradient(160deg, #141a28, #101524)',
        border: '1px solid #222b42',
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#e8ebf3' }}>저장된 플레이어</div>
        <button
          type="button"
          onClick={onFillMany}
          disabled={saved.length === 0}
          style={{
            background: 'rgba(216,180,99,.12)',
            border: '1px solid rgba(216,180,99,.35)',
            color: '#d8b463',
            padding: '5px 10px',
            borderRadius: 7,
            fontSize: 11.5,
            cursor: saved.length === 0 ? 'default' : 'pointer',
            fontWeight: 600,
            opacity: saved.length === 0 ? 0.5 : 1,
          }}
        >
          저장된 플레이어로 채우기
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          maxHeight: 460,
          overflowY: 'auto',
          margin: '0 -4px',
          padding: '0 4px',
        }}
      >
        {saved.length === 0 && (
          <div style={{ fontSize: 12, color: '#7f8aa3', padding: '10px 4px', lineHeight: 1.6 }}>
            Riot ID를 조회하면 이 목록에 자동으로 저장돼요. 다음 내전 때 바로 불러와서 쓸 수 있어요.
          </div>
        )}
        {saved.map((sv) => {
          const key = `${sv.name}#${sv.tag}`;
          const used = usedKeys.has(key);
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                width: '100%',
                borderRadius: 9,
                background: used ? '#0c1120' : 'transparent',
                border: `1px solid ${used ? '#1a2236' : 'transparent'}`,
                opacity: used ? 0.65 : 1,
                transition: 'background .15s',
              }}
            >
              <button
                type="button"
                onClick={() => !used && onPick(sv)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  flex: 1,
                  minWidth: 0,
                  padding: '7px 4px 7px 8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: used ? 'default' : 'pointer',
                  textAlign: 'left',
                }}
              >
                <Avatar name={sv.name} hue={sv.hue} size={30} radius={7} fontSize={13} />
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: '#dbe1ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sv.pinned && <span title="고정된 멤버">📌</span>}
                    {sv.name}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10.5, color: '#7f8aa3' }}>
                    {sv.tier.text} · {posLabel(sv.mainPos)}
                  </div>
                </div>
                {used ? (
                  <span style={{ fontSize: 10, color: '#4fd18a', fontWeight: 600, flex: 'none' }}>추가됨</span>
                ) : (
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      background: '#1a2236',
                      color: '#8b93a7',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flex: 'none',
                    }}
                  >
                    +
                  </span>
                )}
              </button>
              {!sv.pinned && (
                <button
                  type="button"
                  title="저장된 플레이어에서 삭제"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(sv);
                  }}
                  style={{
                    flex: 'none',
                    width: 22,
                    height: 22,
                    marginRight: 6,
                    borderRadius: 6,
                    background: 'transparent',
                    border: 'none',
                    color: '#4a5573',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
