import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

/**
 * IndexedDB-backed storage for Zustand's persist middleware. Survives iOS Safari
 * storage pressure better than localStorage, and is the durable local copy until
 * the D1 cloud backup syncs (Phase 5).
 */
export const idbStorage: StateStorage = {
  getItem: async (name) => (await get(name)) ?? null,
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};
