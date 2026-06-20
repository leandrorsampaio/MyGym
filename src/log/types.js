/**
 * Activity log — append-mostly event log. The single source of truth at runtime;
 * recommendation, rotation and stats are all pure functions over this list.
 */
export function isGym(e) {
    return e.kind === 'gym';
}
export function isMatch(e) {
    return e.kind === 'match';
}
