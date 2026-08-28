# MyGym — Architecture

Technical design for the MyGym app. Companion to `REQUIREMENTS.md`.

> Status: **Agreed direction** — ready to start building (Phase 1).

---

## 1. Guiding principle — the app is a pure function of (program, log, today)

```
UI = f(programJSON, activityLog, today)
```

- **Program JSON** — the prescription (replaceable, config-like).
- **Activity log** — an append-only list of events (gym sessions + matches).
- Everything "smart" — next-session recommendation, C-type / Core slot-3 rotation, rule warnings, and every statistic — is a **pure, deterministic function over the log**.

Consequences we design around:
- **The brain needs no server** → recommendations run client-side → works offline at the gym.
- **No mutable rotation state to corrupt** → "what's next" is *read off the last log entries*, not an incremented counter.
- **Trivially testable** → `recommend(program, log, date) → session`.
- **Backend is additive** → the log lives locally; the cloud (D1) is durable *backup*, not a runtime dependency.

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Vite + React + TypeScript** | Single page, no router. |
| Styling | **Tailwind CSS** | Mobile-first, clean. |
| PWA / offline | **vite-plugin-pwa (Workbox)** | SW, manifest, precache, runtime image cache. |
| Local store | **IndexedDB** (via `idb`) | Program + full log + sync outbox. Source of truth at runtime. |
| Validation | **Zod** | Validates dropped JSON; infers TS types. |
| State | **Zustand** (or React context) | App state is small. |
| Auth | **Cloudflare Access** (Zero Trust) | Google login, locked to one Gmail. No app auth code. |
| Hosting | **Cloudflare Pages** | Static SPA, auto-deploy from GitHub. |
| API | **Cloudflare Pages Functions** | `GET/POST /api/logs`. Same domain, covered by Access. |
| Durable store | **Cloudflare D1** (SQLite) | Cloud backup of the activity log. **In v1.** |

Target device: **iPhone / iOS Safari** (designed as the constrained baseline).

---

## 3. Authentication — Cloudflare Access

- Access application over `mygym.lsampaio.dev` → IdP **Google** → policy **`email == <my-gmail>`**.
- Gates **all** requests (pages + `/api/*`) at the edge. Unauthorized users never reach the app.
- App assumes "if it's running, it's me" — **no login UI to build**.
- API Functions verify the `Cf-Access-Jwt-Assertion` header (validate against Access public keys; check audience + email) as defense-in-depth so the endpoints can't be hit directly, bypassing Access.
- **Session duration set long (≈1 month)** so the PWA rarely re-prompts. Offline use never touches Access (served from cache); only cloud sync does.

---

## 4. Data model

Two separate stores (decided in requirements).

### Program (from uploaded JSON)
Versioned, replaceable, validated on drop, stored in IndexedDB, read fully offline. Shape per `REQUIREMENTS.md` §7 (`athleticPrep`, `coreFinisher` with rotating slot 3, `workouts.A/B/C`, items containing `movements[]`, conditioning `alternates[]`).

### Activity log (append-mostly, UUID per entry)
```ts
type LogEntry =
  | { id: string; kind: 'gym'; date: string;          // ISO date
      session: 'A' | 'B' | 'C';
      completion: 'complete' | 't1';
      rating: 1 | 2 | 3;
      cType?: 'RSA' | 'VO2max';                         // for C → drives next rotation
      slot3: 'copenhagen' | 'side' | 'suitcase';        // every gym session → advances rotation
      legAppend?: boolean;                              // C augmented w/ Squat+RDL (2-futsal rule)
      updatedAt: string }
  | { id: string; kind: 'match'; date: string;
      sport: 'football' | 'training' | 'futsal';   // 'training' = played, no match → goals always 0
      goals: number;
      rating: 1 | 2 | 3;
      updatedAt: string };
```
Rotation needs no separate state: each gym entry records the C-variant and slot-3 actually done → next = `rotate(lastEntry)`.

---

## 5. The brain — recommendation engine

Pure module `engine/recommend.ts`:
```
recommend(program, log, today, schedule?) → { nextSession, reason, warnings[], cTypeNext, slot3Next }
```

**Backbone** (A every cycle, 2 slots/cycle → sessions alternate A → (B|C) → A …):
- Last gym = A → next is the B-or-C slot: **futsal week → C, else B** (manual C override allowed for "feeling heavy / fat-loss").
- Last gym = B or C → next is **A**.

**Guard-rails** (each a predicate over the log):
- **Never B within 48h of a match** → defer B, suggest A/C.
- **Never two hard leg-loads back-to-back** (B, a match and football training all load legs).
- **Two futsal weeks without leg loading** → flag C to append **Squat 2×5 + RDL 2×8**; surface ⚠️ on hero.

**Optional `schedule` config** (typical week: Mon = football, Thu = futsal) powers *forward-looking* rules (the 48h rule), beyond just logged past matches.

All stats are likewise pure functions over the (tiny) log — computed client-side, memoized. No server aggregation.

---

## 6. Offline & sync (iOS-aware)

Layers, each degrading gracefully:
1. **App shell + assets** → precached by SW. Fully offline after first load.
2. **Program JSON + thumbnails** → JSON in IndexedDB; thumbnail images runtime-cached (CacheFirst) on first online view → exercise list renders offline.
3. **YouTube videos** → not cacheable; need signal. Acceptable (pre-watch at home).
4. **Logging** → written to IndexedDB immediately (offline-safe) + queued in a sync **outbox**.

**Sync = write-behind backup, not bidirectional sync** (one user, one device):
- On app foreground + `online` event → push outbox entries to `/api/logs` (**upsert by UUID — idempotent**).
- On fresh install → one-time **pull** all entries to hydrate IndexedDB.
- Edits/fixes → last-write-wins by `updatedAt`. Effectively never conflicts.

**iOS specifics:**
- Safari has **no Background Sync** → sync on app-open + `online` event (not background).
- Call **`navigator.storage.persist()`** to reduce eviction risk of local data.
- **Manual "Add to Home Screen"** (no install prompt) → in-app hint for first run.
- Standalone display + status-bar meta tags in the manifest/head.

---

## 7. Hosting & deploy

- **Cloudflare Pages** — static SPA, auto-build from GitHub `main` (Vite build).
- **Pages Functions** — `/api/logs` (Workers runtime), same project/domain.
- **D1** — bound to the Pages project; one `logs` table.
- **Access** — configured in Zero Trust dashboard (Google IdP + single-email policy).
- **Custom domain** `mygym.lsampaio.dev` → Pages (assumes `lsampaio.dev` zone is on Cloudflare DNS — dependency to confirm).
- **Local dev** — `vite dev` for UI; `wrangler pages dev` for Functions + local D1 (SQLite).

---

## 8. Client module layout

```
src/
  program/   schema (zod), drag-drop loader (parse+validate+store), store
  log/       repository (IndexedDB CRUD + outbox), types
  engine/    recommend.ts (brain), rotation.ts, stats.ts  — all pure, unit-tested
  sync/      outbox pusher + initial pull (D1)
  ui/        Hero, CycleStrip, ConsistencyChips, GymTile, FootballTile,
             WorkoutView, VideoModal, LogSheet, JsonDropZone, InstallHint
  pwa/       SW registration, persistent-storage request, install hint
functions/
  api/logs.ts   GET (pull) / POST (upsert) — verifies Access JWT
```

---

## 9. Build phases

1. **Schema + engine (pure, no UI)** — Zod schema; convert `trainning.md` → JSON; write + unit-test recommend/rotation/stats. *Hard logic first, fully tested.*
2. **UI shell** — single page: hero, workout view + video modal, finish/log sheets, JSON drop zone, stat tiles.
3. **PWA + offline** — SW, manifest, IndexedDB persistence, add-to-home-screen, `persist()`.
4. **Deploy** — Pages + custom domain + Access policy.
5. **D1 backup** — `logs` table, `/api/logs` endpoints, outbox sync, initial pull.

---

## 10. Open technical details to confirm

- **DNS**: is `lsampaio.dev` already on Cloudflare? (Needed for Pages custom domain + Access.)
- **"Week" definition** for the futsal-week rule: ISO week (Mon–Sun) vs rolling 7 days. Proposed: **ISO week**.
- **`schedule` config**: include the typical-week template (Mon football / Thu futsal) in v1 for forward-looking rules? Proposed: **yes**.
