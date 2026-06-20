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

---

## 6. User Flows

### 6.1 Start a workout
1. From homepage, select workout **A**, **B**, or **C**.
2. App shows the exercise list (T1 and T2 clearly separated/labeled).

### 6.2 Finish a workout
1. Tap **"I finished the training"**.
2. Choose completion type:
   - **Complete** (T1 + T2), or
   - **T1 only**.
3. Workout is logged (with date/time).

### 6.3 Homepage statistics
- Show progress / statistics.
- _(Specific stats to be defined — see Open Questions.)_

---

## 7. Statistics (to be detailed)

Possible metrics (TBD):
- Total workouts completed.
- Breakdown by workout (A / B / C).
- Complete vs. T1-only counts.
- Streaks / frequency (workouts per week).
- Last workout date.

---

## 8. Open Questions

- What exact statistics do you want on the homepage?
- Should exercises track details (sets, reps, weight), or just a checklist?
- Do you want to check off individual exercises during a session, or just mark the whole workout done at the end?
- Should there be a workout history / log view?
- What are the actual exercises in workouts A, B, C (and their T1/T2 tiers)?
- Any need to edit/manage exercises in-app, or are they fixed in config?
- Offline support needed (e.g., gym with bad signal)?

---

## 9. Additional Requirements

_(Space for new requirements as you add them.)_
