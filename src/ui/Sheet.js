import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
/** A bottom sheet / modal. Tap the backdrop or the close button to dismiss. */
export function Sheet({ open, onClose, title, children, }) {
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    if (!open)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-50 flex flex-col justify-end bg-black/60", onClick: onClose, children: _jsxs("div", { className: "safe-bottom max-h-[90vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "mb-3 flex items-center justify-between", children: [_jsx("h2", { className: "text-lg font-semibold", children: title }), _jsx("button", { onClick: onClose, className: "rounded-full px-3 py-1 text-slate-400", "aria-label": "Close", children: "\u2715" })] }), children] }) }));
}
