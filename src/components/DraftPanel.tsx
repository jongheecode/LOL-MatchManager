import type { TeamEntry, Teams } from '../types';
import { ChampIcon } from './ChampIcon';
import { posLabel } from '../lib/positions';

function DraftRow({ entry, accent }: { entry: TeamEntry; accent: string }) {
  const p = entry.player;
  const pick = p.champs[0];
  // champs/dangerPicks are scoped to the player's real main lane. If they got bumped to an
  // off-role slot (another teammate had priority on their lane), that data belongs to a
  // different position than entry.pos — showing it here would read as "ADC who plays Darius".
  const offRole = !entry.honored;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #16203380' }}>
      <span style={{ width: 30, fontSize: 11, color: '#8b93a7', flex: 'none' }}>{posLabel(entry.pos)}</span>
      <span
        style={{
          fontSize: 12.5,
          color: '#dbe1ee',
          flex: '0 0 92px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {p.name}
      </span>
      {offRole ? (
        <span style={{ flex: 1, fontSize: 11, color: '#55617a' }}>
          부포지션 소화 (주 라인 {posLabel(p.mainPos)}) · 이 라인 데이터 없음
        </span>
      ) : pick ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <ChampIcon champ={pick} size={20} />
          <span style={{ fontSize: 11.5, color: '#b6c0d6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pick.name}
          </span>
        </div>
      ) : (
        <span style={{ flex: 1, fontSize: 11.5, color: '#55617a' }}>추천 픽 데이터 없음</span>
      )}
      {!offRole && (
        <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
          {entry.player.dangerPicks.map((d) => (
            <div
              key={d.champ.name}
              title={`${d.champ.name} · 최근 ${d.games}전 ${d.winRate}%`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: `${accent}18`,
                border: `1px solid ${accent}55`,
                borderRadius: 6,
                padding: '2px 6px 2px 3px',
              }}
            >
              <ChampIcon champ={d.champ} size={16} />
              <span style={{ fontSize: 10, color: accent, fontWeight: 700 }}>밴 · {d.winRate}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DraftPanel({ teams, open, onToggle }: { teams: Teams; open: boolean; onToggle: () => void }) {
  const anyDanger = [...teams.blue, ...teams.red].some((c) => c.player.dangerPicks.length > 0);

  return (
    <div style={{ marginTop: 22, background: '#0f1524', border: '1px solid #1e2740', borderRadius: 14, overflow: 'hidden' }}>
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
        <span>
          밴픽 추천 <span style={{ fontSize: 11, color: '#6f7b96', fontWeight: 400 }}>(최근 전적 기반)</span>
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
        <div style={{ padding: '4px 20px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, animation: 'fadeUp .25s' }}>
          <div>
            <div style={{ fontSize: 11, color: '#5aa9ff', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>BLUE</div>
            {teams.blue.map((entry) => (
              <DraftRow key={entry.pos} entry={entry} accent="#5aa9ff" />
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#f0656a', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>RED</div>
            {teams.red.map((entry) => (
              <DraftRow key={entry.pos} entry={entry} accent="#f0656a" />
            ))}
          </div>
          {!anyDanger && (
            <div style={{ gridColumn: '1 / -1', fontSize: 11.5, color: '#55617a', marginTop: 4 }}>
              표본(최근 전적) 안에서 3판 이상·승률 60% 이상인 위협적인 카드가 없어요. 각 팀의 "추천 픽"만 참고하세요.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
