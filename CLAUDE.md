# CLAUDE.md

**Read [`AGENTS.md`](./AGENTS.md) first** — it is the single entry point with full project context
(overview, architecture, repo map, commands, invariants, gotchas, and recipes). It links to the
other docs (`REQUIREMENTS.md`, `ARCHITECTURE.md`, `DEPLOY.md`, `trainning.md`) as needed.

Quick facts:
- Personal single-user gym + football PWA (iPhone only), offline-first, deploys to Cloudflare.
- `npm run dev` to work on the UI · `npm test` before/after changes · `npm run build` to verify.
- Core idea: `UI = f(program, activityLog, today)`. Engine is pure & clock-free. Program is
  JSON-driven (`src/data/program.json`). Rotation is derived from the log, not stored.
- This repo commits with the personal GitHub account (`leandro.r.sampaio@gmail.com`).
