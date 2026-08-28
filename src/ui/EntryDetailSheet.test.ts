import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EntryDetailSheet } from './EntryDetailSheet';
import { parseProgram } from '../program/schema';
import programData from '../data/program.json';
import { shapeGarminMetrics } from '../garmin/shape';
import activity from '../garmin/fixtures/activity.json';
import zones from '../garmin/fixtures/zones.json';
import details from '../garmin/fixtures/details.json';
import type { GymEntry, MatchEntry } from '../log/types';

const program = parseProgram(programData);
const base: MatchEntry = {
  id: 'm1',
  kind: 'match',
  date: '2026-08-24',
  sport: 'football',
  goals: 1,
  rating: 3,
  updatedAt: '2026-08-24T21:00:00.000Z',
};

// Effects don't run under static rendering, so this is the pre-fetch paint.
const render = (entry: MatchEntry | GymEntry | null) =>
  renderToStaticMarkup(
    createElement(EntryDetailSheet, {
      entry,
      program,
      onClose: () => {},
      onEdit: () => {},
      onUpdate: () => {},
    }),
  );

describe('EntryDetailSheet', () => {
  it('renders nothing without an entry', () => {
    expect(render(null)).toBe('');
  });

  it('shows the full activity once the data is stored', () => {
    const garmin = shapeGarminMetrics(activity, zones, details, '2026-08-28T20:00:00.000Z');
    const html = render({ ...base, garminUrl: 'https://connect.garmin.com/app/activity/24101714769', garmin });
    expect(html).toContain('Heart rate zones');
    expect(html).toContain('Training effect');
    expect(html).toContain('856');
    // Nothing left for the user to press — the data is simply there.
    expect(html).not.toContain('press Fetch');
  });

  it('never tells the user to go and press Fetch themselves', () => {
    const html = render({ ...base, garminUrl: 'https://connect.garmin.com/app/activity/24101714769' });
    expect(html).not.toMatch(/tap Edit|press Fetch/i);
  });

  it('shows no Garmin section at all for a match with no link', () => {
    const html = render(base);
    expect(html).not.toContain('Garmin');
  });
});

describe('a gym session recorded on the watch', () => {
  const gym: GymEntry = {
    id: 'g1',
    kind: 'gym',
    date: '2026-08-27',
    session: 'A',
    completion: 'complete',
    rating: 2,
    slot3: 'copenhagen',
    updatedAt: '2026-08-27T18:00:00.000Z',
  };

  it('shows its Garmin activity, same as a match', () => {
    const garmin = shapeGarminMetrics(activity, zones, details, '2026-08-28T20:00:00.000Z');
    const html = render({ ...gym, garminUrl: 'https://connect.garmin.com/app/activity/24101714769', garmin });
    expect(html).toContain('Session A');
    expect(html).toContain('Heart rate zones');
    expect(html).toContain('Training effect');
  });

  it('shows no Garmin section when the session has no link', () => {
    expect(render(gym)).not.toContain('Garmin');
  });
});
