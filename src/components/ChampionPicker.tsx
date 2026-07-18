import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChampSummary } from '../types';
import { ChampIcon } from './ChampIcon';

export function ChampionPicker({
  allChampions,
  champPool,
  selected,
  onSelect,
  accent,
  align,
}: {
  allChampions: ChampSummary[];
  champPool: { champ: ChampSummary; games: number; winRate: number }[];
  selected: ChampSummary | null;
  onSelect: (champ: ChampSummary | null) => void;
  accent: string;
  align: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const poolByName = useMemo(() => new Map(champPool.map((c) => [c.champ.name, c])), [champPool]);
  const selectedStat = selected ? poolByName.get(selected.name) : null;

  const filtered = useMemo(() => {
    const q = query.trim();
    const list = q ? allChampions.filter((c) => c.name.includes(q)) : allChampions;
    // Champions the player has actually played bubble to the top, real-record-first.
    return [...list].sort((a, b) => {
      const pa = poolByName.get(a.name) ? 1 : 0;
      const pb = poolByName.get(b.name) ? 1 : 0;
      return pb - pa;
    });
  }, [allChampions, query, poolByName]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'flex', justifyContent: align === 'left' ? 'flex-start' : 'flex-end' }}>
      <button
        type="button"
        draggable={false}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          background: selected ? `${accent}1c` : '#0b1120',
          border: `1px solid ${selected ? accent : '#232c44'}`,
          borderRadius: 20,
          padding: selected ? '3px 10px 3px 3px' : '5px 12px',
        }}
      >
        {selected ? (
          <>
            <ChampIcon champ={selected} size={18} />
            <span style={{ fontSize: 10.5, color: '#eef2fb', fontWeight: 700 }}>{selected.name}</span>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: accent }}>
              {selectedStat ? `${selectedStat.winRate}%` : '예상'}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 10.5, color: '#8b93a7' }}>챔피언 선택 +</span>
        )}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            [align === 'left' ? 'left' : 'right']: 0,
            width: 220,
            zIndex: 40,
            background: '#111a2c',
            border: '1px solid #2a3350',
            borderRadius: 10,
            boxShadow: '0 16px 40px rgba(0,0,0,.5)',
            overflow: 'hidden',
          }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="챔피언 검색"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: '#0b1120',
              border: 'none',
              borderBottom: '1px solid #232c44',
              color: '#e8ebf3',
              padding: '9px 12px',
              fontSize: 12.5,
              outline: 'none',
            }}
          />
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {selected && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  color: '#f0797d',
                  fontSize: 11.5,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                선택 해제 (최근 전적 기준으로)
              </button>
            )}
            {filtered.length === 0 && <div style={{ padding: '12px', fontSize: 11.5, color: '#55617a' }}>검색 결과가 없어요</div>}
            {filtered.map((c) => {
              const stat = poolByName.get(c.name);
              const isSel = selected?.name === c.name;
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => {
                    onSelect(c);
                    setOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 12px',
                    background: isSel ? `${accent}1c` : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <ChampIcon champ={c} size={20} />
                  <span style={{ flex: 1, fontSize: 12, color: '#dbe1ee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name}
                  </span>
                  {stat && (
                    <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 10, color: '#4fd18a' }}>
                      {stat.games}전 {stat.winRate}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
