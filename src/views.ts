/**
 * The app's view state. Still no router (invariant 5) — `App` switches on this.
 *
 * Named for the job each one does: `train` decides, `history` records, `review`
 * assesses. `workout` is a focused mode entered from Train, and hides the nav.
 */
export type View = 'train' | 'history' | 'review' | 'workout';

/** The destinations reachable from the nav — `workout` is not one of them. */
export const NAV_VIEWS = ['train', 'history', 'review'] as const;
