import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChampSummary, GameResult, Player, SavedPlayer, Screen, Teams } from './types';
import { useSlots } from './hooks/useSlots';
import { fetchMeta, fetchChampions, fetchRoster, analyzeStream, type AnalyzePlayerInput } from './lib/api';
import { setDdragonVersion } from './lib/avatar';
import { forgetPlayer, getSavedPlayers, toSavedPlayer } from './lib/storage';
import { buildTeams, needsManualPick, rates as computeRates, swapPlayers, type ChampPicks, type TeamSlotRef } from './lib/balance';
import { simulateGame } from './lib/gameSim';
import { InputScreen } from './screens/InputScreen';
import { AnalyzingScreen, type AnalyzeRow } from './screens/AnalyzingScreen';
import { ResultScreen } from './screens/ResultScreen';
import { GameResultScreen } from './screens/GameResultScreen';
import { Toast } from './components/Toast';

const POS_KO: Record<string, string> = { TOP: '탑', JG: '정글', MID: '미드', AD: '원딜', SUP: '서폿' };

export default function App() {
  const [screen, setScreen] = useState<Screen>('input');
  const [region, setRegion] = useState('kr');

  const { slots, setQuery, commit, togglePref, clearAll, fillFromSaved, fillManyFromSaved, filledCount } = useSlots(region);
  const [saved, setSaved] = useState(() => getSavedPlayers());
  const [roster, setRoster] = useState<SavedPlayer[]>([]);

  const [teams, setTeams] = useState<Teams | null>(null);
  const [dragSrc, setDragSrc] = useState<TeamSlotRef | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [champPicks, setChampPicks] = useState<ChampPicks>({});
  const [allChampions, setAllChampions] = useState<ChampSummary[]>([]);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);

  const [analyzeRows, setAnalyzeRows] = useState<AnalyzeRow[]>([]);
  const [analyzeCurrent, setAnalyzeCurrent] = useState('대기 중...');
  const [analyzeDone, setAnalyzeDone] = useState(0);

  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetchMeta()
      .then((m) => {
        setDdragonVersion(m.ddragonVersion);
        setRegion(m.platform);
      })
      .catch(() => {
        /* keep the pinned fallback ddragon version and default kr region */
      });
    fetchChampions()
      .then(setAllChampions)
      .catch(() => {
        /* champion picker just shows an empty list until this succeeds on a later mount */
      });
    fetchRoster()
      .then((players) => setRoster(players.map((p) => toSavedPlayer(p, 'kr', { pinned: true }))))
      .catch(() => {
        /* the shared roster is a convenience, not a requirement — sidebar still works without it */
      });
  }, []);

  useEffect(() => {
    setSaved(getSavedPlayers());
  }, [slots]);

  const displaySaved = useMemo(() => {
    const rosterKeys = new Set(roster.map((p) => `${p.name}#${p.tag}`));
    return [...roster, ...saved.filter((p) => !rosterKeys.has(`${p.name}#${p.tag}`))];
  }, [roster, saved]);

  const flashToast = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  const start = () => {
    const ready = slots.filter((s) => s.status === 'done' && s.data);
    if (ready.length < 10) return;

    const lightByPuuid = new Map<string, Player>(ready.map((s) => [s.data!.puuid, { ...s.data!, pref: s.pref }]));
    const players: AnalyzePlayerInput[] = ready.map((s) => ({ puuid: s.data!.puuid, name: s.data!.name, tag: s.data!.tag, pref: s.pref }));

    setScreen('analyzing');
    setAnalyzeDone(0);
    setAnalyzeCurrent('소환사 정보 조회 중...');
    setAnalyzeRows(
      players.map((p) => {
        const light = lightByPuuid.get(p.puuid)!;
        return { name: p.name, hue: light.hue, profileIconId: light.profileIconId, state: 'waiting' as const };
      }),
    );

    const results: Player[] = new Array(10);

    analyzeStream(players, (ev) => {
      if (ev.type === 'start') {
        setAnalyzeRows((prev) => prev.map((r, i) => (i === ev.index ? { ...r, state: 'current' } : r)));
        setAnalyzeCurrent(`${ev.name} · 소환사 정보 조회 중...`);
      } else if (ev.type === 'phase') {
        setAnalyzeCurrent(`${ev.name} · ${ev.phase}`);
      } else if (ev.type === 'done') {
        results[ev.index] = ev.player;
        setAnalyzeRows((prev) => prev.map((r, i) => (i === ev.index ? { ...r, state: 'done' } : r)));
        setAnalyzeDone((d) => d + 1);
      } else if (ev.type === 'error') {
        results[ev.index] = lightByPuuid.get(players[ev.index].puuid)!;
        setAnalyzeRows((prev) => prev.map((r, i) => (i === ev.index ? { ...r, state: 'error' } : r)));
        setAnalyzeDone((d) => d + 1);
      } else if (ev.type === 'complete') {
        setTeams(buildTeams(results, false));
        setScreen('result');
      }
    }).catch((err) => {
      flashToast(`분석 중 오류가 발생했습니다: ${err instanceof Error ? err.message : ''}`);
      setScreen('input');
    });
  };

  const rates = useMemo(() => (teams ? computeRates(teams, champPicks) : null), [teams, champPicks]);

  const onSelectChamp = (puuid: string, champ: ChampSummary | null) => {
    setChampPicks((prev) => {
      if (!champ) {
        if (!(puuid in prev)) return prev;
        const next = { ...prev };
        delete next[puuid];
        return next;
      }
      return { ...prev, [puuid]: champ };
    });
  };

  const onDragStart = (ref: TeamSlotRef) => setDragSrc(ref);
  const onDragEnd = () => setDragSrc(null);
  const onDrop = (dst: TeamSlotRef) => {
    if (!dragSrc || !teams) {
      setDragSrc(null);
      return;
    }
    setTeams(swapPlayers(teams, dragSrc, dst));
    setDragSrc(null);
  };

  const reshuffle = () => {
    if (!teams) return;
    const players = [...teams.blue, ...teams.red].map((c) => c.player);
    setTeams(buildTeams(players, true));
    flashToast('새로운 조합으로 다시 짰습니다');
  };

  const copyResult = () => {
    if (!teams || !rates) return;
    const line = (c: Teams['blue'][number]) => {
      const pick = champPicks[c.player.puuid];
      return `  ${POS_KO[c.pos]} ${c.player.name}#${c.player.tag} (${c.player.tier.text})${pick ? ` — 픽: ${pick.name}` : ''}`;
    };
    const text = `⚔️ 내전 팀 매칭 결과\n\n🔵 BLUE (예상 ${rates.blue}%)\n${teams.blue.map(line).join('\n')}\n\n🔴 RED (예상 ${rates.red}%)\n${teams.red.map(line).join('\n')}\n\n— PENTABALANCE`;
    navigator.clipboard?.writeText(text).catch(() => {});
    flashToast('디스코드용 텍스트를 복사했습니다');
  };

  const startGame = () => {
    if (!teams || !rates) return;
    const blockers = [...teams.blue, ...teams.red].filter((e) => needsManualPick(e, champPicks));
    if (blockers.length > 0) {
      flashToast(`이 라인 전적이 없는 선수는 챔피언을 직접 선택해주세요: ${blockers.map((e) => e.player.name).join(', ')}`);
      return;
    }
    setGameResult(simulateGame(teams, rates, champPicks));
    setScreen('game');
  };

  const reset = () => {
    setScreen('input');
    setTeams(null);
    setDragSrc(null);
    setChampPicks({});
    setGameResult(null);
  };

  const deleteSaved = (p: { name: string; tag: string }) => {
    forgetPlayer(p.name, p.tag);
    setSaved(getSavedPlayers());
  };

  return (
    <div className="app-shell">
      {screen === 'input' && (
        <InputScreen
          slots={slots}
          filledCount={filledCount}
          onQueryChange={setQuery}
          onCommit={commit}
          onTogglePref={togglePref}
          onClearAll={clearAll}
          saved={displaySaved}
          onPickSaved={fillFromSaved}
          onFillMany={() => fillManyFromSaved(displaySaved)}
          onDeleteSaved={deleteSaved}
          onStart={start}
        />
      )}
      {screen === 'analyzing' && (
        <AnalyzingScreen rows={analyzeRows} currentText={analyzeCurrent} percent={Math.round((analyzeDone / 10) * 100)} />
      )}
      {screen === 'result' && teams && rates && (
        <ResultScreen
          teams={teams}
          rates={rates}
          dragSrc={dragSrc}
          onDragStart={onDragStart}
          onDrop={onDrop}
          onDragEnd={onDragEnd}
          summaryOpen={summaryOpen}
          onToggleSummary={() => setSummaryOpen((v) => !v)}
          champPicks={champPicks}
          onSelectChamp={onSelectChamp}
          allChampions={allChampions}
          onReshuffle={reshuffle}
          onCopy={copyResult}
          onReset={reset}
          onStartGame={startGame}
        />
      )}
      {screen === 'game' && teams && gameResult && (
        <GameResultScreen teams={teams} result={gameResult} onBackToResult={() => setScreen('result')} onReset={reset} />
      )}
      <Toast message={toast} />
    </div>
  );
}
