import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import type { Position, Slot } from '../types';
import { Avatar } from './Avatar';
import { TierEmblem } from './TierEmblem';
import { PositionButtons } from './PositionButtons';
import { HEX_CLIP } from './Hexagon';
import { posColor, posLabel } from '../lib/positions';

export function SlotCard({
  index,
  slot,
  onQueryChange,
  onCommit,
  onTogglePref,
  onClear,
}: {
  index: number;
  slot: Slot;
  onQueryChange: (v: string) => void;
  onCommit: () => void;
  onTogglePref: (pos: Position) => void;
  onClear: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const { status, data } = slot;

  const border =
    status === 'error'
      ? 'rgba(240,69,75,.5)'
      : status === 'done'
        ? 'rgba(216,180,99,.35)'
        : status === 'loading'
          ? 'rgba(216,180,99,.3)'
          : '#222b42';
  const active = status === 'done';

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      onCommit();
    }
  };

  return (
    <div
      style={{
        background: active ? 'linear-gradient(160deg,#141b2b,#0f1523)' : '#0f1523',
        border: `1px solid ${border}`,
        borderRadius: 13,
        padding: '14px 15px',
        transition: 'border-color .2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 26,
            height: 30,
            flex: 'none',
            background: '#1c2437',
            clipPath: HEX_CLIP,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'IBM Plex Mono'",
            fontSize: 13,
            color: '#6f7b96',
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </div>
        <input
          value={slot.query}
          placeholder="닉네임 #KR1"
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onCommit();
          }}
          style={{
            flex: 1,
            minWidth: 0,
            background: focused ? '#111a2c' : '#0e1524',
            border: `1px solid ${focused ? '#d8b463' : '#263049'}`,
            color: '#e8ebf3',
            padding: '9px 11px',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
          }}
        />
        <PositionButtons pref={slot.pref} mainPos={data?.mainPos ?? null} onToggle={(pos) => onTogglePref(pos)} />
        {status !== 'empty' && (
          <button
            type="button"
            title="이 슬롯 비우기"
            onClick={onClear}
            style={{
              flex: 'none',
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              color: '#7f8aa3',
              fontSize: 14,
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

      <div style={{ marginTop: 10, minHeight: 44 }}>
        {status === 'empty' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#7f8aa3', fontSize: 12.5, padding: '6px 2px' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, border: '1px dashed #2a3350' }} />
            Riot ID를 입력하면 전적을 불러옵니다
          </div>
        )}
        {status === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px' }}>
            <div
              style={{
                width: 18,
                height: 18,
                border: '2px solid #2a3350',
                borderTopColor: '#d8b463',
                borderRadius: '50%',
                animation: 'spin .7s linear infinite',
              }}
            />
            <span style={{ fontSize: 12.5, color: '#b6c0d6' }}>전적 불러오는 중...</span>
          </div>
        )}
        {status === 'error' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 2px', animation: 'fadeUp .25s' }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'rgba(240,69,75,.12)',
                border: '1px solid rgba(240,69,75,.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f0454b',
                fontWeight: 700,
              }}
            >
              !
            </div>
            <span style={{ fontSize: 12.5, color: '#f0797d' }}>
              {slot.errorMessage || '존재하지 않는 소환사입니다. 닉네임#태그를 확인하세요'}
            </span>
          </div>
        )}
        {status === 'done' && data && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 2, animation: 'fadeUp .3s' }}>
            <Avatar name={data.name} hue={data.hue} profileIconId={data.profileIconId} size={40} radius={9} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <TierEmblem color={data.tier.color} />
                <span
                  style={{
                    fontSize: 13.5,
                    color: '#e8ebf3',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {data.name}
                </span>
                {data.liveGame && (
                  <span style={{ fontSize: 9.5, color: '#4fd18a', fontWeight: 700, letterSpacing: 0.3 }}>● LIVE</span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 3,
                  fontFamily: "'IBM Plex Mono'",
                  fontSize: 11.5,
                  color: '#8b93a7',
                }}
              >
                <span style={{ color: '#b6c0d6' }}>{data.tier.text}</span>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#3a445e' }} />
                <span style={{ color: posColor(slot.pref || data.mainPos) }}>{posLabel(slot.pref || data.mainPos)}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flex: 'none' }}>
              <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 15, color: '#d8b463', fontWeight: 600 }}>{data.score}</div>
              <div style={{ fontSize: 10, color: '#6f7b96', letterSpacing: 0.5 }}>MMR</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
