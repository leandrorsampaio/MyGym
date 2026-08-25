/// <reference types="@cloudflare/workers-types" />
import { checkAccess, json, type AccessEnv } from '../lib/access';
import { garminFetchUrl, parseGarminActivityId, parseShareHtml } from '../../src/garmin/parse';

/**
 * GET /api/garmin?id=<activity id or URL> → { activityId, name?, durationSec?, distanceM? }
 *
 * The browser can't call connect.garmin.com itself (no CORS headers), so the fetch happens
 * here. We read the public activity page, which renders Open Graph tags server-side for
 * crawlers and needs no Garmin credentials — the activity does have to be shared publicly.
 */
export const onRequestGet: PagesFunction<AccessEnv> = async ({ request, env }) => {
  const denied = await checkAccess(request, env);
  if (denied) return denied;

  const id = parseGarminActivityId(new URL(request.url).searchParams.get('id') ?? '');
  if (!id) return json({ error: "That doesn't look like a Garmin activity link." }, 400);

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

  return json({ activityId: id, ...summary });
};
