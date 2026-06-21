/**
 * Generates a realistic ~6-month activity history so the stats look "lived in".
 * Deterministic (seeded PRNG) so the demo is reproducible. For development/demo only.
 */
import type { LogEntry, Rating, SessionId } from '../log/types';
import { addDays, isoWeekday } from '../engine/dates';
import { newId } from '../lib/clock';

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SLOT3 = ['copenhagen', 'side', 'suitcase'];
const CTYPE = ['RSA', 'VO2max'];

export function generateSeedLog(today: string, weeks = 52): LogEntry[] {
  const rng = mulberry32(0xc0ffee);
  const chance = (p: number) => rng() < p;
  const randint = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
  const rating = (): Rating => {
    const r = rng();
    return (r < 0.15 ? 1 : r < 0.6 ? 2 : 3) as Rating;
  };

  const entries: LogEntry[] = [];
  const mondayThisWeek = addDays(today, -(isoWeekday(today) - 1));

  let slot3i = 0;
  let ctypei = 0;
  let futsalLastWeek = false;

  const push = (e: LogEntry) => {
    if (e.date <= today) entries.push(e);
  };
  const at = (date: string) => `${date}T12:00:00Z`;

  for (let w = weeks - 1; w >= 0; w--) {
    const monday = addDays(mondayThisWeek, -7 * w);
    const playedFutsal = chance(0.4);
    const playedFootball = chance(0.9);

    // Matches
    if (playedFootball) {
      push({
        id: newId(),
        kind: 'match',
        date: monday,
        sport: 'football',
        goals: randint(0, 3),
        rating: rating(),
        updatedAt: at(monday),
      });
    }
    if (playedFutsal) {
      const thu = addDays(monday, 3);
      push({
        id: newId(),
        kind: 'match',
        date: thu,
        sport: 'futsal',
        goals: randint(0, 5),
        rating: rating(),
        updatedAt: at(thu),
      });
    }

    // Gym session 1 = A (every cycle), midweek.
    if (!chance(0.12)) {
      const day = addDays(monday, 1); // Tuesday
      slot3i = (slot3i + 1) % SLOT3.length;
      push({
        id: newId(),
        kind: 'gym',
        date: day,
        session: 'A',
        completion: chance(0.25) ? 't1' : 'complete',
        rating: rating(),
        slot3: SLOT3[slot3i],
        updatedAt: at(day),
      });
    }

    // Gym session 2 = B (no futsal) or C (futsal week); weekend.
    if (!chance(0.18)) {
      const day = addDays(monday, 5); // Saturday
      const session: SessionId = playedFutsal ? 'C' : 'B';
      slot3i = (slot3i + 1) % SLOT3.length;
      const entry: LogEntry = {
        id: newId(),
        kind: 'gym',
        date: day,
        session,
        completion: chance(0.25) ? 't1' : 'complete',
        rating: rating(),
        slot3: SLOT3[slot3i],
        updatedAt: at(day),
      };
      if (session === 'C') {
        ctypei = (ctypei + 1) % CTYPE.length;
        entry.cType = CTYPE[ctypei];
        // Occasionally a leg-append after back-to-back futsal weeks.
        if (futsalLastWeek && chance(0.5)) entry.legAppend = true;
      }
      push(entry);
    }

    futsalLastWeek = playedFutsal;
  }

  return entries;
}
