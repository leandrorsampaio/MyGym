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
1. **Athletic Prep** (warm-up / activation)
2. **Main Work** (the A / B / C session)
3. **Core Finisher** — a **shared block that always ends every session**, regardless of A/B/C.

So the workouts are: **A, B, C** (the main work) **+ Core Finisher** (the common ending appended to all of them).

Each gym session = **2 gym slots per cycle** → **Session A + (B or C)**. A is done every cycle.

---

## 6. Interface / UI

- **Mobile-only** — always used on my cellphone. Design mobile-first; no need to optimize for desktop.
- **Simple and clean** — fast to scan and tap.

### Exercise list item
Each exercise in the list shows:
- **Name**
- **Repetitions** (e.g., sets × reps)
- **Resting time** (rest between sets)
- **Image thumbnail**
- **YouTube video link** — videos are always **YouTube Shorts**.

### Video behavior
- Tapping the video opens it in a **modal** (in-app player).
- Also provide an **"Open in YouTube"** option to open the video in the YouTube app/site instead of the modal.

---

## 7. Training Data (JSON-driven)

The training program changes from time to time. Rather than hard-coding exercises, the app reads the program from a **JSON file** that I can **upload/replace** to update everything.

- **Source of truth = JSON.** Uploading a new JSON instantly updates the displayed program (exercises, reps, rest, images, videos, tiers).
- The JSON defines: workouts **A / B / C**, the shared **Core Finisher**, and the **Athletic Prep**, plus each exercise's details.
- **Activity logs (gym + matches) are NOT in this JSON** — logs are separate data that persists across program changes.

### Proposed JSON shape (draft — to refine)
```jsonc
{
  "version": "2026-06-20",          // identifies the program version
  "athleticPrep": {                  // shared warm-up
    "exercises": [ /* … */ ]
  },
  "coreFinisher": {                  // shared ending, appended to every session
    "exercises": [ /* … */ ]
  },
  "workouts": {
    "A": {
      "name": "Session A",
      "exercises": [
        {
          "name": "Back Squat",
          "tier": "T1",              // T1 or T2
          "reps": "4×5",             // sets × reps (free text)
          "rest": "2–3 min",
          "thumbnail": "https://…/squat.jpg",
          "video": "https://youtube.com/shorts/…",
          "notes": "Ramp warm-up sets first. ~2–3 reps in reserve."
        }
      ]
    },
    "B": { "name": "Session B", "exercises": [ /* … */ ] },
    "C": { "name": "Session C", "exercises": [ /* … */ ] }
  }
}
```

> Open: should Athletic Prep / Core Finisher exercises also have T1/T2 tiers, or are they always done in full?

---

## 8. Training Cycle Logic (which workout to do)

The app should help decide **which session to do next** based on the cycle and football/futsal activity.

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
3. Workout is logged (with date/time).

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

## 12. Open Questions

- What exact statistics do you want on the homepage?
- Should exercises track details (sets, reps, weight logged per session), or just a checklist?
- Do you want to check off individual exercises during a session, or just mark the whole workout done at the end?
- Should there be a full activity history / log view (gym + matches)?
- What are the actual exercises in workouts A, B, C (and their T1/T2 tiers, prep, and core finisher)?
- Any need to edit/manage exercises in-app, or are they fixed in config?
- Offline support needed (e.g., gym with bad signal)?
- How "smart" should the cycle suggestion be — just show rules/warnings, or actively recommend the next session?
- Where should the loading guidelines live — a dedicated page, per-exercise notes, or both?

---

## 13. Additional Requirements

_(Space for new requirements as you add them.)_
