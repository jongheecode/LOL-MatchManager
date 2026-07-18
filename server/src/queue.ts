function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type Priority = 'high' | 'low';

/**
 * Serializes Riot API calls so we never exceed the personal-key app rate limit
 * (20 requests/1s, 100 requests/2min). Runs one request at a time; a burst of
 * 10 players x ~13 calls each safely spreads itself over the analyzing screen
 * instead of tripping 429s.
 *
 * Two priority lanes share the same rate budget: 'high' (an actual visitor waiting
 * on a lookup/analyze) vs 'low' (background work like warming the shared roster).
 * 'low' is only allowed to dispatch while there's real headroom under both windows —
 * it always leaves slack so a 'high' request that shows up mid-burst gets a slot
 * within ~1s instead of queueing behind however much background work is in flight.
 */
export class RiotRateLimiter {
  private highQueue: Array<() => Promise<void>> = [];
  private lowQueue: Array<() => Promise<void>> = [];
  private shortTimestamps: number[] = [];
  private longTimestamps: number[] = [];
  private pumping = false;

  constructor(
    private shortLimit = 18,
    private shortWindowMs = 1000,
    private longLimit = 95,
    private longWindowMs = 120_000,
    /** Slots reserved for 'high' priority — 'low' priority backs off once this close to the caps. */
    private lowHeadroomShort = 6,
    private lowHeadroomLong = 30,
  ) {}

  schedule<T>(fn: () => Promise<T>, priority: Priority = 'high'): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        }
      };
      (priority === 'high' ? this.highQueue : this.lowQueue).push(task);
      void this.pump();
    });
  }

  private async pump() {
    if (this.pumping) return;
    this.pumping = true;
    while (this.highQueue.length || this.lowQueue.length) {
      const task = await this.waitAndTake();
      if (!task) continue;
      const now = Date.now();
      this.shortTimestamps.push(now);
      this.longTimestamps.push(now);
      await task();
    }
    this.pumping = false;
  }

  private prune() {
    const now = Date.now();
    this.shortTimestamps = this.shortTimestamps.filter((t) => now - t < this.shortWindowMs);
    this.longTimestamps = this.longTimestamps.filter((t) => now - t < this.longWindowMs);
  }

  private async waitAndTake(): Promise<(() => Promise<void>) | null> {
    for (;;) {
      this.prune();
      const shortCount = this.shortTimestamps.length;
      const longCount = this.longTimestamps.length;

      if (this.highQueue.length && shortCount < this.shortLimit && longCount < this.longLimit) {
        return this.highQueue.shift()!;
      }
      if (
        this.lowQueue.length &&
        shortCount < this.shortLimit - this.lowHeadroomShort &&
        longCount < this.longLimit - this.lowHeadroomLong
      ) {
        return this.lowQueue.shift()!;
      }
      if (!this.highQueue.length && !this.lowQueue.length) return null;

      // Nothing dispatchable this instant (rate-capped, or only low-priority work left without
      // headroom) — a short fixed poll is simpler and safer here than computing an exact wake
      // time across two independent caps plus a reserve margin.
      await sleep(60);
    }
  }
}

export const riotLimiter = new RiotRateLimiter();
