import { describe, it, expect } from 'vitest';
import { parseProgram } from '../program/schema';
import programData from '../data/program.json';
import { nextCType, nextSlot3 } from './rotation';
import { gym } from '../test/factory';
const program = parseProgram(programData);
describe('rotation (derived from log)', () => {
    it('nextCType starts at RSA, then alternates', () => {
        expect(nextCType(program, [])).toBe('RSA');
        expect(nextCType(program, [gym('2026-06-10', 'C', { cType: 'RSA' })])).toBe('VO2max');
        expect(nextCType(program, [gym('2026-06-10', 'C', { cType: 'VO2max' })])).toBe('RSA');
    });
    it('nextCType uses the most recent C session', () => {
        const log = [
            gym('2026-06-01', 'C', { cType: 'RSA' }),
            gym('2026-06-12', 'C', { cType: 'VO2max' }),
        ];
        expect(nextCType(program, log)).toBe('RSA');
    });
    it('nextSlot3 cycles copenhagen → side → suitcase → copenhagen', () => {
        expect(nextSlot3(program, [])).toBe('copenhagen');
        expect(nextSlot3(program, [gym('2026-06-10', 'A', { slot3: 'copenhagen' })])).toBe('side');
        expect(nextSlot3(program, [gym('2026-06-10', 'A', { slot3: 'side' })])).toBe('suitcase');
        expect(nextSlot3(program, [gym('2026-06-10', 'A', { slot3: 'suitcase' })])).toBe('copenhagen');
    });
    it('slot3 advances on every gym session regardless of A/B/C', () => {
        const log = [
            gym('2026-06-01', 'A', { slot3: 'copenhagen' }),
            gym('2026-06-05', 'B', { slot3: 'side' }),
        ];
        expect(nextSlot3(program, log)).toBe('suitcase');
    });
});
