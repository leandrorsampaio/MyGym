import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { parseProgram, safeParseProgram } from '../program/schema';
import programData from '../data/program.json';
import { newId, nowISO } from '../lib/clock';
import { idbStorage } from './idbStorage';
import { mergeRemote } from '../sync/merge';
const defaultProgram = parseProgram(programData);
export const useStore = create()(persist((set) => ({
    program: defaultProgram,
    log: [],
    dirty: [],
    tombstones: [],
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
    addGym: (e) => set((s) => {
        const entry = { ...e, id: newId(), kind: 'gym', updatedAt: nowISO() };
        return { log: [...s.log, entry], dirty: [...s.dirty, entry.id] };
    }),
    addMatch: (e) => set((s) => {
        const entry = { ...e, id: newId(), kind: 'match', updatedAt: nowISO() };
        return { log: [...s.log, entry], dirty: [...s.dirty, entry.id] };
    }),
    deleteEntry: (id) => set((s) => ({
        log: s.log.filter((x) => x.id !== id),
        dirty: s.dirty.filter((d) => d !== id),
        tombstones: [...s.tombstones.filter((t) => t.id !== id), { id, updatedAt: nowISO() }],
    })),
    applyRemote: (entries) => set((s) => ({ log: mergeRemote(s.log, entries, s.tombstones) })),
    clearSynced: (upsertIds, deleteIds) => set((s) => ({
        dirty: s.dirty.filter((d) => !upsertIds.includes(d)),
        tombstones: s.tombstones.filter((t) => !deleteIds.includes(t.id)),
    })),
}), {
    name: 'mygym',
    storage: createJSONStorage(() => idbStorage),
    // Persist program, log, and the outbox so pending syncs survive a reload.
    partialize: (s) => ({
        program: s.program,
        log: s.log,
        dirty: s.dirty,
        tombstones: s.tombstones,
    }),
}));
/** Count of local changes not yet backed up to the cloud. */
export function usePendingCount() {
    return useStore((s) => s.dirty.length + s.tombstones.length);
}
/** React hook: true once persisted state has been read back from IndexedDB. */
export function useHydrated() {
    const [hydrated, setHydrated] = useState(() => useStore.persist.hasHydrated());
    useEffect(() => {
        const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
        if (useStore.persist.hasHydrated())
            setHydrated(true);
        return unsub;
    }, []);
    return hydrated;
}
