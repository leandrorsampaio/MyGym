/**
 * Date helpers. All work on calendar dates ('YYYY-MM-DD'); no wall-clock reads
 * here so the engine stays pure and testable (the caller passes `today`).
 */
/** Parse 'YYYY-MM-DD' to a UTC Date (midnight). Throws on malformed input. */
export function parseDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m)
        throw new Error(`Invalid date: ${iso}`);
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}
/** Whole calendar days between two ISO dates (b - a). Negative if b is before a. */
export function daysBetween(a, b) {
    const MS = 24 * 60 * 60 * 1000;
    return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / MS);
}
/** Absolute day distance between two ISO dates. */
export function daysApart(a, b) {
    return Math.abs(daysBetween(a, b));
}
/**
 * ISO week key 'YYYY-Www' (weeks start Monday; week 1 contains the first Thursday).
 * Two dates in the same Mon–Sun week share a key.
 */
export function isoWeekKey(iso) {
    const d = parseDate(iso);
    const day = (d.getUTCDay() + 6) % 7; // 0 = Monday
    // Shift to the Thursday of this week, then take that year.
    const thursday = new Date(d);
    thursday.setUTCDate(d.getUTCDate() - day + 3);
    const isoYear = thursday.getUTCFullYear();
    const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
    const firstDay = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
    const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${isoYear}-W${String(week).padStart(2, '0')}`;
}
/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(iso) {
    return ((parseDate(iso).getUTCDay() + 6) % 7) + 1;
}
/** Add days to an ISO date, returning a new ISO date. */
export function addDays(iso, days) {
    const d = parseDate(iso);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}
