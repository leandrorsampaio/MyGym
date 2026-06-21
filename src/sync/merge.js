/**
 * Merge entries pulled from the server into the local log (last-write-wins by
 * `updatedAt`). Pure. Respects local tombstones so a locally-deleted entry isn't
 * resurrected by an older server copy.
 */
export function mergeRemote(local, remote, tombstones = []) {
    const byId = new Map();
    for (const e of local)
        byId.set(e.id, e);
    const deletedAt = new Map(tombstones.map((t) => [t.id, t.updatedAt]));
    for (const r of remote) {
        const tomb = deletedAt.get(r.id);
        if (tomb && tomb >= r.updatedAt)
            continue; // locally deleted, and not superseded
        const cur = byId.get(r.id);
        if (!cur || cur.updatedAt < r.updatedAt)
            byId.set(r.id, r);
    }
    return [...byId.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
