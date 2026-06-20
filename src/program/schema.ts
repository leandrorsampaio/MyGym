import { z } from 'zod';

/**
 * Program schema — the training prescription, supplied as JSON (drag & drop).
 * This is the single source of truth for what the app displays. Validated on
 * upload so a malformed file fails loudly with a useful message.
 */

export const Tier = z.enum(['T1', 'T2']);
export type Tier = z.infer<typeof Tier>;

/** A single movement. Most items have one; supersets/primers have two or more. */
export const Movement = z.object({
  name: z.string().min(1),
  /** Optional — some items (e.g. rotating core options) have no clip yet. */
  video: z.string().url().optional(),
  /** Per-movement reps, used when movements in one item differ (supersets). */
  reps: z.string().optional(),
  /** Stable key for rotation/logging (e.g. 'copenhagen'). Defaults derivable from name. */
  key: z.string().optional(),
});
export type Movement = z.infer<typeof Movement>;

/** A list item in a session: one logical exercise (possibly a multi-movement superset). */
export const Item = z.object({
  tier: Tier,
  /** Group label for supersets / primers, e.g. "Arms superset". */
  label: z.string().optional(),
  /** Item-level reps (omit when each movement carries its own). */
  reps: z.string().optional(),
  rest: z.string().optional(),
  /** Reps-in-reserve / intensity guidance, e.g. "leave 2–3 in reserve". */
  intensity: z.string().optional(),
  /** Coaching cue. */
  note: z.string().optional(),
  thumbnail: z.string().url().optional(),
  movements: z.array(Movement).min(1),
});
export type Item = z.infer<typeof Item>;

/** A block of items with a title (Athletic Prep). */
export const ItemBlock = z.object({
  title: z.string(),
  note: z.string().optional(),
  items: z.array(Item),
});
export type ItemBlock = z.infer<typeof ItemBlock>;

/** A Core Finisher slot. Slot 3 rotates through its options session to session. */
export const CoreSlot = z.object({
  slot: z.number().int().positive(),
  label: z.string(),
  reps: z.string().optional(),
  rotates: z.boolean().default(false),
  note: z.string().optional(),
  /** For non-rotating slots these are alternatives; for the rotating slot, the cycle. */
  options: z.array(Movement).min(1),
});
export type CoreSlot = z.infer<typeof CoreSlot>;

export const CoreFinisher = z.object({
  title: z.string(),
  tier: Tier.default('T1'),
  note: z.string().optional(),
  slots: z.array(CoreSlot).min(1),
});
export type CoreFinisher = z.infer<typeof CoreFinisher>;

/** Strength session (A, B): an ordered list of items. */
export const StrengthWorkout = z.object({
  name: z.string(),
  type: z.literal('strength'),
  note: z.string().optional(),
  items: z.array(Item),
});
export type StrengthWorkout = z.infer<typeof StrengthWorkout>;

/** One conditioning variant (RSA / VO2max) that the C session alternates between. */
export const ConditioningVariant = z.object({
  key: z.string().min(1),
  label: z.string(),
  main: z.string(),
  note: z.string().optional(),
});
export type ConditioningVariant = z.infer<typeof ConditioningVariant>;

/** Conditioning session (C): warm-up, an alternating main, cooldown. */
export const ConditioningWorkout = z.object({
  name: z.string(),
  type: z.literal('conditioning'),
  note: z.string().optional(),
  warmup: Item.optional(),
  alternates: z.array(ConditioningVariant).min(1),
  cooldown: Item.optional(),
});
export type ConditioningWorkout = z.infer<typeof ConditioningWorkout>;

export const Workout = z.discriminatedUnion('type', [StrengthWorkout, ConditioningWorkout]);
export type Workout = z.infer<typeof Workout>;

/** Optional "typical week" so the engine can reason about upcoming matches. */
export const WeeklySchedule = z.object({
  /** ISO weekday (1=Mon … 7=Sun) → sport typically played that day. */
  football: z.array(z.number().int().min(1).max(7)).default([]),
  futsal: z.array(z.number().int().min(1).max(7)).default([]),
});
export type WeeklySchedule = z.infer<typeof WeeklySchedule>;

export const Program = z.object({
  version: z.string(),
  athleticPrep: ItemBlock,
  coreFinisher: CoreFinisher,
  workouts: z.object({
    A: StrengthWorkout,
    B: StrengthWorkout,
    C: ConditioningWorkout,
  }),
  schedule: WeeklySchedule.optional(),
});
export type Program = z.infer<typeof Program>;

/** Parse + validate an unknown value (e.g. a dropped JSON file) into a Program. */
export function parseProgram(input: unknown): Program {
  return Program.parse(input);
}

/** Safe variant returning Zod's result object for friendly UI error handling. */
export function safeParseProgram(input: unknown) {
  return Program.safeParse(input);
}
