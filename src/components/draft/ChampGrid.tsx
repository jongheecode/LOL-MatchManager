import { useMemo, useState } from 'react';
import type { ChampSummary } from '../../types';
import { ChampIcon } from '../ChampIcon';

export function ChampGrid({
  allChampions,
  excluded,
  onSelect,
}: {
  allChampions: ChampSummary[];
  excluded: Set<string>;
  onSelect: (champ: ChampSummary) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim();
    return allChampions.filter((c) => !excluded.has(c.name) && (!q || c.name.includes(q)));
  }, [allChampions, excluded, query]);

  return (
    <div style={{ background: '#0c1220', border: '1px solid #1a2236', borderRadius: 14, padding: 16 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="챔피언 검색"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          background: '#0b1120',
          border: '1px solid #232c44',
          borderRadius: 8,
          color: '#e8ebf3',
          padding: '9px 12px',
          fontSize: 13,
          outline: 'none',
          marginBottom: 12,
        }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
        {filtered.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => onSelect(c)}
            title={c.name}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <ChampIcon champ={c} size={40} />
            <span style={{ fontSize: 8.5, color: '#8b93a7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 48 }}>
              {c.name}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#55617a', fontSize: 12, padding: 20 }}>검색 결과가 없어요</div>
        )}
      </div>
    </div>
  );
}
