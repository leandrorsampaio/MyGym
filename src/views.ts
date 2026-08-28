/**
 * The app's view state. Still no router (invariant 5) — `App` switches on this.
 *
 * `today` / `log` / `progress` are the three destinations the nav moves between;
 * `workout` is a focused mode entered from Today, which hides the nav.
 */
export type View = 'today' | 'log' | 'progress' | 'workout';

/** The destinations reachable from the nav — `workout` is not one of them. */
export const NAV_VIEWS = ['today', 'log', 'progress'] as const;
