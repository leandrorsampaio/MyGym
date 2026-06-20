import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { isIOS, isStandalone } from '../pwa/persist';
const DISMISS_KEY = 'mygym-install-hint-dismissed';
/**
 * One-time hint nudging iOS users to "Add to Home Screen" — iOS has no install
 * prompt, and installing is what unlocks offline + persistent storage.
 */
export function InstallHint() {
    const [show, setShow] = useState(false);
    useEffect(() => {
        const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
        if (isIOS() && !isStandalone() && !dismissed)
            setShow(true);
    }, []);
    if (!show)
        return null;
    return (_jsx("div", { className: "rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-slate-200", children: _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("p", { children: ["Install MyGym: tap ", _jsx("b", { children: "Share" }), " ", _jsx("span", { "aria-hidden": true, children: "\uDBC0\uDE02" }), " \u2192 ", _jsx("b", { children: "Add to Home Screen" }), ". This enables offline use at the gym and keeps your data safe."] }), _jsx("button", { onClick: () => {
                        localStorage.setItem(DISMISS_KEY, '1');
                        setShow(false);
                    }, "aria-label": "Dismiss", className: "text-slate-400", children: "\u2715" })] }) }));
}
