import { describe, it, expect } from 'vitest';
import { generateSeedLog } from './seed';
import { isGym, isMatch } from '../log/types';

describe('generateSeedLog', () => {
  const log = generateSeedLog('2026-06-21', 26);

  it('produces a populated, mixed history', () => {
    expect(log.length).toBeGreaterThan(60);
    expect(log.some(isGym)).toBe(true);
    expect(log.some(isMatch)).toBe(true);
  });

  it('never generates dates in the future', () => {
    expect(log.every((e) => e.date <= '2026-06-21')).toBe(true);
  });

  it('is deterministic', () => {
    const a = generateSeedLog('2026-06-21', 26).map((e) => `${e.kind}:${e.date}`);
    const b = generateSeedLog('2026-06-21', 26).map((e) => `${e.kind}:${e.date}`);
    expect(a).toEqual(b);
  });

  it('C sessions carry a conditioning type', () => {
    const cSessions = log.filter((e) => isGym(e) && e.session === 'C');
    expect(cSessions.length).toBeGreaterThan(0);
    expect(cSessions.every((e) => isGym(e) && !!e.cType)).toBe(true);
  });
});
