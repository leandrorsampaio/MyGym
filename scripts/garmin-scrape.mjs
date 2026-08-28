/**
 * Scrape the full stats for a Garmin Connect activity.
 *
 * Why a browser: connect.garmin.com serves a ~6 KB empty SPA shell. Every number is
 * fetched afterwards by JavaScript from /gc-api/activity-service/..., which answers
 * 401/403 to any plain HTTP request because the web app mints a bearer token at
 * runtime. Rendering the page in Chrome makes the app do that work for us.
 *
 * We don't parse the rendered text — we intercept the JSON responses the page itself
 * receives, so we get Garmin's own field names instead of scraped labels.
 *
 * The activity must be shared publicly; no Garmin credentials are used or needed.
 *
 * NOTE: the app no longer depends on this script. Fetching now happens server-side in
 * workers/garmin (Cloudflare Browser Rendering), and the canonical mapping from Garmin's
 * DTOs to what we store lives in `src/garmin/shape.ts`. This stays as a local debugging
 * aid; its `shape()` below is a simplified copy and may lag that module.
 *
 * Usage:
 *   node scripts/garmin-scrape.mjs <url-or-id> [<url-or-id> ...]
 *   node scripts/garmin-scrape.mjs --pretty 24101714769
 */
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const NAV_TIMEOUT_MS = 45_000;
/** How long to keep collecting XHRs after load settles. */
const SETTLE_MS = 3_000;

function parseActivityId(input) {
  const s = String(input).trim();
  if (/^\d{6,}$/.test(s)) return s;
  return s.match(/garmin\.com\/\S*?activity\/(\d{6,})/i)?.[1] ?? null;
}

/** Pull the fields worth keeping out of Garmin's verbose DTOs. */
function shape(activity, zones) {
  const s = activity?.summaryDTO ?? {};
  const round = (v, d = 0) =>
    typeof v === 'number' ? Number(v.toFixed(d)) : undefined;

  return {
    activityId: String(activity?.activityId ?? ''),
    name: activity?.activityName ?? undefined,
    type: activity?.activityTypeDTO?.typeKey ?? undefined,
    startTimeLocal: s.startTimeLocal ?? undefined,
    durationSec: round(s.duration),
    movingDurationSec: round(s.movingDuration),
    distanceM: round(s.distance),
    calories: round(s.calories),
    restingCalories: round(s.bmrCalories),
    avgHr: round(s.averageHR),
    maxHr: round(s.maxHR),
    aerobicTrainingEffect: round(s.trainingEffect, 1),
    anaerobicTrainingEffect: round(s.anaerobicTrainingEffect, 1),
    trainingEffectLabel: s.trainingEffectLabel ?? undefined,
    exerciseLoad: round(s.activityTrainingLoad),
    moderateIntensityMinutes: round(s.moderateIntensityMinutes),
    vigorousIntensityMinutes: round(s.vigorousIntensityMinutes),
    bodyBatteryDelta: round(s.differenceBodyBattery),
    sweatLossMl: round(s.waterEstimated),
    hrZones: Array.isArray(zones)
      ? zones.map((z) => ({
          zone: z.zoneNumber,
          lowBpm: round(z.zoneLowBoundary),
          seconds: round(z.secsInZone),
        }))
      : undefined,
    scrapedAt: new Date().toISOString(),
  };
}

async function scrapeOne(page, id) {
  const captured = { activity: null, zones: null };

  const onResponse = async (res) => {
    const url = res.url();
    if (!url.includes('/activity-service/activity/') || !res.ok()) return;
    try {
      if (new RegExp(`/activity/${id}$`).test(new URL(url).pathname)) {
        captured.activity = await res.json();
      } else if (url.includes('/hrTimeInZones')) {
        captured.zones = await res.json();
      }
    } catch {
      // A non-JSON or already-consumed body is not fatal; other requests still land.
    }
  };

  page.on('response', onResponse);
  try {
    await page.goto(`https://connect.garmin.com/app/activity/${id}`, {
      waitUntil: 'networkidle2',
      timeout: NAV_TIMEOUT_MS,
    });
    await new Promise((r) => setTimeout(r, SETTLE_MS));
  } finally {
    page.off('response', onResponse);
  }

  if (!captured.activity) {
    throw new Error(`no activity data for ${id} — is it shared publicly?`);
  }
  return shape(captured.activity, captured.zones);
}

const args = process.argv.slice(2);
const pretty = args.includes('--pretty');
const targets = args.filter((a) => !a.startsWith('--'));

if (targets.length === 0) {
  console.error('usage: node scripts/garmin-scrape.mjs [--pretty] <url-or-id> ...');
  process.exit(2);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const results = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  for (const target of targets) {
    const id = parseActivityId(target);
    if (!id) {
      results.push({ input: target, error: 'not a Garmin activity URL or id' });
      continue;
    }
    try {
      results.push(await scrapeOne(page, id));
    } catch (err) {
      results.push({ activityId: id, error: err.message });
    }
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, pretty ? 2 : 0));
