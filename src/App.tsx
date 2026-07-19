import { useEffect, useMemo, useRef, useState } from 'react';
import type { AiAnalysis, AiPick, ChampSummary, GameResult, Player, SavedPlayer, Screen, Teams } from './types';
import { useSlots } from './hooks/useSlots';
import { aiAnalyze, aiMatchmake, fetchMeta, fetchChampions, fetchRoster, analyzeStream, type AnalyzePlayerInput } from './lib/api';
import { setDdragonVersion } from './lib/avatar';
import { forgetPlayer, getSavedPlayers, toSavedPlayer } from './lib/storage';
import { buildTeams, needsManualPick, rates as computeRates, swapPlayers, teamsFromAi, type ChampPicks, type TeamSlotRef } from './lib/balance';
import { simulateGame } from './lib/gameSim';
import { InputScreen } from './screens/InputScreen';
import { AnalyzingScreen, type AnalyzeRow } from './screens/AnalyzingScreen';
import { ResultScreen } from './screens/ResultScreen';
import { DraftScreen } from './screens/DraftScreen';
import { GameResultScreen } from './screens/GameResultScreen';
import { Toast } from './components/Toast';

const POS_KO: Record<string, string> = { TOP: '탑', JG: '정글', MID: '미드', AD: '원딜', SUP: '서폿' };

export default function App() {
  const [screen, setScreen] = useState<Screen>('input');
  const [region, setRegion] = useState('kr');

  const { slots, setQuery, commit, togglePref, clearAll, clearSlot, fillFromSaved, fillManyFromSaved, filledCount } = useSlots(region);
  const [saved, setSaved] = useState(() => getSavedPlayers());
  const [roster, setRoster] = useState<SavedPlayer[]>([]);

  const [teams, setTeams] = useState<Teams | null>(null);
  const [analyzedPlayers, setAnalyzedPlayers] = useState<Player[]>([]);
  const [teamOrigin, setTeamOrigin] = useState<'algo' | 'ai'>('algo');
  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'fresh' | 'stale'>('idle');
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
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
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    const pollRoster = () => {
      fetchRoster()
        .then(({ players, warming }) => {
          if (cancelled) return;
          if (players.length) setRoster(players.map((p) => toSavedPlayer(p, 'kr', { pinned: true })));
          // Server resolves the roster in the background (can take a few minutes) — keep checking
          // back until it's ready rather than treating an empty first response as final.
          if (warming) retryTimer = setTimeout(pollRoster, 20_000);
        })
        .catch(() => {
          /* the shared roster is a convenience, not a requirement — sidebar still works without it */
        });
    };
    pollRoster();
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
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
        setAnalyzedPlayers(results);
        setTeams(buildTeams(results, false));
        setTeamOrigin('algo');
        setAiStatus('idle');
        setAiAnalysis(null);
        setChampPicks({});
        setScreen('result');
      }
    }).catch((err) => {
      flashToast(`분석 중 오류가 발생했습니다: ${err instanceof Error ? err.message : ''}`);
      setScreen('input');
    });
  };

  const rates = useMemo(() => (teams ? computeRates(teams, champPicks) : null), [teams, champPicks]);
  // In AI mode (fresh), the win-rate the whole UI consumes is the model's number; everything else
  // (score/form/KDA breakdown) still comes from the algorithm. stale/idle fall back to the algorithm %.
  const activeRates = useMemo(() => {
    if (!rates) return null;
    if (aiStatus === 'fresh' && aiAnalysis) return { ...rates, blue: aiAnalysis.blueWinRate, red: 100 - aiAnalysis.blueWinRate };
    return rates;
  }, [rates, aiStatus, aiAnalysis]);

  const picksForAi = (): AiPick[] =>
    Object.entries(champPicks)
      .map(([puuid, champ]) => ({ puuid, champKey: champ.iconId }))
      .filter((p) => p.champKey);

  // Monotonic id for the in-flight AI request. Any team/pick edit (or a new AI request) bumps it, so a
  // late response from a superseded request is discarded instead of being applied as if it were fresh.
  const aiReqId = useRef(0);

  const runAiMatch = () => {
    if (aiStatus === 'loading' || analyzedPlayers.length < 10) return;
    const myReq = ++aiReqId.current;
    setAiStatus('loading');
    aiMatchmake(analyzedPlayers)
      .then((result) => {
        if (aiReqId.current !== myReq) return; // superseded by an edit → discard stale response
        setTeams(teamsFromAi(result, analyzedPlayers));
        setAiAnalysis({ blueWinRate: result.blueWinRate, analysis: result.analysis, laneMatchups: result.laneMatchups });
        setTeamOrigin('ai');
        setAiStatus('fresh');
        setChampPicks({}); // AI may move players to new lanes → old picks no longer match their slot
        flashToast('AI가 팀을 새로 구성했습니다');
      })
      .catch((err) => {
        if (aiReqId.current !== myReq) return;
        // Teams weren't replaced (we only setTeams on success). If we already had a fresh AI result,
        // restore it so the gauge and the analysis panel stay consistent; otherwise fall back to algo.
        const hadAiResult = teamOrigin === 'ai' && !!aiAnalysis;
        setAiStatus(hadAiResult ? 'fresh' : 'idle');
        flashToast(`AI 매칭 실패 — 기존 결과를 유지합니다: ${err instanceof Error ? err.message : ''}`);
      });
  };

  const runAiReanalyze = () => {
    if (aiStatus === 'loading' || !teams) return;
    const myReq = ++aiReqId.current;
    setAiStatus('loading');
    const blue = teams.blue.map((e) => ({ puuid: e.player.puuid, pos: e.pos }));
    const red = teams.red.map((e) => ({ puuid: e.player.puuid, pos: e.pos }));
    aiAnalyze(blue, red, analyzedPlayers, picksForAi())
      .then((analysis) => {
        if (aiReqId.current !== myReq) return; // discard if the team/picks changed mid-request
        setAiAnalysis(analysis);
        setAiStatus('fresh');
        flashToast('AI 분석을 갱신했습니다');
      })
      .catch((err) => {
        if (aiReqId.current !== myReq) return;
        setAiStatus('stale');
        flashToast(`AI 재분석 실패: ${err instanceof Error ? err.message : ''}`);
      });
  };

  // Any hand-edit invalidates an in-flight or fresh AI analysis. Bumping aiReqId discards a pending
  // response; the status drops to stale (if an AI analysis exists) or idle (mid first-ever match).
  const invalidateAi = () => {
    aiReqId.current += 1;
    setAiStatus((s) => {
      if (s === 'loading') return aiAnalysis ? 'stale' : 'idle';
      if (teamOrigin === 'ai' && s === 'fresh') return 'stale';
      return s;
    });
  };

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
    invalidateAi();
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
    invalidateAi();
  };

  const reshuffle = () => {
    if (!teams) return;
    const players = [...teams.blue, ...teams.red].map((c) => c.player);
    setTeams(buildTeams(players, true));
    aiReqId.current += 1; // discard any in-flight AI response
    setTeamOrigin('algo');
    setAiStatus('idle');
    setAiAnalysis(null);
    flashToast('새로운 조합으로 다시 짰습니다');
  };

  const copyResult = () => {
    if (!teams || !activeRates) return;
    const line = (c: Teams['blue'][number]) => {
      const pick = champPicks[c.player.puuid];
      return `  ${POS_KO[c.pos]} ${c.player.name}#${c.player.tag} (${c.player.tier.text})${pick ? ` — 픽: ${pick.name}` : ''}`;
    };
    const text = `⚔️ 내전 팀 매칭 결과\n\n🔵 BLUE (예상 ${activeRates.blue}%)\n${teams.blue.map(line).join('\n')}\n\n🔴 RED (예상 ${activeRates.red}%)\n${teams.red.map(line).join('\n')}\n\n— PENTABALANCE`;
    navigator.clipboard?.writeText(text).catch(() => {});
    flashToast('디스코드용 텍스트를 복사했습니다');
  };

  const startGame = () => {
    if (!teams || !activeRates) return;
    if (aiStatus === 'loading') return; // don't simulate against teams an in-flight AI match may replace
    const blockers = [...teams.blue, ...teams.red].filter((e) => needsManualPick(e, champPicks));
    if (blockers.length > 0) {
      flashToast(`이 라인 전적이 없는 선수는 챔피언을 직접 선택해주세요: ${blockers.map((e) => e.player.name).join(', ')}`);
      return;
    }
    setGameResult(simulateGame(teams, activeRates, champPicks));
    setScreen('game');
  };

  const reset = () => {
    setScreen('input');
    setTeams(null);
    setAnalyzedPlayers([]);
    aiReqId.current += 1; // discard any in-flight AI response
    setTeamOrigin('algo');
    setAiStatus('idle');
    setAiAnalysis(null);
    setDragSrc(null);
    setChampPicks({});
    setGameResult(null);
  };

  const deleteSaved = (p: { name: string; tag: string }) => {
    forgetPlayer(p.name, p.tag);
    setSaved(getSavedPlayers());
  };

  const startDraft = () => {
    if (!teams) return;
    setScreen('draft');
  };

  const completeDraft = (picks: ChampPicks) => {
    setChampPicks(picks);
    invalidateAi();
    setScreen('result');
    flashToast('모의 드래프트 결과를 반영했습니다');
  };

  const simulateFromDraft = (picks: ChampPicks) => {
    if (!teams) return;
    const blockers = [...teams.blue, ...teams.red].filter((e) => needsManualPick(e, picks));
    if (blockers.length > 0) {
      flashToast(`드래프트가 완료되지 않았습니다: ${blockers.map((e) => e.player.name).join(', ')}`);
      return;
    }
    setChampPicks(picks);
    invalidateAi();
    setGameResult(simulateGame(teams, computeRates(teams, picks), picks));
    setScreen('game');
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
          onClearSlot={clearSlot}
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
      {screen === 'result' && teams && activeRates && (
        <ResultScreen
          teams={teams}
          rates={activeRates}
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
          onStartDraft={startDraft}
          teamOrigin={teamOrigin}
          aiStatus={aiStatus}
          aiAnalysis={aiAnalysis}
          onAiMatch={runAiMatch}
          onAiReanalyze={runAiReanalyze}
        />
      )}
      {screen === 'draft' && teams && (
        <DraftScreen
          teams={teams}
          allChampions={allChampions}
          onComplete={completeDraft}
          onSimulate={simulateFromDraft}
          onCancel={() => setScreen('result')}
        />
      )}
      {screen === 'game' && teams && gameResult && (
        <GameResultScreen teams={teams} result={gameResult} onBackToResult={() => setScreen('result')} onReset={reset} />
      )}
      <Toast message={toast} />
    </div>
  );
}
