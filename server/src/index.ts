import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PLATFORM, DEFAULT_REGIONAL, PORT, RIOT_API_KEY } from './env.js';
import { getDdragon, startDdragonRefresh, ddragonVersion, allChampions } from './ddragon.js';
import { buildPlayerProfile, resolveAccount } from './profile.js';
import { RiotApiError } from './riot.js';
import { ROSTER } from './roster.js';
import { riotCache } from './cache.js';
import type { AnalyzeEvent, Player, Position } from './types.js';

const app = express();
app.use(cors());
app.use(express.json());

function messageFor(err: unknown): { status: number; message: string } {
  if (err instanceof RiotApiError) {
    if (err.status === 403) return { status: 502, message: 'Riot API 키가 유효하지 않거나 만료되었습니다. server/.env 의 RIOT_API_KEY를 재발급받아 갱신하세요.' };
    if (err.status === 429) return { status: 429, message: 'Riot API 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.' };
    return { status: 502, message: `Riot API 오류 (${err.status})` };
  }
  return { status: 500, message: err instanceof Error ? err.message : '알 수 없는 오류' };
}

app.get('/api/meta', async (_req, res) => {
  try {
    await getDdragon();
  } catch {
    /* fall through with the pinned fallback version */
  }
  res.json({ ddragonVersion: ddragonVersion(), platform: DEFAULT_PLATFORM, regional: DEFAULT_REGIONAL });
});

app.get('/api/champions', async (_req, res) => {
  try {
    await getDdragon();
  } catch {
    /* fall through, allChampions() just returns [] until the next lazy refresh succeeds */
  }
  res.json({ champions: allChampions() });
});

// Resolving all 10 roster members costs ~14 Riot calls each (140 total) — a big chunk of a personal
// key's 100-req/2min budget, so this is cached for a while and always runs at 'low' priority so it
// can never make a real visitor's own lookup/analyze request wait behind it (see queue.ts).
function resolveRoster(): Promise<Player[]> {
  return riotCache.getOrSet<Player[]>('roster:resolved', 30 * 60_000, async () => {
    const resolved = await Promise.all(
      ROSTER.map(async (r) => {
        try {
          const account = await resolveAccount(DEFAULT_REGIONAL, r.name, r.tag, 'low');
          if (!account) return null;
          return await buildPlayerProfile(DEFAULT_PLATFORM, DEFAULT_REGIONAL, account, {
            matchCount: 10,
            includeMastery: false,
            includeLive: false,
            priority: 'low',
          });
        } catch {
          return null;
        }
      }),
    );
    return resolved.filter((p): p is Player => !!p);
  });
}

app.get('/api/roster', async (_req, res) => {
  if (!RIOT_API_KEY) {
    return res.json({ players: [] });
  }
  try {
    res.json({ players: await resolveRoster() });
  } catch (err) {
    const { status, message } = messageFor(err);
    res.status(status).json({ players: [], message });
  }
});

app.get('/api/lookup', async (req, res) => {
  if (!RIOT_API_KEY) {
    return res.status(500).json({ ok: false, code: 'UPSTREAM_ERROR', message: 'RIOT_API_KEY가 설정되지 않았습니다.' });
  }
  const name = String(req.query.name ?? '').trim();
  const tag = String(req.query.tag ?? '').trim() || 'KR1';
  if (name.length < 2) {
    return res.status(400).json({ ok: false, code: 'BAD_REQUEST', message: '닉네임을 2자 이상 입력하세요.' });
  }
  try {
    const account = await resolveAccount(DEFAULT_REGIONAL, name, tag);
    if (!account) {
      return res
        .status(404)
        .json({ ok: false, code: 'NOT_FOUND', message: '존재하지 않는 소환사입니다. 닉네임#태그를 확인하세요' });
    }
    const player = await buildPlayerProfile(DEFAULT_PLATFORM, DEFAULT_REGIONAL, account, {
      matchCount: 10,
      includeMastery: false,
      includeLive: false,
    });
    res.json({ ok: true, player });
  } catch (err) {
    const { status, message } = messageFor(err);
    res.status(status).json({ ok: false, code: 'UPSTREAM_ERROR', message });
  }
});

interface AnalyzeRequestPlayer {
  puuid: string;
  name: string;
  tag: string;
  pref: Position | null;
}

app.post('/api/analyze', async (req, res) => {
  const players = req.body?.players as AnalyzeRequestPlayer[] | undefined;
  if (!RIOT_API_KEY) {
    return res.status(500).json({ message: 'RIOT_API_KEY가 설정되지 않았습니다.' });
  }
  if (!Array.isArray(players) || players.length !== 10) {
    return res.status(400).json({ message: '정확히 10명의 플레이어 정보가 필요합니다.' });
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders?.();

  const write = (ev: AnalyzeEvent) => res.write(`${JSON.stringify(ev)}\n`);

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    write({ type: 'start', index: i, name: p.name });
    try {
      const player = await buildPlayerProfile(
        DEFAULT_PLATFORM,
        DEFAULT_REGIONAL,
        { puuid: p.puuid, gameName: p.name, tagLine: p.tag },
        {
          matchCount: 20,
          includeMastery: true,
          includeLive: true,
          onPhase: (phase) => write({ type: 'phase', index: i, name: p.name, phase }),
        },
      );
      player.pref = p.pref;
      write({ type: 'done', index: i, player });
    } catch (err) {
      const { message } = messageFor(err);
      write({ type: 'error', index: i, message });
    }
  }
  write({ type: 'complete' });
  res.end();
});

// Serve the built frontend from the same origin/port so the whole app is one deployable
// service (no separate static host, no CORS to think about). `dist` sits two levels up from
// this file whether we're running compiled (server/dist/index.js) or via tsx (server/src/index.ts).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  // eslint-disable-next-line no-console
  console.log(`[pentabalance] serving frontend build from ${clientDist}`);
}

async function main() {
  await getDdragon().catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[pentabalance] failed to preload Data Dragon champion data, will retry lazily:', err);
  });
  startDdragonRefresh();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[pentabalance] server listening on http://localhost:${PORT} (platform=${DEFAULT_PLATFORM}, regional=${DEFAULT_REGIONAL})`);
  });
  // Warm the roster cache in the background (low priority) so it's usually ready before anyone
  // asks for it, without delaying server startup or an early visitor's own request.
  if (RIOT_API_KEY) {
    resolveRoster().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[pentabalance] roster warmup failed, will retry lazily on next request:', err);
    });
  }
}

void main();
