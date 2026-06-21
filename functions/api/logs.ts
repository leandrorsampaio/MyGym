/// <reference types="@cloudflare/workers-types" />
import { checkAccess, json, type AccessEnv } from '../lib/access';
import type { LogEntry } from '../../src/log/types';

interface Env extends AccessEnv {
  DB: D1Database;
}

interface PushBody {
  upserts?: LogEntry[];
  deletes?: { id: string; updatedAt: string }[];
}

/** GET /api/logs → all non-deleted entries (used to hydrate a fresh device). */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await checkAccess(request, env);
  if (denied) return denied;

  const { results } = await env.DB.prepare('SELECT data FROM logs WHERE deleted = 0').all<{ data: string }>();
  const entries = (results ?? []).map((r) => JSON.parse(r.data) as LogEntry);
  return json({ entries });
};

/** POST /api/logs → upsert entries + apply deletes (idempotent, last-write-wins). */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await checkAccess(request, env);
  if (denied) return denied;

  let body: PushBody;
  try {
    body = (await request.json()) as PushBody;
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const stmts: D1PreparedStatement[] = [];

  // Upsert; only overwrite when the incoming row is at least as new.
  const upsert = env.DB.prepare(
    `INSERT INTO logs (id, updated_at, deleted, data) VALUES (?1, ?2, 0, ?3)
     ON CONFLICT(id) DO UPDATE SET updated_at = ?2, deleted = 0, data = ?3
     WHERE excluded.updated_at >= logs.updated_at`,
  );
  for (const e of body.upserts ?? []) {
    if (!e?.id || !e?.updatedAt) continue;
    stmts.push(upsert.bind(e.id, e.updatedAt, JSON.stringify(e)));
  }

  // Soft-delete tombstones.
  const del = env.DB.prepare(
    `INSERT INTO logs (id, updated_at, deleted, data) VALUES (?1, ?2, 1, '{}')
     ON CONFLICT(id) DO UPDATE SET updated_at = ?2, deleted = 1
     WHERE excluded.updated_at >= logs.updated_at`,
  );
  for (const d of body.deletes ?? []) {
    if (!d?.id || !d?.updatedAt) continue;
    stmts.push(del.bind(d.id, d.updatedAt));
  }

  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true, applied: stmts.length });
};
