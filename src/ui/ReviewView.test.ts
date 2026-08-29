import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ReviewView } from './ReviewView';
import { gym, match } from '../test/factory';
import type { GarminMetrics, LogEntry } from '../log/types';

const TODAY = '2026-08-28';
const G = (o: Partial<GarminMetrics>): GarminMetrics =>
  ({ activityId: 'a', fetchedAt: '2026-08-28T00:00:00.000Z', ...o });
const zones = (easy: number, hard: number) => [
  { zone: 2, seconds: easy },
  { zone: 4, seconds: hard },
];
const render = (log: LogEntry[]) =>
  renderToStaticMarkup(createElement(ReviewView, { log, today: TODAY, onEntry: () => {} }));

describe('the verdict comes first', () => {
  it('leads with a claim, not a chart', () => {
    const html = render([gym('2026-08-24', 'A'), match('2026-08-24', 'football', { goals: 1 })]);
    expect(html).toContain('Not enough data');
    expect(html).toContain('No watch data linked yet');
  });

  it('says so when the current week is empty, against your own average', () => {
    // Three a week through July and mid-August, then nothing in the week of the 24th.
    const log: LogEntry[] = [
      '2026-07-06','2026-07-08','2026-07-10',
      '2026-07-13','2026-07-15','2026-07-17',
      '2026-07-20','2026-07-22','2026-07-24',
      '2026-08-10','2026-08-12','2026-08-14',
    ].map((d) => gym(d, 'A'));
    const html = render(log);
    expect(html).toContain('Lighter week');
    expect(html).toContain('Nothing logged this week');
  });
});

describe('the football and gym panes', () => {
  const log: LogEntry[] = [
    match('2026-07-06', 'football', { goals: 1, garmin: G({ exerciseLoad: 180, avgHr: 148, hrZones: zones(600, 400) }) }),
    match('2026-07-13', 'football', { goals: 2, garmin: G({ exerciseLoad: 170, avgHr: 142, hrZones: zones(600, 500) }) }),
    match('2026-07-20', 'futsal', { goals: 0, garmin: G({ exerciseLoad: 190, avgHr: 141, hrZones: zones(500, 600) }) }),
    match('2026-07-25', 'training'),
    gym('2026-07-22', 'B', { garmin: G({ exerciseLoad: 70 }) }),
    gym('2026-07-24', 'A', { completion: 't1' }),
  ];
  const html = render(log);

  it('shows football first, with its own headline numbers', () => {
    expect(html).toContain('Matches');
    expect(html).toContain('Goals');
    expect(html).toContain('Avg bpm');
    expect(html).toContain('1.0 / match'); // 3 goals over 3 scored matches
  });

  it('separates what you played, keeping training out of goals per match', () => {
    expect(html).toContain('What you played');
    expect(html).toContain('sits outside goals per match');
  });

  it('offers all three condition metrics', () => {
    for (const label of ['Avg HR', 'Z4–5', 'Load']) expect(html).toContain(label);
  });

  it('refuses a trend line it cannot support', () => {
    expect(html).toContain('of 5 matches with this data');
    expect(html).toContain('a season, not a fortnight');
  });

  it('keeps weekly load above the split, since it only means anything combined', () => {
    expect(html).toContain('Training rhythm · everything');
    expect(html.indexOf('Training rhythm')).toBeLessThan(html.indexOf('>football<'));
  });
});

describe('the catch-up prompt', () => {
  const URL = 'https://connect.garmin.com/app/activity/24101714769';

  it('points at the fetch button only when something can actually be fetched', () => {
    const withLink = render([match('2026-08-24', 'football', { goals: 1, garminUrl: URL })]);
    expect(withLink).toContain('fetch the 1 with a link');
  });

  it('asks for a link instead when no entry has one', () => {
    const noLink = render([match('2026-08-24', 'football', { goals: 1 })]);
    expect(noLink).toContain('none with a Garmin link');
    expect(noLink).not.toContain('fetch the');
  });
});
