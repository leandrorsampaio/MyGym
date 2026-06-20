import { describe, it, expect } from 'vitest';
import { isoWeekday, isoWeekKey, daysBetween, daysApart, addDays, parseDate } from './dates';

// Reference anchors (all in 2026):
//   2026-06-15 = Monday, 2026-06-18 = Thursday, 2026-06-21 = Sunday, 2026-06-22 = Monday
describe('dates', () => {
  it('isoWeekday: Monday=1 … Sunday=7', () => {
    expect(isoWeekday('2026-06-15')).toBe(1);
    expect(isoWeekday('2026-06-18')).toBe(4);
    expect(isoWeekday('2026-06-21')).toBe(7);
    expect(isoWeekday('2026-06-22')).toBe(1);
  });

  it('isoWeekKey groups a Mon–Sun week together', () => {
    expect(isoWeekKey('2026-06-15')).toBe('2026-W25');
    expect(isoWeekKey('2026-06-21')).toBe(isoWeekKey('2026-06-15'));
    expect(isoWeekKey('2026-06-22')).not.toBe(isoWeekKey('2026-06-15'));
  });

  it('daysBetween / daysApart', () => {
    expect(daysBetween('2026-06-15', '2026-06-18')).toBe(3);
    expect(daysBetween('2026-06-18', '2026-06-15')).toBe(-3);
    expect(daysApart('2026-06-18', '2026-06-15')).toBe(3);
  });

  it('addDays handles month/week boundaries', () => {
    expect(addDays('2026-06-15', -7)).toBe('2026-06-08');
    expect(addDays('2026-06-15', 20)).toBe('2026-07-05');
  });

  it('parseDate rejects bad input', () => {
    expect(() => parseDate('2026/06/15')).toThrow();
  });
});
