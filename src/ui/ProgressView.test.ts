import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProgressView } from './ProgressView';
import { gym, match } from '../test/factory';
import type { GarminMetrics, LogEntry } from '../log/types';

const TODAY = '2026-08-28';
const g = (over: Partial<GarminMetrics>): GarminMetrics => ({
  activityId: 'a', fetchedAt: '2026-08-28T00:00:00.000Z', ...over,
});
const zones = (easy: number, hard: number) => [
  { zone: 2, seconds: easy },
  { zone: 4, seconds: hard },
];

const render = (log: LogEntry[]) =>
  renderToStaticMarkup(createElement(ProgressView, { log, today: TODAY, onEntry: () => {} }));

describe('with nothing linked yet', () => {
  const html = render([gym('2026-08-24', 'A'), match('2026-08-24', 'football', { goals: 1 })]);

  it('says what is missing instead of drawing empty charts', () => {
    expect(html).toContain('none with a Garmin link yet');
  });

  it('does not pretend a trend exists', () => {
    expect(html).toContain('of 5 matches with heart-rate data');
    expect(html).not.toMatch(/<path d="M[\d.,]+L[\d.,]+L/);
  });
});

describe('with a handful of matches', () => {
  const log: LogEntry[] = [
    match('2026-07-06', 'football', { goals: 1, garmin: g({ exerciseLoad: 180, avgHr: 145, hrZones: zones(600, 400) }) }),
    match('2026-07-13', 'football', { goals: 2, garmin: g({ exerciseLoad: 170, avgHr: 142, hrZones: zones(600, 500) }) }),
    match('2026-07-20', 'football', { goals: 0, garmin: g({ exerciseLoad: 190, avgHr: 141, hrZones: zones(500, 600) }) }),
    gym('2026-07-22', 'B', { garmin: g({ exerciseLoad: 70, avgHr: 118 }) }),
  ];
  const html = render(log);

  it('draws the load bars once anything is linked', () => {
    expect(html).toContain('Weekly training load');
    expect(html).toContain('gym');
    expect(html).toContain('football');
  });

  it('counts down to a usable trend rather than drawing one', () => {
    expect(html).toContain('2 more matches for a trend line');
    expect(html).toContain('3 of 5 matches with heart-rate data');
  });

  it('warns that unlinked activities understate the load', () => {
    expect(render([...log, gym('2026-07-23', 'A')])).toContain('understate the real load');
  });
});

describe('with enough history to trend', () => {
  const log: LogEntry[] = Array.from({ length: 6 }, (_, i) =>
    match(`2026-07-${String(6 + i * 3).padStart(2, '0')}`, 'football', {
      goals: i % 3,
      garmin: g({ exerciseLoad: 180 - i, avgHr: 148 - i, hrZones: zones(600, 300 + i * 40) }),
    }),
  );
  const html = render(log);

  it('draws all three trend lines', () => {
    expect(html).toContain('rolling avg');
    expect(html).toContain('lower at the same load = fitter');
    expect(html).toContain('of the match');
    expect(html.match(/<path d="M/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('reports the median match load alongside the HR trend', () => {
    expect(html).toContain('median load');
  });
});

describe('the catch-up banner', () => {
  it('offers to fetch entries that have a link but no data', () => {
    const html = render([
      match('2026-08-24', 'football', { garminUrl: 'https://connect.garmin.com/app/activity/24101714769' }),
    ]);
    expect(html).toContain('1 activity has a Garmin link but');
    expect(html).toContain('Fetch them all');
  });

  it('stays out of the way when there is nothing to catch up on', () => {
    expect(render([match('2026-08-24', 'football', { goals: 1 })])).not.toContain('Fetch them all');
  });
});
