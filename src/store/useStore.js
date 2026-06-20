import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { parseProgram, safeParseProgram } from '../program/schema';
import programData from '../data/program.json';
import { newId, nowISO } from '../lib/clock';
const defaultProgram = parseProgram(programData);
export const useStore = create()(persist((set) => ({
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
    addGym: (e) => set((s) => ({
        log: [...s.log, { ...e, id: newId(), kind: 'gym', updatedAt: nowISO() }],
    })),
    addMatch: (e) => set((s) => ({
        log: [...s.log, { ...e, id: newId(), kind: 'match', updatedAt: nowISO() }],
    })),
    deleteEntry: (id) => set((s) => ({ log: s.log.filter((x) => x.id !== id) })),
}), {
    name: 'mygym',
    // Persist the log always; program only matters if customized (kept for simplicity).
    partialize: (s) => ({ program: s.program, log: s.log }),
}));
