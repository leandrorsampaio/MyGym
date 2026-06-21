import { describe, it, expect } from 'vitest';
import { mergeRemote } from './merge';
import { gym } from '../test/factory';
const withUpdated = (e, updatedAt) => ({ ...e, updatedAt });
describe('mergeRemote', () => {
    it('adds remote entries the client does not have', () => {
        const local = [withUpdated(gym('2026-06-01', 'A'), '2026-06-01T10:00:00Z')];
        const remote = [withUpdated(gym('2026-06-05', 'B'), '2026-06-05T10:00:00Z')];
        const merged = mergeRemote(local, remote);
        expect(merged).toHaveLength(2);
    });
    it('newer remote wins; older remote is ignored', () => {
        const base = gym('2026-06-01', 'A');
        const local = [{ ...base, rating: 1, updatedAt: '2026-06-01T10:00:00Z' }];
        const newer = [{ ...base, rating: 3, updatedAt: '2026-06-02T10:00:00Z' }];
        const older = [{ ...base, rating: 2, updatedAt: '2026-05-30T10:00:00Z' }];
        expect(mergeRemote(local, newer)[0].rating).toBe(3);
        expect(mergeRemote(local, older)[0].rating).toBe(1);
    });
    it('does not resurrect a locally-deleted entry when the tombstone is newer', () => {
        const e = withUpdated(gym('2026-06-01', 'A'), '2026-06-01T10:00:00Z');
        const merged = mergeRemote([], [e], [{ id: e.id, updatedAt: '2026-06-02T10:00:00Z' }]);
        expect(merged).toHaveLength(0);
    });
    it('a newer server edit overrides an older tombstone', () => {
        const e = withUpdated(gym('2026-06-01', 'A'), '2026-06-03T10:00:00Z');
        const merged = mergeRemote([], [e], [{ id: e.id, updatedAt: '2026-06-02T10:00:00Z' }]);
        expect(merged).toHaveLength(1);
    });
});
