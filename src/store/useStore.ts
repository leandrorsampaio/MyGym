import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { parseProgram, safeParseProgram, type Program } from '../program/schema';
import type { GymEntry, LogEntry, MatchEntry } from '../log/types';
import programData from '../data/program.json';
import { newId, nowISO } from '../lib/clock';
import { idbStorage } from './idbStorage';

const defaultProgram = parseProgram(programData);

interface State {
  program: Program;
  log: LogEntry[];
  /** Replace the program from a dropped JSON value. Returns an error string on failure. */
  loadProgram: (input: unknown) => string | null;
  resetProgram: () => void;
  addGym: (e: Omit<GymEntry, 'id' | 'kind' | 'updatedAt'>) => void;
  addMatch: (e: Omit<MatchEntry, 'id' | 'kind' | 'updatedAt'>) => void;
  deleteEntry: (id: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      program: defaultProgram,
      log: [],
      loadProgram: (input) => {
        const res = safeParseProgram(input);
        if (!res.success) {
          return res.error.issues
            .slice(0, 4)
            .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
            .join('\n');
        }
        set({ program: res.data });
        return null;
      },
      resetProgram: () => set({ program: defaultProgram }),
      addGym: (e) =>
        set((s) => ({
          log: [...s.log, { ...e, id: newId(), kind: 'gym', updatedAt: nowISO() }],
        })),
      addMatch: (e) =>
        set((s) => ({
          log: [...s.log, { ...e, id: newId(), kind: 'match', updatedAt: nowISO() }],
        })),
      deleteEntry: (id) => set((s) => ({ log: s.log.filter((x) => x.id !== id) })),
    }),
    {
      name: 'mygym',
      storage: createJSONStorage(() => idbStorage),
      // Persist the log always; program only matters if customized (kept for simplicity).
      partialize: (s) => ({ program: s.program, log: s.log }),
    },
  ),
);

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
