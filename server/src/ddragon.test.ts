import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDdragon } from './ddragon.js';

// Runs in its own process (node --test isolates per file), so the module-level ddragon cache
// starts empty here.
test('getDdragon: a failed first load is not cached — a later call retries and succeeds', async () => {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async (url: string | URL) => {
    calls += 1;
    if (calls === 1) throw new Error('network down'); // first versions.json fetch fails
    if (String(url).includes('versions.json')) return { json: async () => ['14.1.1'] } as unknown as Response;
    return { json: async () => ({ data: { Ahri: { id: 'Ahri', key: '103', name: '아리' } } }) } as unknown as Response;
  }) as typeof fetch;

  try {
    await assert.rejects(getDdragon()); // first attempt fails
    const state = await getDdragon(); // must retry (not return the cached rejection)
    assert.equal(state.version, '14.1.1');
    assert.ok(state.byEnglishKey.get('Ahri'));
    assert.ok(calls >= 3); // fetch actually ran again on the retry
  } finally {
    globalThis.fetch = realFetch;
  }
});
