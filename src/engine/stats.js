import { isGym, isMatch } from '../log/types';
import { isoWeekKey, addDays } from './dates';
function avg(nums) {
    if (nums.length === 0)
        return 0;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
}
export function gymStats(log) {
    const gym = log.filter(isGym);
    const bySession = { A: 0, B: 0, C: 0 };
    for (const e of gym)
        bySession[e.session]++;
    return {
        total: gym.length,
        bySession,
        complete: gym.filter((e) => e.completion === 'complete').length,
        t1Only: gym.filter((e) => e.completion === 't1').length,
        avgRating: avg(gym.map((e) => e.rating)),
    };
}
export function footballStats(log) {
    const matches = log.filter(isMatch);
    const bySport = { football: 0, futsal: 0 };
    for (const e of matches)
        bySport[e.sport]++;
    const totalGoals = matches.reduce((a, e) => a + e.goals, 0);
    return {
        matches: matches.length,
        bySport,
        totalGoals,
        goalsPerMatch: matches.length ? totalGoals / matches.length : 0,
        avgRating: avg(matches.map((e) => e.rating)),
    };
}
export function consistency(log, today, windowWeeks = 8) {
    const weekCounts = new Map();
    for (const e of log) {
        const key = isoWeekKey(e.date);
        weekCounts.set(key, (weekCounts.get(key) ?? 0) + 1);
    }
    const thisWeekKey = isoWeekKey(today);
    const thisWeek = weekCounts.get(thisWeekKey) ?? 0;
    // Streak: walk back week by week while each week has activity.
    let streakWeeks = 0;
    for (let i = 0;; i++) {
        const key = isoWeekKey(addDays(today, -7 * i));
        if ((weekCounts.get(key) ?? 0) > 0)
            streakWeeks++;
        else
            break;
    }
    // Average over the trailing window (including weeks with zero activity).
    let windowTotal = 0;
    for (let i = 0; i < windowWeeks; i++) {
        windowTotal += weekCounts.get(isoWeekKey(addDays(today, -7 * i))) ?? 0;
    }
    return { thisWeek, streakWeeks, avgPerWeek: windowTotal / windowWeeks };
}
