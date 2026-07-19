import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AiGuard, ConcurrencyError, DailyLimitError } from './aiGuard.js';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('single-flight: concurrent same-key callers share one leader run', async () => {
  const g = new AiGuard();
  let calls = 0;
  const leader = async () => {
    calls += 1;
    await delay(10);
    return { v: 1 };
  };
  const [a, b] = await Promise.all([g.run('k', leader), g.run('k', leader)]);
  assert.equal(calls, 1);
  assert.deepEqual(a, b);
});

test('single-flight: a failed leader is cleared so the next same-key request retries', async () => {
  const g = new AiGuard();
  let calls = 0;
  const bad = async () => {
    calls += 1;
    throw new Error('boom');
  };
  await assert.rejects(g.run('k', bad));
  await assert.rejects(g.run('k', bad));
  assert.equal(calls, 2);
});

test('cache: a hit returns the stored value without re-running the leader', async () => {
  const g = new AiGuard();
  let calls = 0;
  const v1 = await g.run('k', async () => {
    calls += 1;
    return { n: 1 };
  });
  const v2 = await g.run('k', async () => {
    calls += 1;
    return { n: 2 };
  });
  assert.equal(calls, 1);
  assert.deepEqual(v1, { n: 1 });
  assert.deepEqual(v2, { n: 1 });
});

test('concurrency: exceeding AI_MAX_CONCURRENT (default 2) throws ConcurrencyError', async () => {
  const g = new AiGuard();
  const block = () => new Promise<number>(() => {}); // never resolves — holds the slot
  void g.run('a', block);
  void g.run('b', block);
  await assert.rejects(
    g.run('c', async () => 1),
    (e) => e instanceof ConcurrencyError,
  );
});

test('IP limit: default 2/min per IP, independent per address', () => {
  const g = new AiGuard();
  assert.equal(g.checkIp('1.1.1.1'), true);
  assert.equal(g.checkIp('1.1.1.1'), true);
  assert.equal(g.checkIp('1.1.1.1'), false);
  assert.equal(g.checkIp('2.2.2.2'), true);
});

test('daily budget: default 50 attempts then DailyLimitError', () => {
  const g = new AiGuard();
  for (let i = 0; i < 50; i++) g.consumeDailyAttempt();
  assert.throws(() => g.consumeDailyAttempt(), (e) => e instanceof DailyLimitError);
});
