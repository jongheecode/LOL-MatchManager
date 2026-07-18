function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Serializes Riot API calls so we never exceed the personal-key app rate limit
 * (20 requests/1s, 100 requests/2min). Runs one request at a time; a burst of
 * 10 players x ~13 calls each safely spreads itself over the analyzing screen
 * instead of tripping 429s.
 */
export class RiotRateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private shortTimestamps: number[] = [];
  private longTimestamps: number[] = [];
  private pumping = false;

  constructor(
    private shortLimit = 18,
    private shortWindowMs = 1000,
    private longLimit = 95,
    private longWindowMs = 120_000,
  ) {}

  schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        }
      });
      void this.pump();
    });
  }

  private async pump() {
    if (this.pumping) return;
    this.pumping = true;
    while (this.queue.length) {
      await this.waitForSlot();
      const task = this.queue.shift()!;
      const now = Date.now();
      this.shortTimestamps.push(now);
      this.longTimestamps.push(now);
      await task();
    }
    this.pumping = false;
  }

  private async waitForSlot() {
    for (;;) {
      const now = Date.now();
      this.shortTimestamps = this.shortTimestamps.filter((t) => now - t < this.shortWindowMs);
      this.longTimestamps = this.longTimestamps.filter((t) => now - t < this.longWindowMs);
      const shortOk = this.shortTimestamps.length < this.shortLimit;
      const longOk = this.longTimestamps.length < this.longLimit;
      if (shortOk && longOk) return;
      const waits: number[] = [];
      if (!shortOk) waits.push(this.shortWindowMs - (now - this.shortTimestamps[0]));
      if (!longOk) waits.push(this.longWindowMs - (now - this.longTimestamps[0]));
      await sleep(Math.max(25, Math.min(...waits)));
    }
  }
}

export const riotLimiter = new RiotRateLimiter();
