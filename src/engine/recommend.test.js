import { describe, it, expect } from 'vitest';
import { parseProgram } from '../program/schema';
import programData from '../data/program.json';
import { recommend } from './recommend';
import { gym, match } from '../test/factory';
const program = parseProgram(programData);
describe('recommend — backbone', () => {
    it('no history → start with A', () => {
        const r = recommend(program, [], '2026-06-15');
        expect(r.nextSession).toBe('A');
        expect(r.slot3Next).toBe('copenhagen');
    });
    it('after A, no futsal this week → B (loads legs)', () => {
        // Wednesday, mid-week, no upcoming football within 48h.
        const r = recommend(program, [gym('2026-06-15', 'A')], '2026-06-17');
        expect(r.nextSession).toBe('B');
        expect(r.reason).toMatch(/futsal/i);
    });
    it('after A, futsal logged this week → C with a conditioning variant', () => {
        const log = [gym('2026-06-15', 'A'), match('2026-06-18', 'futsal')];
        const r = recommend(program, log, '2026-06-19');
        expect(r.nextSession).toBe('C');
        expect(r.cTypeNext).toBe('RSA');
    });
    it('after B or C → next is A', () => {
        expect(recommend(program, [gym('2026-06-16', 'B')], '2026-06-18').nextSession).toBe('A');
        expect(recommend(program, [gym('2026-06-16', 'C', { cType: 'RSA' })], '2026-06-18').nextSession).toBe('A');
    });
    it('preferHeavy forces C on a non-futsal week', () => {
        const r = recommend(program, [gym('2026-06-15', 'A')], '2026-06-17', { preferHeavy: true });
        expect(r.nextSession).toBe('C');
    });
});
describe('recommend — hard rules', () => {
    it('never B within 48h of a logged match → swap to A', () => {
        const log = [gym('2026-06-10', 'A'), match('2026-06-15', 'football')];
        const r = recommend(program, log, '2026-06-16'); // day after Monday football
        expect(r.nextSession).toBe('A');
        expect(r.warnings.join(' ')).toMatch(/48h/);
    });
    it('never B the day before the regular Monday football fixture', () => {
        // Sunday: B was due, but Monday football is within 48h via the schedule.
        const r = recommend(program, [gym('2026-06-12', 'A')], '2026-06-21');
        expect(r.nextSession).toBe('A');
        expect(r.warnings.length).toBeGreaterThan(0);
    });
    it('two futsal weeks without leg loading → C gets the leg append', () => {
        const log = [
            gym('2026-06-15', 'A'),
            match('2026-06-11', 'futsal'), // previous ISO week
            match('2026-06-18', 'futsal'), // current ISO week
        ];
        const r = recommend(program, log, '2026-06-19');
        expect(r.nextSession).toBe('C');
        expect(r.legAppend).toBe(true);
        expect(r.warnings.join(' ')).toMatch(/Squat 2×5 \+ RDL 2×8/);
    });
    it('single futsal week does not trigger the leg append', () => {
        const log = [gym('2026-06-15', 'A'), match('2026-06-18', 'futsal')];
        const r = recommend(program, log, '2026-06-19');
        expect(r.legAppend).toBeUndefined();
    });
});
