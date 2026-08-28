import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GarminActivity } from './GarminActivity';
import { shapeGarminMetrics } from '../garmin/shape';
import activity from '../garmin/fixtures/activity.json';
import zones from '../garmin/fixtures/zones.json';
import details from '../garmin/fixtures/details.json';
import type { GarminMetrics } from '../log/types';

const full = shapeGarminMetrics(activity, zones, details, '2026-08-28T20:00:00.000Z');
const render = (g: GarminMetrics) => renderToStaticMarkup(createElement(GarminActivity, { garmin: g }));

describe('GarminActivity with a fully fetched activity', () => {
  const html = render(full);

  it('shows the headline numbers', () => {
    expect(html).toContain('Calories');
    expect(html).toContain('856');
    expect(html).toContain('Avg HR');
    expect(html).toContain('max 174');
    expect(html).toContain('Load');
    expect(html).toContain('186');
  });

  it('draws the HR zone breakdown with each zone and its share', () => {
    expect(html).toContain('Heart rate zones');
    for (const z of [1, 2, 3, 4, 5]) expect(html).toContain(`Z${z}`);
    // Zone 4 holds 1647 of 4804 seconds → 34%.
    expect(html).toContain('34%');
  });

  it('draws the HR curve as an svg path', () => {
    expect(html).toContain('Heart rate</div>');
    expect(html).toMatch(/<path d="M[\d.,]+L/);
  });

  it('shows training effect with Garmin\'s label', () => {
    expect(html).toContain('Aerobic');
    expect(html).toContain('4.1');
    expect(html).toContain('Anaerobic');
    expect(html).toContain('Lactate threshold');
  });

  it('hides distance for a device without GPS rather than showing 0.00 km', () => {
    expect(html).not.toContain('km');
  });
});

describe('GarminActivity with only the old thin data', () => {
  // What entries logged before the rendering Worker existed actually carry.
  const thin: GarminMetrics = {
    activityId: '24101714769',
    name: 'Timed Activity',
    durationSec: 4816,
    distanceM: 0,
    fetchedAt: '2026-08-25T20:00:00.000Z',
  };
  const html = render(thin);

  it('still renders what it has', () => {
    expect(html).toContain('Duration');
    expect(html).toContain('1h 20m');
  });

  it('omits every block it has no data for', () => {
    expect(html).not.toContain('Heart rate zones');
    expect(html).not.toContain('Training effect');
    expect(html).not.toContain('<path');
  });
});
