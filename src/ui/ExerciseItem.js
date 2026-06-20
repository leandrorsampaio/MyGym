import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
function TierBadge({ tier }) {
    return (_jsx("span", { className: `rounded px-1.5 py-0.5 text-[10px] font-bold ${tier === 'T1' ? 'bg-accent/20 text-accent' : 'bg-slate-600/30 text-slate-400'}`, children: tier }));
}
function PlayButton({ m, onPlay }) {
    if (!m.video)
        return _jsx("span", { className: "text-xs text-slate-600", children: "no video" });
    return (_jsx("button", { onClick: () => onPlay(m.video, m.name), className: "rounded-lg bg-surface2 px-3 py-1 text-xs font-medium text-accent", children: "\u25B6 Play" }));
}
export function ExerciseItem({ item, onPlay, }) {
    const multi = item.movements.length > 1;
    const heading = item.label ?? item.movements[0]?.name ?? '';
    return (_jsxs("div", { className: "rounded-xl border border-line bg-surface p-3", children: [_jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(TierBadge, { tier: item.tier }), _jsx("span", { className: "font-medium text-slate-100", children: heading })] }), _jsxs("div", { className: "text-right text-sm text-slate-300", children: [item.reps && _jsx("div", { children: item.reps }), item.rest && _jsxs("div", { className: "text-xs text-slate-500", children: ["rest ", item.rest] })] })] }), item.intensity && _jsx("div", { className: "mt-1 text-xs text-amber-300/80", children: item.intensity }), multi ? (_jsx("div", { className: "mt-2 space-y-1", children: item.movements.map((m, i) => (_jsxs("div", { className: "flex items-center justify-between rounded-lg bg-surface2/50 px-2 py-1.5", children: [_jsxs("span", { className: "text-sm text-slate-200", children: [m.name, m.reps && _jsxs("span", { className: "text-slate-500", children: [" \u00B7 ", m.reps] })] }), _jsx(PlayButton, { m: m, onPlay: onPlay })] }, i))) })) : (_jsx("div", { className: "mt-2 flex justify-end", children: _jsx(PlayButton, { m: item.movements[0], onPlay: onPlay }) })), item.note && _jsx("p", { className: "mt-2 text-xs leading-relaxed text-slate-400", children: item.note })] }));
}
