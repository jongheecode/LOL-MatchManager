import { AI_GLOBAL_DAILY_LIMIT, AI_IP_LIMIT_PER_MINUTE, AI_MAX_CONCURRENT } from './env.js';
import { TtlCache } from './cache.js';
import type { AiRunner } from './aiMatch.js';

const CACHE_TTL_MS = 5 * 60_000;
const DAY_MS = 24 * 60 * 60_000;
const MINUTE_MS = 60_000;
const SWEEP_EVERY = 1000;

/** Global daily Gemini budget exhausted (rolling 24h) — maps to 503. */
export class DailyLimitError extends Error {
  constructor() {
    super('오늘 AI 사용 한도를 초과했습니다. 잠시 후 다시 시도하세요.');
    this.name = 'DailyLimitError';
  }
}

/** Too many AI requests in flight at once — maps to 429. */
export class ConcurrencyError extends Error {
  constructor() {
    super('AI 요청이 혼잡합니다. 잠시 후 다시 시도하세요.');
    this.name = 'ConcurrencyError';
  }
}

/**
 * Free-tier protection around Gemini calls. TtlCache.getOrSet() does NOT merge concurrent
 * callers, so single-flight, the concurrency limit, the rolling daily budget, and the anonymous
 * result cache all live here. Only the leader (cache miss) acquires a concurrency slot and consumes
 * daily budget; followers just await the in-flight promise, and cache hits skip both.
 *
 * NOTE: the cache stores anonymized (P0x) results only — never a value carrying a real puuid.
 */
export class AiGuard implements AiRunner {
  private cache = new TtlCache();
  private inFlight = new Map<string, Promise<unknown>>();
  private active = 0;
  private dailyHits: number[] = [];
  private ipHits = new Map<string, number[]>();
  private ops = 0;

  /** Per-IP per-minute limit. Counts cache hits too (called by the route before run). */
  checkIp(ip: string): boolean {
    this.maybeSweep();
    const now = Date.now();
    const arr = (this.ipHits.get(ip) ?? []).filter((t) => now - t < MINUTE_MS);
    if (arr.length >= AI_IP_LIMIT_PER_MINUTE) {
      this.ipHits.set(ip, arr);
      return false;
    }
    arr.push(now);
    this.ipHits.set(ip, arr);
    return true;
  }

  /** Counts one real Gemini fetch against the rolling-24h budget. Throws when exhausted. */
  consumeDailyAttempt(): void {
    const now = Date.now();
    this.dailyHits = this.dailyHits.filter((t) => now - t < DAY_MS);
    if (this.dailyHits.length >= AI_GLOBAL_DAILY_LIMIT) throw new DailyLimitError();
    this.dailyHits.push(now);
  }

  async run<T>(cacheKey: string, leader: () => Promise<T>): Promise<T> {
    const cached = this.cache.get<T>(cacheKey);
    if (cached !== undefined) return cached; // cache hit — no slot, no daily budget

    const existing = this.inFlight.get(cacheKey);
    if (existing) return (await existing) as T; // follower — no slot, no daily budget

    if (this.active >= AI_MAX_CONCURRENT) throw new ConcurrencyError();
    this.active += 1;
    const promise = (async () => {
      const value = await leader();
      this.cache.set(cacheKey, value, CACHE_TTL_MS); // only successful results are cached
      return value;
    })();
    this.inFlight.set(cacheKey, promise);
    try {
      return (await promise) as T;
    } finally {
      this.active -= 1;
      // Clear on success, failure, and timeout so a rejected promise never wedges the key.
      if (this.inFlight.get(cacheKey) === promise) this.inFlight.delete(cacheKey);
    }
  }

  /** Periodically drop stale per-IP entries so IP churn can't grow the map without bound. */
  private maybeSweep(): void {
    if ((this.ops += 1) < SWEEP_EVERY) return;
    this.ops = 0;
    const now = Date.now();
    for (const [ip, arr] of this.ipHits) {
      const fresh = arr.filter((t) => now - t < MINUTE_MS);
      if (fresh.length) this.ipHits.set(ip, fresh);
      else this.ipHits.delete(ip);
    }
  }
}

export const aiGuard = new AiGuard();
