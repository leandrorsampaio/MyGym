# MyGym — AI Context (start here)

> **This is the single entry point for any AI (Claude Code or other) working on this project.**
> Read this file first. It links to everything else. If you only read one file, read this one.

MyGym is a **personal, single-user gym + football training app** for one person (the owner),
used **only on their iPhone**. It acts as a "smart coach": it recommends which gym session to
do next based on a training cycle and logged football/futsal, shows the workout, and tracks
stats. It's an **offline-first installable PWA** that deploys to **Cloudflare**.

**Status:** feature-complete and running locally. The one thing not done is **deployment**
(needs the owner's Cloudflare account — see `DEPLOY.md`). Everything else works.

---

## Document map

| File | What it is | When to read |
|------|-----------|--------------|
| **`AGENTS.md`** (this) | AI context + operating guide | Always, first |
| `REQUIREMENTS.md` | Product requirements & decisions log | Understanding *what* and *why* |
| `ARCHITECTURE.md` | Technical design & rationale | Understanding *how* it's built |
| `DEPLOY.md` | Step-by-step Cloudflare deploy checklist | Deploying / infra |
| `trainning.md` | The owner's real training program (source for `program.json`) | Editing the program data |
| `src/data/program.json` | The live program data (JSON-driven) | Changing exercises/videos/thumbnails |

---

## The one mental model that explains everything

```
UI = f(program, activityLog, today)
```

- **`program`** — the prescription (exercises, reps, videos, thumbnails). JSON-driven, swappable.
- **`activityLog`** — an append-mostly list of events (gym sessions + matches). **The source of truth.**
- Everything "smart" — the next-session recommendation, the C-type / Core-slot-3 rotation, every
  statistic — is a **pure, deterministic function over the log + program + today's date.**

Consequences you must preserve:
- **The brain needs no server.** Recommendation/stats run client-side → works offline.
- **Rotation state is derived from the log, never stored.** "What's next" is read off the last
  log entries (see `engine/rotation.ts`). Do not add a separate mutable rotation counter.
- **Engine is pure and clock-free.** `today` is always passed in. Only `src/lib/clock.ts` and UI
  read the real clock. This keeps the engine unit-testable. Keep it that way.

---

## Tech stack

- **Frontend:** Vite + React 18 + TypeScript, Tailwind CSS. **Single page, no router** (views are
  state-driven in `App.tsx`). Mobile-first (iPhone only).
- **State:** Zustand store (`src/store/useStore.ts`), persisted to **IndexedDB** (`idb-keyval`).
- **Validation:** Zod (`src/program/schema.ts`) validates uploaded program JSON.
- **PWA/offline:** `vite-plugin-pwa` (Workbox) — service worker, manifest, runtime image cache.
- **Backend (Cloudflare):** Pages (static host) + Pages Functions (`functions/api/logs.ts`) + D1
  (SQLite) for cloud backup + Cloudflare Access (Google login locked to one email — no app auth code).
- **Tests:** Vitest. Pure logic (engine, sync merge, schema) is unit-tested; one SSR render test.

---

## Repo map

```
src/
  main.tsx, App.tsx        App entry + the single-page view switch (home | workout | history)
  index.css               Tailwind + iOS safe-area helpers
  data/program.json       THE PROGRAM DATA (exercises, reps, rest, videos, thumbnails)
  program/schema.ts       Zod schema + types for the program (Movement, Item, Workout, Program…)
  log/types.ts            LogEntry union: GymEntry | MatchEntry (the activity log)
  engine/                 PURE logic, unit-tested — the "brain"
    dates.ts                ISO date/week math (parse, isoWeekKey, weekIndex, addDays…)
    recommend.ts            recommend(program, log, today) → next session + warnings
    rotation.ts             nextCType / nextSlot3, derived from the log
    stats.ts                gymStats / footballStats / consistency
    insights.ts             lastActivity / buildHeatmap / highlights (homepage extras)
  store/useStore.ts       Zustand store (program + log + sync outbox), IndexedDB persistence
  store/idbStorage.ts     IndexedDB adapter for Zustand persist
  sync/                   Cloud backup sync (write-behind, last-write-wins)
    api.ts                  fetch wrappers for /api/logs
    sync.ts                 syncNow() orchestration (pull→merge→push), online/startup triggers
    merge.ts                pure mergeRemote() (last-write-wins, respects tombstones) — tested
  lib/clock.ts            todayISO / nowISO / newId — the ONLY place UI reads the clock
  lib/youtube.ts          YouTube Shorts/watch URL → embed URL
  pwa/persist.ts          requestPersistentStorage, isStandalone, isIOS
  ui/                     Components (Hero, WorkoutView, ExerciseItem, Heatmap, HistoryView,
                          Log*Sheet, ConfirmDialog, Thumb, VideoModal, Stats, etc.)
functions/
  api/logs.ts             GET (pull) / POST (upsert + soft-delete) — verifies Access JWT
  lib/access.ts           Cloudflare Access JWT verification (defense-in-depth)
  tsconfig.json           Workers-typed config (separate from the app's tsconfig)
migrations/0001_init.sql  D1 `logs` table
wrangler.toml             Pages + D1 + Access vars config
```

---

## Commands

```bash
npm run dev            # Vite dev server (UI only; no backend — sync fails gracefully). Test here.
npm test               # Vitest (run once).  npm run test:watch for watch mode.
npx tsc --noEmit       # Type-check the app
npm run typecheck:functions   # Type-check the Cloudflare Functions (Workers types)
npm run build          # tsc --noEmit && vite build  (generates PWA service worker)
npm run icons          # Regenerate PWA icons from public/icon.svg (needs sharp)

# Backend / deploy (need Cloudflare account — see DEPLOY.md)
npm run db:migrate:local   # set up local D1
npm run pages:dev          # serve built app + Functions + local D1 (full stack)
npm run db:migrate         # apply migration to remote D1
```

---

## Rules / invariants you MUST respect

1. **Keep the engine pure & clock-free.** `engine/*` takes `today: string` as input; never call
   `new Date()` there. Only `src/lib/clock.ts` + UI read the clock. This is why the engine is testable.
2. **Build never emits JS into `src/`.** The build is `tsc --noEmit && vite build` and tsconfig has
   `"noEmit": true`. **Never** switch the build to `tsc -b` — it once emitted stale `.js` files next
   to `.ts` that the bundler then resolved instead of the source (a real bug we fixed).
3. **Program is JSON-driven.** Don't hardcode exercises. Edit `src/data/program.json` (validated by
   `program/schema.ts`). Built-in program always follows the bundled JSON; a user-**uploaded** program
   persists. This is handled by the `merge` in `useStore.ts` via `programSource: 'builtin' | 'custom'` —
   if you change program data, the built-in path picks it up automatically on reload (no migration needed).
4. **Rotation is derived from the log**, not stored. Don't add rotation counters.
5. **Single page, no router.** Add views as state in `App.tsx` (like `history`), not routes.
6. **Mobile-first, iOS.** Design for iPhone Safari. No Background Sync (sync on app-open + `online`).
7. **Add tests for pure logic.** Anything in `engine/` or `sync/merge.ts` should get a vitest test.
8. **Match surrounding code style.** TypeScript strict, Tailwind utility classes, theme colors in
   `tailwind.config.js` (`bg`, `surface`, `surface2`, `line`, `accent`). No new deps without reason.

---

## How the key pieces work

### Recommendation (`engine/recommend.ts`)
A 7–10 day cycle with 2 gym slots = **Session A + (B or C)**, A every cycle. Backbone: last gym A →
next is B/C; last gym B/C → next is A; no history → A. **Futsal week → C, else B** (or C if
`preferHeavy`). Hard rules layered on: never B within 48h of a match **or football training** (→ swap
to A — both are hard leg loads); two futsal weeks
without leg loading → C gets "Squat 2×5 + RDL 2×8". "Futsal week" = a futsal match **logged** in the
same ISO week. The forward-looking 48h guard uses only the regular **football** schedule (Mon), since
futsal is occasional. See `REQUIREMENTS.md` §8 and `trainning.md` for the full coaching rules.

### Program data model (`program/schema.ts`)
`Program` = `version`, optional `schedule` (typical week), `athleticPrep` (tiered items),
`coreFinisher` (3 slots; slot 3 rotates through options), `workouts.A/B` (strength items),
`workouts.C` (conditioning: warmup, alternating RSA/VO₂max, cooldown). An **Item** has tier (T1/T2),
reps, rest, note, and **`movements[]`** (1 = normal, 2+ = superset). A **Movement** has name,
optional `video` (YouTube), `thumbnail` (URL or app path), `reps`, `key`.

### Activity log (`log/types.ts`)
`GymEntry` (session A/B/C, completion complete|t1, rating 1–3, cType for C, slot3, legAppend) or
`MatchEntry` (sport football|training|futsal, goals, rating). `training` is football played without a
match, so it carries no scoreline (`goals` is always 0) and never counts as a "futsal week"; it *does*
count for the 48h rule. Each has `id`, `date` (YYYY-MM-DD), `updatedAt`.

### Sync (`sync/`)
Write-behind backup, single device → no real conflicts. Outbox = `dirty` ids + `tombstones` in the
store. `syncNow()` pulls (merge last-write-wins) then pushes pending; fails silently offline.
`/api/logs` upserts by id with `updated_at >= ` guard.

### Media
Thumbnails: public-domain illustrations from **free-exercise-db** via jsDelivr CDN (cached offline by
the SW). `public/exercise-placeholder.svg` is the fallback. Videos: YouTube **Shorts** (all of them),
opened in an in-app modal (`VideoModal`) with an "Open in YouTube" escape hatch.

### Auth (after deploy)
Cloudflare Access gates the whole site (Google login, locked to the owner's Gmail). The app assumes
"if it's running, it's me" — **no login UI**. The API additionally verifies the Access JWT.

---

## Current status

**Done:** engine, full UI, stats (heatmap with periods + rating intensity, session breakdown,
highlights, tiles, history with view/edit/delete), JSON upload+download, thumbnails+videos, PWA/offline
code, sync code (verified locally against local D1).

**Pending:**
- **Deploy (the big one)** — Cloudflare Pages + custom domain `mygym.lsampaio.dev` + D1 + Access. See
  `DEPLOY.md`. Open question: is `lsampaio.dev` on Cloudflare DNS? (required).
- Optional polish: "feeling heavy → C" override button, schedule editor UI, history filters.

---

## Gotchas (things that have bitten us)

- **Stale persisted state.** The store persists `program` + `log` to IndexedDB. Editing
  `program.json` won't show until reload, and a previously-persisted program could shadow it — solved
  by the `programSource` merge (built-in follows the bundle). If something looks stale in dev, **hard
  refresh**; the service worker can also serve a stale built app (test UI on `npm run dev` :5173 which
  has no SW).
- **Service worker caching.** PWA only registers on HTTPS or `localhost`. On the phone over a LAN
  `http://192.168.x.x` URL the SW won't register — real offline/install testing needs the HTTPS deploy.
- **iOS.** No Background Sync; we sync on app-open + `online`. We call `navigator.storage.persist()`.
  Install is manual ("Add to Home Screen"); there's a one-time hint.
- **Git identity.** This project uses the owner's **personal** GitHub account
  (`leandro.r.sampaio@gmail.com`) — already set as the repo's local `user.email`.

---

## Recipes (common changes)

- **Add/replace an exercise video or thumbnail:** edit `src/data/program.json` (or use the in-app
  Download JSON → edit → drag back in). Validate with `npm test` (schema test parses it).
- **Add a stat:** write a pure function in `engine/stats.ts` or `engine/insights.ts` + a vitest test,
  then a small component in `src/ui/` and render it in `App.tsx`'s home view.
- **Change a coaching rule:** edit `engine/recommend.ts` and update/extend `recommend.test.ts`.
- **Add a new view (e.g. settings page):** add a value to the `View` union in `App.tsx` and render it
  conditionally — do not add a router.
