# MyGym — Requirements

A simple personal app to help track gym workouts.

> Status: **Draft** — collecting requirements. We'll brainstorm the build after this is complete.

---

## 1. Overview

A lightweight, single-user web app to:
- Pick a workout (A, B, or C)
- View the exercise list for that workout
- Mark a workout as finished (full or T1-only)
- See progress statistics on the homepage

---

## 2. Goals & Context

- **Personal use only** — single user (just me).
- **Simple interface** — fast to use, especially on busy days.
- Lightweight enough to run on **Cloudflare free tier**.

---

## 3. Hosting & Infrastructure

| Item | Detail |
|------|--------|
| Hosting | Cloudflare (free tier) |
| Domain | `mygym.lsampaio.dev` (subdomain of existing domain) |
| Auth | Google / Gmail login (Sign in with Google) |
| Access | Restricted to my own Gmail account only |

---

## 4. Authentication

- Login via **Google (Gmail) account**.
- Only **my specific account** is authorized — all other logins rejected.
- Auth is for security; no multi-user / no public sign-up.

---

## 5. Core Concepts

### Workouts
- Three workouts: **A**, **B**, **C**.
- Each workout has a list of **exercises**.

### Exercise Tiers
- Each exercise belongs to a tier:
  - **T1** — essential exercises (the "fast / busy day" subset).
  - **T2** — additional exercises (done on a full session).
- A **full workout** = T1 + T2 exercises.
- A **T1-only workout** = just the T1 exercises (quick version for busy days).

### Sports Activity (Football / Futsal)
- Football/futsal sessions are **part of the same activity log** as gym workouts — they count as training load.
- Two types:
  - **Football** (normal / field) — typically **Monday**.
  - **Futsal** — typically **Thursday**.
- Frequency: **1–2 times per week**.
- Each logged sport session records:
  - **Type**: Football or Futsal.
  - **Date** (defaults to today; can pick another day via calendar).
  - **Goals scored** (number).
  - **Performance rating**: **1, 2, or 3 stars**.

### Gym Workout Structure
Every gym session follows a fixed structure:
1. **Athletic Prep** (warm-up / activation) — **has its own T1/T2 tiers**; balance + step-downs can also be done before matches.
2. **Main Work** (the A / B / C session)
3. **Core Finisher** — a **shared block that always ends every session**. It is **T1 and is NEVER cut** (~7 min).

So the workouts are: **A, B, C** (the main work) **+ Core Finisher** (the common ending appended to all of them), each preceded by **Athletic Prep**.

Each gym session = **2 gym slots per cycle** → **Session A + (B or C)**. A is done every cycle.

### Session types differ in shape
- **Session A** — Upper + Pull Balance (strength: exercises with sets × reps, rest, videos).
- **Session B** — Lower + Power (strength: same shape as A).
- **Session C** — **Conditioning, NOT weightlifting.** Spinner/rower intervals. It has a warm-up → main intervals → cooldown, and the **main interval alternates between two week-types each C session**:
  - **RSA (spinner):** 15s hard / 45s easy × 8–10.
  - **VO₂max (rower/spinner):** 4 min hard / 3 min easy × 4.
  - The two types **alternate** and are never both done in the same week → the app may need to track *which C-type is next*.

### Core Finisher detail
- 3-slot template (~7 min), T1, never cut:
  - **Slot 1 — Anti-rotation** (Pallof Press).
  - **Slot 2 — Anti-extension** (Dead Bug *or* Front Plank).
  - **Slot 3 — Lateral / adductor — ROTATES session to session** (Copenhagen Plank / Side Plank / Suitcase Carry). Some slot-3 options have **no video yet**.

---

## 6. Interface / UI

- **Mobile-only** — always used on my cellphone. Design mobile-first; no need to optimize for desktop.
- **Simple and clean** — fast to scan and tap.
- **Single-page, no subpages.** Everything at a glance — recommendation, workout, stats all in one clean layout (modals/expanders are fine; separate routed pages are not).
- **Offline-capable (PWA).** Must work at the gym with no/bad signal: install to home screen, cache the program + assets, and **queue logs locally**, syncing when back online. (I'll always load the site with signal beforehand.)

### Exercise list item
Each exercise in the list shows:
- **Name** + **tier badge** (T1 / T2).
- **Repetitions** — free-text, varied formats: `4 × 5–6`, `2 × 30s/leg`, `3 × 8/leg`, `15s hard / 45s easy × 8–10`.
- **Resting time** (rest between sets) — may be absent for some items (e.g. conditioning).
- **Image thumbnail** (optional).
- **Coaching note / cue** — short tip per exercise (the trainer's `>` notes).
- **YouTube video link** — *optional* (some items have no video yet). **Mostly Shorts, but a few are regular `watch?v=` links** → player must handle both.
- **Supersets / multi-movement items** — some items group **two movements with two videos** (e.g. "Arms superset" = DB Curl + Triceps Pushdown; "Trunk primer" = Dead Bug + Pallof). A list item may contain **more than one movement/video**.

### Video behavior
- Tapping a video opens it in a **modal** (in-app player) — supports both Shorts and `watch?v=` URLs.
- Also provide an **"Open in YouTube"** option to open the video in the YouTube app/site instead of the modal.

---

## 7. Training Data (JSON-driven)

The training program changes from time to time. Rather than hard-coding exercises, the app reads the program from a **JSON file** that I can **upload/replace** to update everything.

- **Source of truth = JSON.** Loading a new JSON instantly updates the displayed program (exercises, reps, rest, images, videos, tiers).
- **Upload by drag & drop** — drop the JSON file onto a spot in the app to replace the program. Stored locally (works offline thereafter).
- The JSON defines: workouts **A / B / C**, the shared **Core Finisher**, and the **Athletic Prep**, plus each exercise's details.
- **Thumbnails are supplied by me** as image URLs in the JSON (not auto-derived).
- **Video is optional** — if an item has no video, simply show no video (no placeholder/block).
- **Activity logs (gym + matches) are NOT in this JSON** — logs are separate data that persists across program changes.

### Proposed JSON shape (draft — to refine)
```jsonc
{
  "version": "v6",                    // program version (e.g. matches trainning.md v6)
  "athleticPrep": {
    "title": "Athletic Prep",
    "items": [ /* tiered items, same shape as workout items */ ]
  },
  "coreFinisher": {
    "title": "Core Finisher",
    "tier": "T1",                     // never cut
    "slots": [                         // 3-slot template; slot 3 rotates
      { "slot": 1, "label": "Anti-rotation", "movements": [ /* … */ ] },
      { "slot": 2, "label": "Anti-extension", "movements": [ /* … */ ] },
      { "slot": 3, "label": "Lateral / adductor", "rotates": true, "movements": [ /* options */ ] }
    ]
  },
  "workouts": {
    "A": {
      "name": "Session A — Upper + Pull Balance",
      "type": "strength",
      "items": [
        {
          "tier": "T1",
          "reps": "4 × 5–6",
          "rest": "2–3 min",
          "thumbnail": "https://…/bench.jpg",
          "note": "Shoulder blades back and down, control the descent.",
          "movements": [               // usually 1; supersets have 2+
            { "name": "Barbell Bench Press", "video": "https://youtube.com/shorts/_FkbD0FhgVE" }
          ]
        }
      ]
    },
    "B": { "name": "Session B — Lower + Power", "type": "strength", "items": [ /* … */ ] },
    "C": {
      "name": "Session C — Conditioning",
      "type": "conditioning",
      "alternates": [                  // app tracks which is next
        { "key": "RSA",    "main": "15s hard / 45s easy × 8–10" },
        { "key": "VO2max", "main": "4 min hard / 3 min easy × 4" }
      ],
      "items": [ /* warm-up, cooldown, etc. */ ]
    }
  }
}
```

Key shape decisions baked in: **items contain `movements[]`** (handles supersets / multi-video), **prep & finisher are tiered**, **Session C is `type: conditioning` with alternating week-types**, video is **optional**.

---

## 8. Training Cycle Logic (which workout to do)

**The app is a smart coach: it AUTOMATICALLY recommends the next session**, computed from the cycle + logged football/futsal activity + past gym sessions. The recommendation is the headline of the homepage; I can still override and pick manually.

The app also **tracks rotation state automatically**:
- Which **Session C interval-type** is next (RSA ↔ VO₂max alternation).
- Which **Core Finisher slot-3** movement is next (Copenhagen → Side Plank → Suitcase rotation).

### Cycle basics
- **7–10 day cycle.**
- 2 gym slots per cycle: **Session A + (B or C)**. **A is done every cycle.**

### Choosing B vs C
- **Futsal week** → do **C** (matches already cover legs).
- **No futsal week** → do **B** (or **C** if feeling heavy / pushing fat loss).

### Hard rules
- Every gym session = **Athletic Prep → Main Work → Core Finisher**.
- **Never do B within 48h of a match.**
- **Never stack two hard leg loads back-to-back.**
- **Don't let two futsal weeks in a row pass without loading legs.** If it happens, append to a C session:
  - **Squat 2×5 + RDL 2×8.**

> The app should surface these rules/warnings when relevant (e.g., warn if selecting B within 48h of a logged match, or suggest the leg-loading append after two futsal weeks with no leg load).

---

## 9. User Flows

### 9.1 Start a gym workout
1. From homepage, select workout **A**, **B**, or **C** (app may **suggest** which based on cycle logic).
2. App shows the exercise list (T1 and T2 clearly separated/labeled).

### 9.2 Finish a gym workout
1. Tap **"I finished the training"**.
2. Choose completion type:
   - **Complete** (T1 + T2), or
   - **T1 only**.
3. Rate the session **1–3 stars** (same as football performance rating).
4. Workout is logged (with date/time, type, completion, rating).

> Logging is **whole-workout only** — no per-exercise checkboxes, no weight logging (keep it simple).

### 9.3 Log a football / futsal session
1. Tap **"I played"** (or check the day).
2. Select **Football** or **Futsal**.
3. **Date** defaults to today; if it wasn't today, open a **calendar** to pick the day.
4. Enter **goals scored**.
5. Rate **performance (1–3 stars)**.
6. Session is logged into the activity history.

### 9.4 Homepage statistics
- Show progress / statistics.
- _(Specific stats to be defined — see Open Questions.)_

---

## 10. Statistics (to be detailed)

Possible metrics (TBD):

**Gym**
- Total workouts completed.
- Breakdown by workout (A / B / C).
- Complete vs. T1-only counts.
- Streaks / frequency (workouts per week).
- Last workout date.

**Football / Futsal**
- Matches played (football vs. futsal breakdown).
- Total goals / goals per match.
- Average performance (stars).
- Matches per week.

**Combined**
- Activity calendar / timeline (gym + matches together).
- Current cycle status (what's done, what's next).

---

## 11. Reference — Loading & Intensity Guidelines

_(Coaching rules from my trainer — for display/reference in-app, e.g., per-exercise notes or a guidelines page.)_

- **Warm up the heavy lifts** — doesn't count toward working sets. Empty bar, then progressively heavier ramp sets. **Non-negotiable for the squat.**
- **Straight sets** — same weight across all working sets. ("Bench 4×5–6" = one load for ~5–6 reps, four times, with a little left on the last set.)
- **Leave reps in the tank** — NOT to failure on big lifts. Stop bench / squat / RDL with **~2–3 good reps still possible**.
- **Where you CAN push**: last set of isolation work (curls, triceps, leg curl, calf). Accessories: **1–2 reps in reserve**.
- **Starting weight**: week 1 is calibration — **err light**.
- **Double progression**: top of the rep range on all sets, good form, reps in reserve → add **~2.5kg upper / 2.5–5kg lower**.
- **Fat-loss phase**: lifting protects muscle, not records. **Holding numbers steady is a WIN.**

---

## 12. Decisions Log

| # | Decision |
|---|----------|
| 1 | **Smart coach.** App auto-recommends the next session from cycle + football/futsal logs. Manual override allowed. |
| 2 | **Simple logging.** Whole-workout only (Complete vs T1-only) + **1–3 star rating**. No per-exercise checkboxes, no weights. |
| 3 | **App tracks rotations** automatically (Session C type, Core slot-3). |
| 4 | **Homepage stats only**, no history view — but **keep it extensible** to add more later. |
| 5 | **Homepage stats — still to brainstorm** (see Section 13). |
| 6 | **Drag & drop** JSON upload; stored locally. |
| 7 | **Thumbnails supplied by me** (image URLs in JSON). |
| 8 | **No video → show nothing** (no placeholder). |
| 9 | **Offline-first PWA.** Works at gym with no signal; logs queue locally and sync later. |
| 10 | **Single-page, clean, all at a glance.** No subpages; modals/expanders OK. |

---

## 13. Homepage Layout & Statistics

Single screen, top to bottom. Designed to stay **extensible** (add tiles later without redesign).

### 13.1 Hero card — "What do I do today?" (self-contained)
The headline of the app. Shows the **auto-recommended next session** + the cycle state inline:

```
┌──────────────────────────┐
│ NEXT: Session B          │
│ Lower + Power  [START]   │
│ ──────────────────────── │
│ Cycle: A✓ · B/C ○        │
│ C-type next: RSA         │
│ Core slot-3: Copenhagen  │
└──────────────────────────┘
```
- Recommended session (with reason, e.g. *"no futsal this week"*) + **Start** button.
- **Cycle progress** (what's done this cycle, what's next).
- **Rotation state**: next Session-C interval-type (RSA ↔ VO₂max), next Core slot-3 (Copenhagen → Side Plank → Suitcase).
- **Rule warnings** surfaced here when active (e.g. ⚠️ *"2 futsal weeks, legs not loaded → C adds Squat 2×5 + RDL 2×8"*).
- Manual override: I can still pick A/B/C myself.

### 13.2 Consistency strip
Compact chips: **sessions this week**, **streak (weeks)**, **sessions-per-week average**.

### 13.3 Summary tiles (side by side, expandable zone)
- **Gym tile** — total sessions, A/B/C counts, complete vs T1-only ratio, average session ⭐.
- **Football tile** — matches played (football vs futsal), goals (total + per match), average ⭐.

> All four stat groups confirmed as wanted: **consistency, football performance, gym breakdown, cycle status**. The tiles area is the natural place to add more later.

---

## 14. Additional Requirements

_(Space for new requirements as you add them.)_
