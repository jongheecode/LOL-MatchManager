import { useCallback, useMemo, useRef, useState } from 'react';
import type { Position, SavedPlayer, Slot } from '../types';
import { lookupPlayer } from '../lib/api';
import { rememberPlayer } from '../lib/storage';

const EMPTY_SLOT: Slot = { query: '', status: 'empty', data: null, pref: null };

function makeSlots(): Slot[] {
  return Array.from({ length: 10 }, () => ({ ...EMPTY_SLOT }));
}

function parseQuery(q: string): { name: string; tag: string } {
  if (q.includes('#')) {
    const [name, tag] = q.split('#');
    return { name: name.trim(), tag: tag.trim() };
  }
  return { name: q.trim(), tag: '' };
}

export function useSlots(region: string) {
  const [slots, setSlots] = useState<Slot[]>(makeSlots);
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const requestIds = useRef<number[]>(Array.from({ length: 10 }, () => 0));

  const patchSlot = useCallback((i: number, patch: Partial<Slot>) => {
    setSlots((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }, []);

  const setQuery = useCallback(
    (i: number, query: string) => {
      patchSlot(i, { query });
    },
    [patchSlot],
  );

  /** Looks up a Riot ID and lands the result (or error) into slot i, ignoring stale responses. */
  const runLookup = useCallback(
    async (i: number, name: string, tag: string) => {
      if (name.length < 2) {
        patchSlot(i, { status: 'error', data: null, errorMessage: '닉네임을 2자 이상 입력하세요' });
        return;
      }
      const myRequestId = ++requestIds.current[i];
      patchSlot(i, { status: 'loading' });
      const res = await lookupPlayer(name, tag);
      if (requestIds.current[i] !== myRequestId) return; // superseded by a newer edit
      if (res.ok) {
        patchSlot(i, { status: 'done', data: res.player, errorMessage: undefined });
        rememberPlayer(res.player, region);
      } else {
        patchSlot(i, { status: 'error', data: null, errorMessage: res.message });
      }
    },
    [patchSlot, region],
  );

  const commit = useCallback(
    (i: number) => {
      const q = slotsRef.current[i]?.query ?? '';
      if (!q.trim()) {
        requestIds.current[i]++;
        patchSlot(i, { status: 'empty', data: null });
        return;
      }
      const { name, tag } = parseQuery(q);
      void runLookup(i, name, tag);
    },
    [patchSlot, runLookup],
  );

  const togglePref = useCallback((i: number, pos: Position) => {
    setSlots((prev) => {
      const next = prev.slice();
      const cur = next[i];
      next[i] = { ...cur, pref: cur.pref === pos ? null : pos };
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    requestIds.current = requestIds.current.map((n) => n + 1);
    setSlots(makeSlots());
  }, []);

  const fillFromSaved = useCallback(
    (saved: SavedPlayer) => {
      const idx = slotsRef.current.findIndex((s) => s.status === 'empty' || s.status === 'error');
      if (idx < 0) return;
      patchSlot(idx, { query: `${saved.name} #${saved.tag}` });
      void runLookup(idx, saved.name, saved.tag);
    },
    [patchSlot, runLookup],
  );

  const fillManyFromSaved = useCallback(
    (savedList: SavedPlayer[]) => {
      const cur = slotsRef.current;
      const openIdx = cur.map((_, i) => i).filter((i) => cur[i].status === 'empty' || cur[i].status === 'error');
      const used = new Set(cur.filter((s) => s.data).map((s) => `${s.data!.name}#${s.data!.tag}`));
      const candidates = savedList.filter((p) => !used.has(`${p.name}#${p.tag}`));
      openIdx.forEach((slotIdx, k) => {
        const cand = candidates[k];
        if (!cand) return;
        patchSlot(slotIdx, { query: `${cand.name} #${cand.tag}` });
        void runLookup(slotIdx, cand.name, cand.tag);
      });
    },
    [patchSlot, runLookup],
  );

  const filledCount = useMemo(() => slots.filter((s) => s.status === 'done').length, [slots]);

  return { slots, setQuery, commit, togglePref, clearAll, fillFromSaved, fillManyFromSaved, filledCount };
}
