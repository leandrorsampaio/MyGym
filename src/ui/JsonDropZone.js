import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Sheet } from './Sheet';
import { useStore } from '../store/useStore';
/** Drag & drop (or tap to pick) a program JSON file to replace the current program. */
export function ProgramSheet({ open, onClose }) {
    const program = useStore((s) => s.program);
    const loadProgram = useStore((s) => s.loadProgram);
    const resetProgram = useStore((s) => s.resetProgram);
    const [error, setError] = useState(null);
    const [ok, setOk] = useState(null);
    const [dragging, setDragging] = useState(false);
    const handleFile = async (file) => {
        setError(null);
        setOk(null);
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            const err = loadProgram(json);
            if (err)
                setError(err);
            else
                setOk(`Loaded program "${json.version ?? '?'}".`);
        }
        catch (e) {
            setError(`Not valid JSON: ${e.message}`);
        }
    };
    return (_jsx(Sheet, { open: open, onClose: onClose, title: "Training program", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "text-sm text-slate-400", children: ["Current version: ", _jsx("span", { className: "text-slate-100", children: program.version })] }), _jsxs("label", { onDragOver: (e) => {
                        e.preventDefault();
                        setDragging(true);
                    }, onDragLeave: () => setDragging(false), onDrop: (e) => {
                        e.preventDefault();
                        setDragging(false);
                        const f = e.dataTransfer.files[0];
                        if (f)
                            handleFile(f);
                    }, className: `block cursor-pointer rounded-xl border-2 border-dashed p-8 text-center ${dragging ? 'border-accent bg-accent/5' : 'border-line'}`, children: [_jsx("div", { className: "text-slate-300", children: "Drop a program JSON here" }), _jsx("div", { className: "mt-1 text-xs text-slate-500", children: "or tap to choose a file" }), _jsx("input", { type: "file", accept: "application/json,.json", className: "hidden", onChange: (e) => e.target.files?.[0] && handleFile(e.target.files[0]) })] }), error && (_jsx("pre", { className: "whitespace-pre-wrap rounded-lg bg-red-500/10 p-3 text-xs text-red-300", children: error })), ok && _jsx("div", { className: "rounded-lg bg-accent/10 p-3 text-sm text-accent", children: ok }), _jsx("button", { onClick: resetProgram, className: "w-full rounded-xl border border-line py-2 text-sm text-slate-300", children: "Reset to built-in program" })] }) }));
}
