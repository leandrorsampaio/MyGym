import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function StarRating({ value, onChange, size = 'lg', }) {
    const cls = size === 'lg' ? 'text-4xl' : 'text-xl';
    return (_jsx("div", { className: "flex gap-2", role: "radiogroup", "aria-label": "rating", children: [1, 2, 3].map((n) => (_jsx("button", { type: "button", "aria-label": `${n} star${n > 1 ? 's' : ''}`, "aria-checked": value === n, onClick: () => onChange(n), className: `${cls} leading-none transition ${n <= value ? 'text-amber-400' : 'text-line'}`, children: "\u2605" }, n))) }));
}
/** Read-only compact stars for stats. */
export function Stars({ value }) {
    const rounded = Math.round(value);
    return (_jsxs("span", { className: "text-amber-400", children: ['★'.repeat(rounded), _jsx("span", { className: "text-line", children: '★'.repeat(Math.max(0, 3 - rounded)) })] }));
}
