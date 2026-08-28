/// <reference types="@cloudflare/workers-types" />
/**
 * The Garmin rendering Worker.
 *
 * Garmin's numbers are not in the activity page's HTML — the page is an empty shell that
 * fetches them from /gc-api/activity-service/... using a session and CSRF token its own
 * JavaScript establishes. So the only honest way to read them is to *be* a browser: we
 * render the (publicly shared) activity page with Browser Rendering and capture the JSON
 * the page fetches for itself. No Garmin credentials are involved.
 *
 * This lives in its own Worker because Pages Functions cannot hold a `browser` binding.
 * The app's /api/garmin Pages Function calls it over a service binding, so this Worker is
 * never routed publicly and stays behind the same Cloudflare Access gate as everything else.
 */
import puppeteer from '@cloudflare/puppeteer';
import { shapeGarminMetrics } from '../../../src/garmin/shape';

export interface Env {
  BROWSER: Fetcher;
}

/** How long to keep collecting XHRs after navigation settles. */
const SETTLE_MS = 3_000;
const NAV_TIMEOUT_MS = 45_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = new URL(request.url).searchParams.get('id') ?? '';
    if (!/^\d{6,}$/.test(id)) return json({ error: 'bad activity id' }, 400);

    let browser;
    try {
      browser = await puppeteer.launch(env.BROWSER);
    } catch {
      return json({ error: 'No browser available right now — try again shortly.' }, 503);
    }

    try {
      const page = await browser.newPage();
      const got: { activity?: unknown; zones?: unknown; details?: unknown } = {};

      page.on('response', async (res: { url(): string; ok(): boolean; json(): Promise<unknown> }) => {
        const url = res.url();
        if (!url.includes('/activity-service/activity/') || !res.ok()) return;
        try {
          const path = new URL(url).pathname;
          if (path.endsWith(`/activity/${id}`)) got.activity = await res.json();
          else if (path.endsWith('/hrTimeInZones')) got.zones = await res.json();
          else if (path.endsWith('/details')) got.details = await res.json();
        } catch {
          // A body that's already consumed or not JSON isn't fatal — the others still land.
        }
      });

      await page.goto(`https://connect.garmin.com/app/activity/${id}`, {
        waitUntil: 'networkidle2',
        timeout: NAV_TIMEOUT_MS,
      });
      await new Promise((r) => setTimeout(r, SETTLE_MS));

      if (!got.activity) {
        return json({ error: 'No data — is the activity shared publicly?' }, 404);
      }
      return json(shapeGarminMetrics(got.activity, got.zones, got.details, new Date().toISOString()));
    } catch (err) {
      return json({ error: `Couldn't read that activity (${(err as Error).message}).` }, 502);
    } finally {
      await browser.close();
    }
  },
};
