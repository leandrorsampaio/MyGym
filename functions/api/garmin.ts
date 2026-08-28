/// <reference types="@cloudflare/workers-types" />
import { checkAccess, json, type AccessEnv } from '../lib/access';
import { garminFetchUrl, parseGarminActivityId, parseShareHtml } from '../../src/garmin/parse';
import type { GarminMetrics } from '../../src/log/types';

interface Env extends AccessEnv {
  /** Service binding to the mygym-garmin Worker (Browser Rendering lives there). */
  GARMIN?: Fetcher;
}

/**
 * GET /api/garmin?id=<activity id or URL> → GarminMetrics
 *
 * Two ways to read an activity, best first:
 *
 *  1. The rendering Worker. It drives a real browser, so it gets everything Garmin's own
 *     page shows — HR zones, training effect, calories, the 1 Hz HR curve. Garmin's JSON
 *     API is unreachable from a plain fetch (it needs a session the page's JavaScript
 *     establishes), so a browser is the only honest way in.
 *
 *  2. Open Graph tags on the public activity page. No browser needed, but the page only
 *     advertises name, duration and distance. This is the fallback for when the Worker is
 *     unbound or out of daily browser time — a thin result beats a failed log entry.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const denied = await checkAccess(request, env);
  if (denied) return denied;

  const id = parseGarminActivityId(new URL(request.url).searchParams.get('id') ?? '');
  if (!id) return json({ error: "That doesn't look like a Garmin activity link." }, 400);

  const rendered = await renderViaWorker(env, id);
  if (rendered) return json(rendered);

  return readOpenGraph(id);
};

/** Ask the rendering Worker. Returns null on any failure so the caller can fall back. */
async function renderViaWorker(env: Env, id: string): Promise<GarminMetrics | null> {
  if (!env.GARMIN) return null;
  try {
    const res = await env.GARMIN.fetch(`https://garmin.internal/?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as GarminMetrics;
    // A shaped result always carries the id; anything else means we got an error body.
    return data?.activityId ? data : null;
  } catch {
    return null;
  }
}

async function readOpenGraph(id: string): Promise<Response> {
  let html: string;
  try {
    const res = await fetch(garminFetchUrl(id), { headers: { accept: 'text/html' } });
    if (!res.ok) return json({ error: `Garmin returned ${res.status}.` }, 502);
    html = await res.text();
  } catch {
    return json({ error: "Couldn't reach Garmin." }, 502);
  }

  const summary = parseShareHtml(html);
  // A private (or deleted) activity still renders 200, just without the og tags.
  if (summary.durationSec == null) {
    return json({ error: 'No data — is the activity shared publicly?' }, 404);
  }

  const metrics: GarminMetrics = { activityId: id, ...summary, fetchedAt: new Date().toISOString() };
  return json(metrics);
}
