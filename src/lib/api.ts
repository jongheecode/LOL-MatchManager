import type {
  AiAnalysis,
  AiMatchResult,
  AiPick,
  AiPlayerInput,
  AiTeamAssignment,
  AnalyzeEvent,
  ChampSummary,
  LookupError,
  LookupResponse,
  Player,
  Position,
} from '../types';

export interface Meta {
  ddragonVersion: string;
  platform: string;
  regional: string;
}

export async function fetchMeta(): Promise<Meta> {
  const res = await fetch('/api/meta');
  if (!res.ok) throw new Error('meta fetch failed');
  return res.json();
}

export async function fetchChampions(): Promise<ChampSummary[]> {
  const res = await fetch('/api/champions');
  if (!res.ok) throw new Error('champions fetch failed');
  const body = await res.json();
  return body.champions as ChampSummary[];
}

/** The shared, server-pinned roster — same list for every visitor, no lookup needed. The server
 * never blocks this request on a cold cache (resolving ~14 players can take minutes), so `warming`
 * tells the caller to poll again shortly instead of treating an empty list as final. */
export async function fetchRoster(): Promise<{ players: Player[]; warming: boolean }> {
  const res = await fetch('/api/roster');
  if (!res.ok) throw new Error('roster fetch failed');
  const body = await res.json();
  return { players: body.players as Player[], warming: !!body.warming };
}

export async function lookupPlayer(name: string, tag: string, signal?: AbortSignal): Promise<LookupResponse | LookupError> {
  const params = new URLSearchParams({ name, tag });
  const res = await fetch(`/api/lookup?${params.toString()}`, { signal });
  const body = await res.json();
  if (!res.ok) {
    return body as LookupError;
  }
  return body as LookupResponse;
}

export interface AnalyzePlayerInput {
  puuid: string;
  name: string;
  tag: string;
  pref: Position | null;
}

/** Streams NDJSON progress events from POST /api/analyze until the response ends. */
export async function analyzeStream(
  players: AnalyzePlayerInput[],
  onEvent: (ev: AnalyzeEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ players }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `analyze failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (line) onEvent(JSON.parse(line) as AnalyzeEvent);
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer.trim()) as AnalyzeEvent);
}

export function playerFromLookup(res: LookupResponse | LookupError): Player | null {
  return res.ok ? res.player : null;
}

/** Reduce a full Player to the anonymized-ready stats the AI backend accepts (no name/tier free strings;
 * champions become Data Dragon keys, empty icons dropped). The backend strips puuid before Gemini. */
export function toAiPlayerInput(p: Player): AiPlayerInput {
  const kda = p.avgStats ? (p.avgStats.kills + p.avgStats.assists) / Math.max(1, p.avgStats.deaths) : null;
  const lanes: AiPlayerInput['lanes'] = {};
  for (const [pos, pool] of Object.entries(p.posChampPool)) {
    const entries = (pool ?? [])
      .filter((e) => e.champ.iconId)
      .slice(0, 3)
      .map((e) => ({ champKey: e.champ.iconId, games: e.games, wr: e.winRate }));
    if (entries.length) lanes[pos as Position] = entries;
  }
  return {
    puuid: p.puuid,
    score: p.score,
    mainPos: p.mainPos,
    pref: p.pref,
    form: p.form,
    mainRoleKda: kda == null ? null : Math.round(kda * 100) / 100,
    lanes,
  };
}

async function postAi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string })?.message || `AI 요청 실패 (${res.status})`);
  return data as T;
}

/** AI composes balanced teams + win rate + analysis from the analyzed players. */
export function aiMatchmake(players: Player[]): Promise<AiMatchResult> {
  return postAi<AiMatchResult>('/api/ai/matchmake', { players: players.map(toAiPlayerInput) });
}

/** AI re-analyzes an already-composed team (e.g. after drag/champ change) — no re-composition. */
export function aiAnalyze(
  blue: AiTeamAssignment[],
  red: AiTeamAssignment[],
  players: Player[],
  picks: AiPick[],
): Promise<AiAnalysis> {
  return postAi<AiAnalysis>('/api/ai/analyze', { blue, red, players: players.map(toAiPlayerInput), picks });
}
