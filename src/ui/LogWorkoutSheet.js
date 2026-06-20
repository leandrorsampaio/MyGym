import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Sheet } from './Sheet';
import { StarRating } from './StarRating';
import { todayISO } from '../lib/clock';
export function LogWorkoutSheet({ open, program, session, defaultCType, defaultSlot3, defaultLegAppend, onClose, onSubmit, }) {
    const [date, setDate] = useState(todayISO());
    const [completion, setCompletion] = useState('complete');
    const [rating, setRating] = useState(2);
    const [cType, setCType] = useState(defaultCType ?? program.workouts.C.alternates[0]?.key);
    const [slot3, setSlot3] = useState(defaultSlot3);
    const [legAppend, setLegAppend] = useState(!!defaultLegAppend);
    const slot3Options = program.coreFinisher.slots.find((s) => s.rotates)?.options ?? [];
    const submit = () => {
        onSubmit({
            date,
            session,
            completion,
            rating,
            slot3,
            ...(session === 'C' ? { cType, legAppend } : {}),
        });
        onClose();
    };
    return (_jsx(Sheet, { open: open, onClose: onClose, title: `Finish Session ${session}`, children: _jsxs("div", { className: "space-y-4", children: [_jsx(Field, { label: "Date", children: _jsx("input", { type: "date", value: date, onChange: (e) => setDate(e.target.value), className: "w-full rounded-lg border border-line bg-surface2 px-3 py-2" }) }), _jsx(Field, { label: "Completion", children: _jsx("div", { className: "grid grid-cols-2 gap-2", children: ['complete', 't1'].map((c) => (_jsx("button", { onClick: () => setCompletion(c), className: `rounded-lg border py-2 font-medium ${completion === c ? 'border-accent text-accent' : 'border-line text-slate-300'}`, children: c === 'complete' ? 'Complete (T1+T2)' : 'T1 only' }, c))) }) }), session === 'C' && (_jsx(Field, { label: "Conditioning type", children: _jsx("div", { className: "grid grid-cols-2 gap-2", children: program.workouts.C.alternates.map((a) => (_jsx("button", { onClick: () => setCType(a.key), className: `rounded-lg border py-2 text-sm ${cType === a.key ? 'border-accent text-accent' : 'border-line text-slate-300'}`, children: a.label }, a.key))) }) })), _jsx(Field, { label: "Core slot-3 done", children: _jsx("select", { value: slot3, onChange: (e) => setSlot3(e.target.value), className: "w-full rounded-lg border border-line bg-surface2 px-3 py-2", children: slot3Options.map((o) => (_jsx("option", { value: o.key, children: o.name }, o.key))) }) }), session === 'C' && (_jsxs("label", { className: "flex items-center gap-2 text-sm text-slate-300", children: [_jsx("input", { type: "checkbox", checked: legAppend, onChange: (e) => setLegAppend(e.target.checked) }), "Added leg load (Squat 2\u00D75 + RDL 2\u00D78)"] })), _jsx(Field, { label: "How did it go?", children: _jsx(StarRating, { value: rating, onChange: setRating }) }), _jsx("button", { onClick: submit, className: "w-full rounded-xl bg-accent py-3 font-semibold text-bg active:bg-accentDim", children: "Log workout" })] }) }));
}
function Field({ label, children }) {
    return (_jsxs("div", { children: [_jsx("div", { className: "mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500", children: label }), children] }));
}
