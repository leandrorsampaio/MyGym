/** Tiny builders for log entries in tests. */
import type { GymEntry, MatchEntry, Rating, SessionId, Sport } from '../log/types';

let n = 0;
const id = () => `t${++n}`;

export function gym(
  date: string,
  session: SessionId,
  extra: Partial<Omit<GymEntry, 'id' | 'kind' | 'date' | 'session'>> = {},
): GymEntry {
  return {
    id: id(),
    kind: 'gym',
    date,
    session,
    completion: extra.completion ?? 'complete',
    rating: (extra.rating ?? 2) as Rating,
    cType: extra.cType,
    slot3: extra.slot3,
    legAppend: extra.legAppend,
    updatedAt: extra.updatedAt ?? `${date}T12:00:00Z`,
  };
}

export function match(
  date: string,
  sport: Sport,
  extra: Partial<Omit<MatchEntry, 'id' | 'kind' | 'date' | 'sport'>> = {},
): MatchEntry {
  return {
    id: id(),
    kind: 'match',
    date,
    sport,
    goals: extra.goals ?? 0,
    rating: (extra.rating ?? 2) as Rating,
    updatedAt: extra.updatedAt ?? `${date}T20:00:00Z`,
  };
}
