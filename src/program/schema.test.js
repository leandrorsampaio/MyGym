import { describe, it, expect } from 'vitest';
import { parseProgram, safeParseProgram } from './schema';
import programData from '../data/program.json';
describe('program schema', () => {
    it('validates the real converted v6 program', () => {
        const p = parseProgram(programData);
        expect(p.version).toBe('v6');
        expect(p.workouts.A.type).toBe('strength');
        expect(p.workouts.C.type).toBe('conditioning');
    });
    it('captures the program structure from trainning.md', () => {
        const p = parseProgram(programData);
        // Core Finisher slot 3 rotates through 3 options.
        const slot3 = p.coreFinisher.slots.find((s) => s.rotates);
        expect(slot3?.options.map((o) => o.key)).toEqual(['copenhagen', 'side', 'suitcase']);
        // Conditioning alternates between RSA and VO2max.
        expect(p.workouts.C.alternates.map((a) => a.key)).toEqual(['RSA', 'VO2max']);
        // Supersets carry multiple movements.
        const arms = p.workouts.A.items.find((i) => i.label === 'Arms superset');
        expect(arms?.movements).toHaveLength(2);
        // Athletic Prep is tiered.
        expect(p.athleticPrep.items.every((i) => i.tier === 'T1' || i.tier === 'T2')).toBe(true);
    });
    it('rejects malformed input with a useful result', () => {
        const res = safeParseProgram({ version: 'x' });
        expect(res.success).toBe(false);
    });
    it('rejects a bad video URL', () => {
        const bad = structuredClone(programData);
        bad.workouts.A.items[0].movements[0].video = 'not-a-url';
        expect(safeParseProgram(bad).success).toBe(false);
    });
});
