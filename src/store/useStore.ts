import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { parseProgram, safeParseProgram, type Program } from '../program/schema';
import type { GymEntry, LogEntry, MatchEntry } from '../log/types';
import programData from '../data/program.json';
import { newId, nowISO } from '../lib/clock';
import { idbStorage } from './idbStorage';
import { mergeRemote, type Tombstone } from '../sync/merge';

const defaultProgram = parseProgram(programData);

interface State {
  program: Program;
  /** 'builtin' = follow the bundled program.json; 'custom' = a JSON the user uploaded. */
  programSource: 'builtin' | 'custom';
  log: LogEntry[];
  /** Outbox: ids of entries changed locally and not yet pushed to the cloud. */
  dirty: string[];
  /** Outbox: soft-deletes not yet pushed. */
  tombstones: Tombstone[];
  /** Access session lapsed — sync can't succeed until the user signs in again. */
  authRequired: boolean;
  setAuthRequired: (v: boolean) => void;
  /** Replace the program from a dropped JSON value. Returns an error string on failure. */
  loadProgram: (input: unknown) => string | null;
  resetProgram: () => void;
  addGym: (e: Omit<GymEntry, 'id' | 'kind' | 'updatedAt'>) => void;
  addMatch: (e: Omit<MatchEntry, 'id' | 'kind' | 'updatedAt'>) => void;
  /** Replace an existing entry by id (bumps updatedAt, marks dirty). */
  updateEntry: (entry: LogEntry) => void;
  deleteEntry: (id: string) => void;
  /** Merge entries pulled from the cloud (last-write-wins). */
  applyRemote: (entries: LogEntry[]) => void;
  /** Merge entries from a backup file. Returns how many were added or updated. */
  importEntries: (entries: LogEntry[]) => number;
  /** Clear outbox items confirmed pushed. */
  clearSynced: (upsertIds: string[], deleteIds: string[]) => void;
  /** Replace the whole log (demo data / clear). Resets the outbox. */
  replaceLog: (entries: LogEntry[]) => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      program: defaultProgram,
      programSource: 'builtin',
      log: [],
      dirty: [],
      tombstones: [],
      authRequired: false,
      setAuthRequired: (v) => set((s) => (s.authRequired === v ? s : { authRequired: v })),
      loadProgram: (input) => {
        const res = safeParseProgram(input);
        if (!res.success) {
          return res.error.issues
            .slice(0, 4)
            .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
            .join('\n');
        }
        set({ program: res.data, programSource: 'custom' });
        return null;
      },
      resetProgram: () => set({ program: defaultProgram, programSource: 'builtin' }),
      addGym: (e) =>
        set((s) => {
          const entry: LogEntry = { ...e, id: newId(), kind: 'gym', updatedAt: nowISO() };
          return { log: [...s.log, entry], dirty: [...s.dirty, entry.id] };
        }),
      addMatch: (e) =>
        set((s) => {
          const entry: LogEntry = { ...e, id: newId(), kind: 'match', updatedAt: nowISO() };
          return { log: [...s.log, entry], dirty: [...s.dirty, entry.id] };
        }),
      updateEntry: (entry) =>
        set((s) => {
          const updated = { ...entry, updatedAt: nowISO() };
          return {
            log: s.log.map((x) => (x.id === entry.id ? updated : x)),
            dirty: s.dirty.includes(entry.id) ? s.dirty : [...s.dirty, entry.id],
          };
        }),
      deleteEntry: (id) =>
        set((s) => ({
          log: s.log.filter((x) => x.id !== id),
          dirty: s.dirty.filter((d) => d !== id),
          tombstones: [...s.tombstones.filter((t) => t.id !== id), { id, updatedAt: nowISO() }],
        })),
      applyRemote: (entries) =>
        set((s) => ({ log: mergeRemote(s.log, entries, s.tombstones) })),
      importEntries: (entries) => {
        let merged = 0;
        set((s) => {
          const before = new Map(s.log.map((e) => [e.id, e.updatedAt]));
          const next = mergeRemote(s.log, entries, s.tombstones);
          // Anything new or newer than what we had needs backing up too.
          const changed = next.filter((e) => before.get(e.id) !== e.updatedAt).map((e) => e.id);
          merged = changed.length;
          return { log: next, dirty: [...new Set([...s.dirty, ...changed])] };
        });
        return merged;
      },
      clearSynced: (upsertIds, deleteIds) =>
        set((s) => ({
          dirty: s.dirty.filter((d) => !upsertIds.includes(d)),
          tombstones: s.tombstones.filter((t) => !deleteIds.includes(t.id)),
        })),
      replaceLog: (entries) => set({ log: entries, dirty: [], tombstones: [] }),
    }),
    {
      name: 'mygym',
      storage: createJSONStorage(() => idbStorage),
      // Persist program, log, and the outbox so pending syncs survive a reload.
      partialize: (s) => ({
        program: s.program,
        programSource: s.programSource,
        log: s.log,
        dirty: s.dirty,
        tombstones: s.tombstones,
      }),
      // Keep the persisted log/outbox, but for a built-in program always follow the
      // latest bundled program.json (only a user-uploaded 'custom' program persists).
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        const isCustom = p.programSource === 'custom';
        return {
          ...current,
          ...p,
          program: isCustom && p.program ? p.program : current.program,
          programSource: isCustom ? 'custom' : 'builtin',
        };
      },
    },
  ),
);

/** Count of local changes not yet backed up to the cloud. */
export function usePendingCount(): number {
  return useStore((s) => s.dirty.length + s.tombstones.length);
}

/** React hook: true once persisted state has been read back from IndexedDB. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    if (useStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}
