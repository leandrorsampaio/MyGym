import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Sport } from '../log/types';
import { LogMatchSheet } from './LogMatchSheet';

function render(sport: Sport) {
  return renderToStaticMarkup(
    createElement(LogMatchSheet, {
      open: true,
      initial: { date: '2026-06-15', sport, goals: 2, rating: 2 },
      onClose: () => {},
      onSubmit: () => {},
    }),
  );
}

describe('LogMatchSheet', () => {
  it('offers all three things you can play', () => {
    const html = render('football');
    expect(html).toContain('football');
    expect(html).toContain('training');
    expect(html).toContain('futsal');
  });

  it('asks for goals on a real match', () => {
    expect(render('football')).toContain('Goals');
    expect(render('futsal')).toContain('Goals');
  });

  it('hides goals for training — there is no scoreline', () => {
    const html = render('training');
    expect(html).not.toContain('Goals');
    expect(html).toContain('Performance');
  });
});
