import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { gymStats, footballStats, consistency } from '../engine/stats';
import { Stars } from './StarRating';
function Chip({ label, value }) {
    return (_jsxs("div", { className: "flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-center", children: [_jsx("div", { className: "text-lg font-semibold text-slate-100", children: value }), _jsx("div", { className: "text-[11px] uppercase tracking-wide text-slate-500", children: label })] }));
}
export function ConsistencyChips({ log, today }) {
    const c = consistency(log, today);
    return (_jsxs("div", { className: "flex gap-2", children: [_jsx(Chip, { label: "This week", value: String(c.thisWeek) }), _jsx(Chip, { label: "Streak", value: `${c.streakWeeks}w` }), _jsx(Chip, { label: "Avg / week", value: c.avgPerWeek.toFixed(1) })] }));
}
function Tile({ title, children }) {
    return (_jsxs("div", { className: "flex-1 rounded-2xl border border-line bg-surface p-4", children: [_jsx("div", { className: "mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500", children: title }), _jsx("div", { className: "space-y-1 text-sm", children: children })] }));
}
function Row({ k, v }) {
    return (_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-slate-400", children: k }), _jsx("span", { className: "text-slate-100", children: v })] }));
}
export function StatTiles({ log }) {
    const g = gymStats(log);
    const f = footballStats(log);
    return (_jsxs("div", { className: "flex gap-3", children: [_jsxs(Tile, { title: "Gym", children: [_jsx(Row, { k: "Sessions", v: g.total }), _jsx(Row, { k: "A / B / C", v: `${g.bySession.A} / ${g.bySession.B} / ${g.bySession.C}` }), _jsx(Row, { k: "Full / T1", v: `${g.complete} / ${g.t1Only}` }), _jsx(Row, { k: "Avg", v: g.total ? _jsx(Stars, { value: g.avgRating }) : '—' })] }), _jsxs(Tile, { title: "Football", children: [_jsx(Row, { k: "Matches", v: f.matches }), _jsx(Row, { k: "Foot / Futsal", v: `${f.bySport.football} / ${f.bySport.futsal}` }), _jsx(Row, { k: "Goals", v: `${f.totalGoals} (${f.goalsPerMatch.toFixed(1)}/m)` }), _jsx(Row, { k: "Avg", v: f.matches ? _jsx(Stars, { value: f.avgRating }) : '—' })] })] }));
}
