/**
 * Rotation state is DERIVED from the log, never stored separately:
 *  - Session C alternates between conditioning variants (RSA ↔ VO₂max).
 *  - Core Finisher slot 3 rotates through its options every gym session.
 */
import type { Program } from '../program/schema';
import type { LogEntry } from '../log/types';
import { isGym } from '../log/types';

function gymEntriesNewestFirst(log: LogEntry[]): Extract<LogEntry, { kind: 'gym' }>[] {
  return log
    .filter(isGym)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Which conditioning variant (key) the next C session should use. */
export function nextCType(program: Program, log: LogEntry[]): string {
  const variants = program.workouts.C.alternates;
  const lastC = gymEntriesNewestFirst(log).find((e) => e.session === 'C' && e.cType);
  if (!lastC?.cType) return variants[0]!.key;
  const idx = variants.findIndex((v) => v.key === lastC.cType);
  // Unknown stored key → restart the cycle.
  if (idx < 0) return variants[0]!.key;
  return variants[(idx + 1) % variants.length]!.key;
}

/** Which Core Finisher slot-3 option (key) the next gym session should use. */
export function nextSlot3(program: Program, log: LogEntry[]): string {
  const slot3 = program.coreFinisher.slots.find((s) => s.rotates) ?? program.coreFinisher.slots[2];
  const keys = (slot3?.options ?? []).map((o, i) => o.key ?? String(i));
  if (keys.length === 0) return '';
  const lastWithSlot3 = gymEntriesNewestFirst(log).find((e) => e.slot3);
  if (!lastWithSlot3?.slot3) return keys[0]!;
  const idx = keys.findIndex((k) => k === lastWithSlot3.slot3);
  if (idx < 0) return keys[0]!;
  return keys[(idx + 1) % keys.length]!;
}
