/**
 * Garmin Connect activity URL → a small activity summary.
 *
 * Garmin's JSON API (`/gc-api/activity-service/activity/{id}`) needs a bearer token that
 * the Connect web app mints at runtime, so it answers 401/403 to any plain server-side
 * request. The activity *page* is different: it is server-rendered with Open Graph tags
 * for social crawlers and needs no auth at all. That's what we read — it carries the
 * activity name and elapsed time, which is the part a logged match actually wants.
 *
 * Pure and network-free: unit-tested here and reused verbatim by `functions/api/garmin.ts`.
 */

export interface GarminSummary {
  /** Activity name as Garmin shows it, e.g. "Timed Activity". */
  name?: string;
  /** Elapsed time in seconds. */
  durationSec?: number;
  /** Metres. Always 0 for a CIRQA (it has no GPS) — kept for GPS devices. */
  distanceM?: number;
}

/**
 * Pull the numeric activity id out of anything the user might paste — the `/app/`,
 * `/modern/` or `/share/` URL shapes, or a bare id. Returns null if it isn't one.
 */
export function parseGarminActivityId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^\d{6,}$/.test(s)) return s;
  return s.match(/garmin\.com\/\S*?activity\/(\d{6,})/i)?.[1] ?? null;
}

/**
 * The page we fetch. `/app/activity/{id}` answers 200 with the Open Graph tags to any
 * client, no auth and no redirect. (`/modern/activity/{id}/share/1` 302s here.)
 */
export function garminFetchUrl(id: string): string {
  return `https://connect.garmin.com/app/activity/${id}`;
}

/** 'h:mm:ss' or 'mm:ss' → seconds. Undefined if it doesn't parse. */
export function parseHms(input: string): number | undefined {
  const m = input.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.\d+)?$/);
  if (!m) return undefined;
  const [, hours, minutes, seconds] = m;
  return Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
}

/** Seconds → '1h 20m' / '49m' / '45s', for display. Rounds to the nearest minute. */
export function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  const mins = Math.round(sec / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Read one `<meta property="og:X" content="...">`, tolerating either attribute order. */
function ogTag(html: string, prop: string): string | undefined {
  const raw =
    html.match(new RegExp(`<meta[^>]*property=["']og:${prop}["'][^>]*content=["']([^"']*)["']`, 'i'))?.[1] ??
    html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${prop}["']`, 'i'))?.[1];
  return raw === undefined ? undefined : decodeEntities(raw);
}

/**
 * Parse an activity page. The description reads like
 * `Distance 0.00 km | Time 1:20:16 | Speed 0.0 kph`.
 * An activity that isn't public still renders 200 but without the og tags, so it yields
 * no time — the caller treats a missing `durationSec` as "couldn't read it".
 */
export function parseShareHtml(html: string): GarminSummary {
  const out: GarminSummary = {};

  const name = ogTag(html, 'title')?.trim();
  if (name && !/^garmin connect(\s*\|)?/i.test(name)) out.name = name;

  const desc = ogTag(html, 'description') ?? '';

  const time = desc.match(/Time\s+([\d:.]+)/i)?.[1];
  if (time) out.durationSec = parseHms(time);

  const dist = desc.match(/Distance\s+([\d.,]+)\s*(km|mi|m)\b/i);
  const distValue = dist?.[1];
  const distUnit = dist?.[2]?.toLowerCase();
  if (distValue && distUnit) {
    const value = Number(distValue.replace(',', '.'));
    if (Number.isFinite(value)) {
      const metres = distUnit === 'km' ? value * 1000 : distUnit === 'mi' ? value * 1609.344 : value;
      out.distanceM = Math.round(metres);
    }
  }

  return out;
}
