import { describe, it, expect } from 'vitest';
import {
  formatDuration,
  garminFetchUrl,
  parseGarminActivityId,
  parseHms,
  parseShareHtml,
} from './parse';

/** Trimmed from the real page for activity 24101714769 (a CIRQA "Timed Activity"). */
const REAL_PAGE = `<!DOCTYPE html><html><head>
<meta name="csrf-token" content="ae784f54-275d-4ecc-84d7-5cee4f2fd42e">
<meta property="og:url" content="https://connect-kc3.garmin.zone/modern/activity/24101714769/share/1?lang=en&amp;t=1787674182" />
<meta property="og:title" content="Timed Activity" />
<meta property="og:type" content="website" />
<meta property="og:description" content="Distance 0.00 km | Time 1:20:16 | Speed 0.0 kph " />
<meta property="og:latitude" />
</head><body></body></html>`;

/** What Garmin serves for an activity that is private or does not exist: no og tags. */
const NOT_PUBLIC_PAGE = `<!DOCTYPE html><html><head><title>Garmin Connect</title></head><body></body></html>`;

describe('parseGarminActivityId', () => {
  it('accepts the URL shapes Garmin hands out', () => {
    for (const url of [
      'https://connect.garmin.com/app/activity/24101714769',
      'https://connect.garmin.com/modern/activity/24101714769',
      'https://connect.garmin.com/modern/activity/24101714769/share/1?lang=en',
      'http://connect.garmin.com/activity/24101714769/',
      '  https://connect.garmin.com/app/activity/24101714769  ',
    ]) {
      expect(parseGarminActivityId(url)).toBe('24101714769');
    }
  });

  it('accepts a bare id', () => {
    expect(parseGarminActivityId('24101714769')).toBe('24101714769');
  });

  it('rejects anything else', () => {
    expect(parseGarminActivityId('')).toBeNull();
    expect(parseGarminActivityId('not a url')).toBeNull();
    expect(parseGarminActivityId('https://strava.com/activities/123456789')).toBeNull();
    expect(parseGarminActivityId('https://connect.garmin.com/app/settings')).toBeNull();
  });
});

describe('garminFetchUrl', () => {
  it('builds the no-auth page URL', () => {
    expect(garminFetchUrl('24101714769')).toBe('https://connect.garmin.com/app/activity/24101714769');
  });
});

describe('parseHms', () => {
  it('parses h:mm:ss and mm:ss', () => {
    expect(parseHms('1:20:16')).toBe(4816);
    expect(parseHms('48:30')).toBe(2910);
    expect(parseHms('0:00:45')).toBe(45);
    expect(parseHms('1:20:16.5')).toBe(4816);
  });

  it('returns undefined for junk', () => {
    expect(parseHms('')).toBeUndefined();
    expect(parseHms('--')).toBeUndefined();
    expect(parseHms('1h20')).toBeUndefined();
  });
});

describe('formatDuration', () => {
  it('formats for display', () => {
    expect(formatDuration(4816)).toBe('1h 20m');
    expect(formatDuration(2910)).toBe('49m'); // 48:30 rounds up
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(3600)).toBe('1h 0m');
  });
});

describe('parseShareHtml', () => {
  it('reads name, duration and distance off the real page', () => {
    expect(parseShareHtml(REAL_PAGE)).toEqual({
      name: 'Timed Activity',
      durationSec: 4816,
      distanceM: 0,
    });
  });

  it('returns no duration when the activity is not public', () => {
    expect(parseShareHtml(NOT_PUBLIC_PAGE).durationSec).toBeUndefined();
  });

  it('ignores the generic Garmin Connect title', () => {
    const html = '<meta property="og:title" content="Garmin Connect | 404" />';
    expect(parseShareHtml(html).name).toBeUndefined();
  });

  it('converts miles for imperial accounts', () => {
    const html = '<meta property="og:description" content="Distance 3.10 mi | Time 25:00 | Speed 7.4 mph" />';
    expect(parseShareHtml(html)).toEqual({ durationSec: 1500, distanceM: 4989 });
  });

  it('tolerates reversed attribute order and entities', () => {
    const html = '<meta content="Sunday Kickabout &amp; Drills" property="og:title">';
    expect(parseShareHtml(html).name).toBe('Sunday Kickabout & Drills');
  });
});
