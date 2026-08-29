import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkoutView, type Optional } from './WorkoutView';
import { parseProgram } from '../program/schema';
import programData from '../data/program.json';

const program = parseProgram(programData);

const render = (optional: Optional, session: 'A' | 'B' | 'C' = 'A') =>
  renderToStaticMarkup(
    createElement(WorkoutView, {
      program,
      session,
      cType: 'RSA',
      slot3Next: 'copenhagen',
      optional,
      onOptional: () => {},
      onPlay: () => {},
      onBack: () => {},
      onFinish: () => {},
    }),
  );

const t2InA = program.athleticPrep.items.filter((i) => i.tier === 'T2').length +
  (program.workouts.A.type === 'strength'
    ? program.workouts.A.items.filter((i) => i.tier === 'T2').length
    : 0);

describe('the optional tier is a decision, not a checklist', () => {
  it('asks once, and says what saying yes costs', () => {
    const html = render('undecided');
    expect(html).toContain('Optional work');
    expect(html).toContain(`${t2InA} exercises`);
    expect(html).toContain('Add it');
    expect(html).toContain('Skip');
  });

  it('holds the optional work back until it is asked for', () => {
    const t2Names = (program.workouts.A.type === 'strength' ? program.workouts.A.items : [])
      .filter((i) => i.tier === 'T2')
      .map((i) => i.label ?? i.movements[0]!.name);
    const before = render('undecided');
    const after = render('added');
    for (const name of t2Names) {
      expect(before).not.toContain(name);
      expect(after).toContain(name);
    }
  });

  it('always shows the essential work, whatever was decided', () => {
    const t1 = (program.workouts.A.type === 'strength' ? program.workouts.A.items : [])
      .filter((i) => i.tier === 'T1')
      .map((i) => i.label ?? i.movements[0]!.name);
    for (const state of ['undecided', 'added', 'skipped'] as Optional[])
      for (const name of t1) expect(render(state)).toContain(name);
  });

  it('leaves a way back after skipping — sessions change their mind', () => {
    expect(render('skipped')).toContain('add it after all');
  });
});

describe('the action bar says what finishing now would mean', () => {
  it('offers to finish the essential work while the tier is undecided', () => {
    expect(render('undecided')).toContain('Finish essential');
    expect(render('undecided')).toContain('Add optional');
  });

  it('becomes a plain finish once the decision is made either way', () => {
    for (const state of ['added', 'skipped'] as Optional[]) {
      expect(render(state)).toContain('Finish session');
      expect(render(state)).not.toContain('Finish essential');
    }
  });
});

describe('the session map', () => {
  it('lights the optional segment only when it is in', () => {
    expect(render('added')).toContain('Full session');
    expect(render('undecided')).toContain('Essential');
  });
});

describe('a conditioning session', () => {
  it('shows only the variant prescribed for today', () => {
    const html = render('undecided', 'C');
    const today = program.workouts.C.alternates.find((a) => a.key === 'RSA')!;
    const other = program.workouts.C.alternates.find((a) => a.key !== 'RSA');
    expect(html).toContain(today.label);
    if (other) expect(html).not.toContain(other.label);
  });
});
