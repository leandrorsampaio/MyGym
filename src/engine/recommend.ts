/**
 * The "brain": given the program, the activity log and today's date, decide which
 * gym session to do next and surface the trainer's rules as warnings.
 *
 * Pure and deterministic — `today` is passed in, never read from the clock.
 *
 * Backbone (A every cycle, 2 slots/cycle → A → (B|C) → A → …):
 *   last gym = A        → next is the B-or-C slot
 *   last gym = B or C   → next is A
 *   no history          → start with A
 *
 * B-vs-C: futsal week → C (matches cover legs); otherwise B (or C if "feeling heavy").
 *
 * Hard rules layered on top:
 *   - Never B within 48h of a match → swap to A (low leg demand, safe near matches).
 *   - Never stack two hard leg loads back-to-back (B + match) → same swap.
 *   - Two futsal weeks in a row without leg loading → C gets Squat 2×5 + RDL 2×8.
 */
import type { Program, WeeklySchedule } from '../program/schema';
import type { LogEntry, SessionId } from '../log/types';
import { isGym, isMatch } from '../log/types';
import { nextCType, nextSlot3 } from './rotation';
import { isoWeekKey, isoWeekday, daysApart, daysBetween, addDays } from './dates';

export interface Recommendation {
  nextSession: SessionId;
  reason: string;
  warnings: string[];
  /** Conditioning variant to do when nextSession === 'C'. */
  cTypeNext?: string;
  /** Core Finisher slot-3 option for the next gym session. */
  slot3Next: string;
  /** When true (C only), append Squat 2×5 + RDL 2×8 to load the legs. */
  legAppend?: boolean;
}

export interface RecommendOptions {
  /** Manual override: prefer C over B even on a non-futsal week (feeling heavy / fat-loss). */
  preferHeavy?: boolean;
}

const LEG_APPEND_PRESCRIPTION = 'Squat 2×5 + RDL 2×8';

function lastGym(log: LogEntry[]) {
  return log
    .filter(isGym)
    .slice()
    .sort((a, b) =>
      a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.updatedAt < b.updatedAt ? 1 : -1,
    )[0];
}

/** A week counts as a "futsal week" if a futsal match is logged in the same ISO week. */
function isFutsalWeek(log: LogEntry[], iso: string): boolean {
  const wk = isoWeekKey(iso);
  return log.some((e) => isMatch(e) && e.sport === 'futsal' && isoWeekKey(e.date) === wk);
}

/** Any logged match within ±2 calendar days of `today`. */
function pastMatchWithin48h(log: LogEntry[], today: string): boolean {
  return log.some((e) => isMatch(e) && daysApart(e.date, today) <= 2 && daysBetween(e.date, today) >= 0);
}

/**
 * A routine *football* match day (regular weekly fixture) falling today or in the
 * next 2 days. Futsal is occasional → it is detected from the log (isFutsalWeek /
 * pastMatchWithin48h), not projected forward from the schedule.
 */
function scheduledMatchWithin48h(schedule: WeeklySchedule | undefined, today: string): boolean {
  if (!schedule) return false;
  for (let d = 0; d <= 2; d++) {
    if (schedule.football.includes(isoWeekday(addDays(today, d)))) return true;
  }
  return false;
}

/**
 * Two-futsal-weeks rule: this ISO week and the previous one both had futsal, and
 * legs were not loaded in that span (no B session, no leg-appended C).
 */
function twoFutsalWeeksUnloaded(log: LogEntry[], today: string): boolean {
  const thisWk = isFutsalWeek(log, today);
  const prevWk = isFutsalWeek(log, addDays(today, -7));
  if (!(thisWk && prevWk)) return false;
  const windowStart = isoWeekKey(addDays(today, -7));
  const windowKeys = new Set([windowStart, isoWeekKey(today)]);
  const legLoaded = log.some(
    (e) =>
      isGym(e) &&
      windowKeys.has(isoWeekKey(e.date)) &&
      (e.session === 'B' || (e.session === 'C' && e.legAppend)),
  );
  return !legLoaded;
}

export function recommend(
  program: Program,
  log: LogEntry[],
  today: string,
  opts: RecommendOptions = {},
): Recommendation {
  const schedule = program.schedule;
  const warnings: string[] = [];
  const slot3Next = nextSlot3(program, log);

  const prev = lastGym(log);
  const owesA = !prev || prev.session === 'B' || prev.session === 'C';

  // --- pick the candidate session ---
  let session: SessionId;
  let reason: string;

  if (owesA) {
    session = 'A';
    reason = prev ? 'Last gym was the B/C slot — Session A is up.' : 'No history yet — start with Session A.';
  } else {
    // We owe the B-or-C slot.
    const futsal = isFutsalWeek(log, today);
    if (futsal) {
      session = 'C';
      reason = 'Futsal this week — matches cover legs, so do conditioning (C).';
    } else if (opts.preferHeavy) {
      session = 'C';
      reason = 'Feeling heavy / fat-loss push — conditioning (C) instead of B.';
    } else {
      session = 'B';
      reason = 'No futsal this week — load the legs with Session B.';
    }
  }

  // --- hard rule: keep B away from matches (and avoid two hard leg loads back-to-back) ---
  if (session === 'B' && (pastMatchWithin48h(log, today) || scheduledMatchWithin48h(schedule, today))) {
    session = 'A';
    reason = 'A match is within 48h — swapping B for Session A (low leg demand, safe near matches).';
    warnings.push('Avoided Session B within 48h of a match (no two hard leg loads back-to-back).');
  }

  // --- two-futsal-weeks-without-legs rule ---
  let legAppend: boolean | undefined;
  if (twoFutsalWeeksUnloaded(log, today)) {
    if (session === 'C') {
      legAppend = true;
      warnings.push(`Two futsal weeks without leg loading — append ${LEG_APPEND_PRESCRIPTION} to this C session.`);
    } else if (session === 'A') {
      warnings.push(`Two futsal weeks without leg loading — load legs soon (${LEG_APPEND_PRESCRIPTION} on your next C).`);
    }
  }

  const result: Recommendation = { nextSession: session, reason, warnings, slot3Next };
  if (session === 'C') {
    result.cTypeNext = nextCType(program, log);
    if (legAppend) result.legAppend = true;
  }
  return result;
}
