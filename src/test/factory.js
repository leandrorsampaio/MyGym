let n = 0;
const id = () => `t${++n}`;
export function gym(date, session, extra = {}) {
    return {
        id: id(),
        kind: 'gym',
        date,
        session,
        completion: extra.completion ?? 'complete',
        rating: (extra.rating ?? 2),
        cType: extra.cType,
        slot3: extra.slot3,
        legAppend: extra.legAppend,
        updatedAt: extra.updatedAt ?? `${date}T12:00:00Z`,
    };
}
export function match(date, sport, extra = {}) {
    return {
        id: id(),
        kind: 'match',
        date,
        sport,
        goals: extra.goals ?? 0,
        rating: (extra.rating ?? 2),
        updatedAt: extra.updatedAt ?? `${date}T20:00:00Z`,
    };
}
