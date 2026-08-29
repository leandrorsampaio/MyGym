import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { HistoryView } from './HistoryView';
import { gym, match } from '../test/factory';
import type { LogEntry } from '../log/types';

const LOG: LogEntry[] = [
  gym('2026-08-26', 'A', { completion: 'complete' }),
  match('2026-08-24', 'football', { goals: 2 }),
  match('2026-08-20', 'futsal', { goals: 1 }),
  match('2026-08-18', 'training'),
  gym('2026-07-30', 'B'),
];

const html = renderToStaticMarkup(
  createElement(HistoryView, { log: LOG, onOpen: () => {} }),
);

describe('HistoryView', () => {
  it('offers a filter for each kind of activity', () => {
    for (const f of ['All', 'Gym', 'Football', 'Futsal', 'Training']) expect(html).toContain(f);
  });

  it('lists everything by default, grouped by month', () => {
    expect(html).toContain('August 2026');
    expect(html).toContain('July 2026');
    expect(html).toContain('5 entries');
  });

  it('carries no edit or delete control on a row — those belong to the opened entry', () => {
    expect(html).not.toContain('Edit entry');
    expect(html).not.toContain('Delete entry');
    expect(html).not.toContain('🗑');
  });

  it('says so plainly when a filter matches nothing', () => {
    const empty = renderToStaticMarkup(
      createElement(HistoryView, { log: [gym('2026-08-26', 'A')], onOpen: () => {} }),
    );
    // The default filter still shows the gym session…
    expect(empty).toContain('Session A');
    // …and an entirely empty log gets its own wording.
    const none = renderToStaticMarkup(createElement(HistoryView, { log: [], onOpen: () => {} }));
    expect(none).toContain('No activity logged yet');
  });
});
