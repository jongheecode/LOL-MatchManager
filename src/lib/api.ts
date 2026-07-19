import type { AnalyzeEvent, ChampSummary, LookupError, LookupResponse, Player, Position } from '../types';

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
