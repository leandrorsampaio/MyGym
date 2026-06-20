import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useStore, useHydrated } from './store/useStore';
import { recommend } from './engine/recommend';
import { nextCType, nextSlot3 } from './engine/rotation';
import { todayISO } from './lib/clock';
import { requestPersistentStorage } from './pwa/persist';
import { Hero } from './ui/Hero';
import { ConsistencyChips, StatTiles } from './ui/Stats';
import { WorkoutView } from './ui/WorkoutView';
import { VideoModal } from './ui/VideoModal';
import { LogWorkoutSheet } from './ui/LogWorkoutSheet';
import { LogMatchSheet } from './ui/LogMatchSheet';
import { ProgramSheet } from './ui/JsonDropZone';
import { InstallHint } from './ui/InstallHint';
export default function App() {
    const hydrated = useHydrated();
    const program = useStore((s) => s.program);
    const log = useStore((s) => s.log);
    const addGym = useStore((s) => s.addGym);
    const addMatch = useStore((s) => s.addMatch);
    useEffect(() => {
        requestPersistentStorage();
    }, []);
    const today = todayISO();
    const rec = useMemo(() => recommend(program, log, today), [program, log, today]);
    const slot3Next = useMemo(() => nextSlot3(program, log), [program, log]);
    const cType = useMemo(() => nextCType(program, log), [program, log]);
    const [view, setView] = useState('home');
    const [activeSession, setActiveSession] = useState(rec.nextSession);
    const [video, setVideo] = useState(null);
    const [finishOpen, setFinishOpen] = useState(false);
    const [matchOpen, setMatchOpen] = useState(false);
    const [programOpen, setProgramOpen] = useState(false);
    const start = (s) => {
        setActiveSession(s);
        setView('workout');
        window.scrollTo(0, 0);
    };
    const legAppend = activeSession === rec.nextSession ? rec.legAppend : undefined;
    if (!hydrated) {
        return (_jsx("div", { className: "grid min-h-full place-items-center text-slate-500", children: _jsxs("div", { className: "text-xl font-bold tracking-tight", children: ["My", _jsx("span", { className: "text-accent", children: "Gym" })] }) }));
    }
    return (_jsxs("div", { className: "safe-top mx-auto min-h-full max-w-md px-4 pb-10", children: [_jsxs("header", { className: "flex items-center justify-between py-4", children: [_jsxs("h1", { className: "text-xl font-bold tracking-tight", children: ["My", _jsx("span", { className: "text-accent", children: "Gym" })] }), _jsx("button", { onClick: () => setProgramOpen(true), "aria-label": "Program settings", className: "text-xl text-slate-400", children: "\u2699" })] }), view === 'home' ? (_jsxs("div", { className: "space-y-4", children: [_jsx(InstallHint, {}), _jsx(Hero, { program: program, rec: rec, onStart: start }), _jsx(ConsistencyChips, { log: log, today: today }), _jsx(StatTiles, { log: log }), _jsx("button", { onClick: () => setMatchOpen(true), className: "w-full rounded-xl border border-line bg-surface py-3 font-medium text-slate-200", children: "\u26BD I played \u2014 log a match" })] })) : (_jsx(WorkoutView, { program: program, session: activeSession, cType: cType, slot3Next: slot3Next, legAppend: legAppend, onPlay: (url, title) => setVideo({ url, title }), onBack: () => setView('home'), onFinish: () => setFinishOpen(true) })), video && _jsx(VideoModal, { url: video.url, title: video.title, onClose: () => setVideo(null) }), _jsx(LogWorkoutSheet, { open: finishOpen, program: program, session: activeSession, defaultCType: cType, defaultSlot3: slot3Next, defaultLegAppend: legAppend, onClose: () => setFinishOpen(false), onSubmit: (e) => {
                    addGym(e);
                    setView('home');
                    window.scrollTo(0, 0);
                } }), _jsx(LogMatchSheet, { open: matchOpen, onClose: () => setMatchOpen(false), onSubmit: addMatch }), _jsx(ProgramSheet, { open: programOpen, onClose: () => setProgramOpen(false) })] }));
}
