import type { DragEvent } from 'react';
import type { ChampSummary, TeamEntry } from '../types';
import { Avatar } from './Avatar';
import { TierEmblem } from './TierEmblem';
import { ChampIcon } from './ChampIcon';
import { ChampionPicker } from './ChampionPicker';
import { posColor, posLabel } from '../lib/positions';
import { effectiveWr, reasonText } from '../lib/balance';

const CLIP = 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)';

export function ResultCard({
  entry,
  team,
  isTop,
  dragging,
  allChampions,
  selectedChamp,
  onSelectChamp,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  entry: TeamEntry;
  team: 'blue' | 'red';
  isTop: boolean;
  dragging: boolean;
  allChampions: ChampSummary[];
  selectedChamp: ChampSummary | null;
  onSelectChamp: (champ: ChampSummary | null) => void;
  onDragStart: () => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const p = entry.player;
  const accent = team === 'blue' ? '#5aa9ff' : '#f0656a';
  const selectedStat = selectedChamp ? p.champPool.find((c) => c.champ.name === selectedChamp.name) : null;
  const wr = effectiveWr(p, selectedChamp ? { [p.puuid]: selectedChamp } : undefined);
  const wrColor = wr >= 55 ? '#4fd18a' : wr < 50 ? '#f0797d' : '#c8cede';
  const wrLabel = selectedChamp ? (selectedStat ? `${selectedChamp.name} 실전 승률` : `${selectedChamp.name} 예상 (표본 없음)`) : '최근 전적';
  const reason = reasonText(entry.pos, p, entry.honored, isTop);
  const pColor = posColor(entry.pos);

  const bg =
    team === 'blue'
      ? 'linear-gradient(100deg, rgba(47,95,176,.16), rgba(15,20,34,.4))'
      : 'linear-gradient(260deg, rgba(176,53,58,.16), rgba(15,20,34,.4))';

  const posBlock = (
    <div style={{ width: 32, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div
        style={{
          width: 26,
          height: 30,
          clipPath: CLIP,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: '#0b0f18',
          background: `linear-gradient(140deg, ${pColor}, ${pColor}bb)`,
        }}
      >
        {entry.pos}
      </div>
      <span style={{ fontSize: 10, color: pColor }}>{posLabel(entry.pos)}</span>
    </div>
  );

  const avatar = <Avatar name={p.name} hue={p.hue} profileIconId={p.profileIconId} size={50} radius={11} fontSize={20} />;

  const info = (
    <div style={{ flex: 1, minWidth: 0, textAlign: team === 'blue' ? 'left' : 'right' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: team === 'blue' ? 'flex-start' : 'flex-end' }}>
        {team === 'red' && <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: '#5c6884' }}>#{p.tag}</span>}
        <span style={{ fontSize: 15, fontWeight: 600, color: '#eef2fb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.name}
        </span>
        {team === 'blue' && <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: '#5c6884' }}>#{p.tag}</span>}
        {p.liveGame && <span style={{ fontSize: 9, color: '#4fd18a', fontWeight: 700 }}>● LIVE</span>}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 4,
          justifyContent: team === 'blue' ? 'flex-start' : 'flex-end',
        }}
      >
        {team === 'blue' ? (
          <>
            <TierEmblem color={p.tier.color} width={14} height={16} />
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, color: '#b6c0d6' }}>{p.tier.text}</span>
          </>
        ) : (
          <>
            <span style={{ fontFamily: "'IBM Plex Mono'", fontSize: 12, color: '#b6c0d6' }}>{p.tier.text}</span>
            <TierEmblem color={p.tier.color} width={14} height={16} />
          </>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: '#7f8aa3', marginTop: 6 }}>{reason}</div>
    </div>
  );

  const wrBlock = (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: team === 'blue' ? 'flex-end' : 'flex-start',
        gap: 7,
      }}
    >
      <div style={{ textAlign: team === 'blue' ? 'right' : 'left' }}>
        <div style={{ fontFamily: "'IBM Plex Mono'", fontSize: 16, fontWeight: 600, color: wrColor }}>{wr}%</div>
        <div style={{ fontSize: 9.5, color: '#6f7b96', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>{wrLabel}</div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {p.champs.slice(0, 3).map((ch, i) => (
          <ChampIcon key={ch.name + i} champ={ch} />
        ))}
      </div>
    </div>
  );

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '13px 15px',
        borderRadius: 13,
        background: bg,
        border: `1px solid ${dragging ? accent : team === 'blue' ? 'rgba(90,169,255,.28)' : 'rgba(240,101,106,.28)'}`,
        [team === 'blue' ? 'borderLeft' : 'borderRight']: `3px solid ${accent}`,
        cursor: 'grab',
        transition: 'border-color .15s, transform .15s, opacity .15s',
        opacity: dragging ? 0.5 : 1,
        transform: dragging ? 'scale(.99)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        {team === 'blue' ? (
          <>
            {posBlock}
            {avatar}
            {info}
            {wrBlock}
          </>
        ) : (
          <>
            {wrBlock}
            {info}
            {avatar}
            {posBlock}
          </>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: team === 'blue' ? 'flex-start' : 'flex-end',
          paddingLeft: team === 'blue' ? 45 : 0,
          paddingRight: team === 'blue' ? 0 : 45,
          borderTop: '1px solid rgba(255,255,255,.05)',
          paddingTop: 9,
        }}
      >
        <ChampionPicker
          allChampions={allChampions}
          champPool={p.champPool}
          selected={selectedChamp}
          onSelect={onSelectChamp}
          accent={accent}
          align={team === 'blue' ? 'left' : 'right'}
        />
      </div>
    </div>
  );
}
