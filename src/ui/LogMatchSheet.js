import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Sheet } from './Sheet';
import { StarRating } from './StarRating';
import { todayISO } from '../lib/clock';
export function LogMatchSheet({ open, onClose, onSubmit, }) {
    const [sport, setSport] = useState('football');
    const [date, setDate] = useState(todayISO());
    const [goals, setGoals] = useState(0);
    const [rating, setRating] = useState(2);
    const submit = () => {
        onSubmit({ date, sport, goals, rating });
        onClose();
    };
    return (_jsx(Sheet, { open: open, onClose: onClose, title: "Log a match", children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "grid grid-cols-2 gap-2", children: ['football', 'futsal'].map((s) => (_jsx("button", { onClick: () => setSport(s), className: `rounded-lg border py-2 font-medium capitalize ${sport === s ? 'border-accent text-accent' : 'border-line text-slate-300'}`, children: s }, s))) }), _jsxs("div", { children: [_jsx("div", { className: "mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Date" }), _jsx("input", { type: "date", value: date, onChange: (e) => setDate(e.target.value), className: "w-full rounded-lg border border-line bg-surface2 px-3 py-2" })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Goals" }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: () => setGoals((g) => Math.max(0, g - 1)), className: "h-11 w-11 rounded-lg border border-line text-xl", children: "\u2212" }), _jsx("span", { className: "w-10 text-center text-2xl font-semibold", children: goals }), _jsx("button", { onClick: () => setGoals((g) => g + 1), className: "h-11 w-11 rounded-lg border border-line text-xl", children: "+" })] })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Performance" }), _jsx(StarRating, { value: rating, onChange: setRating })] }), _jsx("button", { onClick: submit, className: "w-full rounded-xl bg-accent py-3 font-semibold text-bg active:bg-accentDim", children: "Log match" })] }) }));
}
