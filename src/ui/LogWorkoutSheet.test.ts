import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseProgram } from '../program/schema';
import programData from '../data/program.json';
import { LogWorkoutSheet } from './LogWorkoutSheet';

const program = parseProgram(programData);

function render(initial: any, session: 'A' | 'B' | 'C' = 'A') {
  return renderToStaticMarkup(
    createElement(LogWorkoutSheet, {
      open: true,
      program,
      session,
      defaultSlot3: 'copenhagen',
      initial,
      title: `Edit Session ${session}`,
      submitLabel: 'Save changes',
      onClose: () => {},
      onSubmit: () => {},
    }),
  );
}

describe('LogWorkoutSheet edit mode', () => {
  it('shows the completion toggle (Complete / T1 only)', () => {
    const html = render({ date: '2026-06-15', completion: 't1', rating: 2, session: 'A', slot3: 'copenhagen' });
    expect(html).toContain('Completion');
    expect(html).toContain('Complete (T1+T2)');
    expect(html).toContain('T1 only');
  });

  it('no longer shows the core slot-3 dropdown', () => {
    const html = render({ date: '2026-06-15', completion: 'complete', rating: 3, session: 'A', slot3: 'side' });
    expect(html).not.toContain('Core slot-3');
  });
});
