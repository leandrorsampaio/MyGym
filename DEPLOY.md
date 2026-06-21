# MyGym — Deployment (Cloudflare)

Everything in the app is built and locally verified. These are the steps to put it
live at `mygym.lsampaio.dev` with Google login locked to your account and a D1 cloud
backup. You run these (they need your Cloudflare account); I can't do them for you.

> Prerequisite (open question to confirm): the `lsampaio.dev` zone must be on
> **Cloudflare DNS**. Pages custom domains and Access both require it.

---

## 1. One-time: log in

```bash
npx wrangler login        # opens browser; authorize Wrangler
```

## 2. Create the D1 database

```bash
npx wrangler d1 create mygym
```

Copy the printed `database_id` into **wrangler.toml** (replace `REPLACE_AFTER_CREATE`).

Apply the schema:

```bash
npm run db:migrate        # wrangler d1 migrations apply mygym --remote
```

## 3. Create the Pages project & deploy

Either connect the GitHub repo in the Cloudflare dashboard (Pages → Create →
Connect to Git) with:
- **Build command:** `npm run build`
- **Output directory:** `dist`

…or deploy directly from your machine:

```bash
npm run build
npx wrangler pages deploy dist --project-name mygym
```

In **Pages → Settings → Functions → D1 bindings**, bind variable `DB` → database `mygym`
(matches `wrangler.toml`).

## 4. Custom domain

Pages → your project → **Custom domains** → add `mygym.lsampaio.dev`.
(Cloudflare creates the CNAME automatically since the zone is on Cloudflare.)

## 5. Lock it down with Cloudflare Access (Google, your email only)

Zero Trust dashboard → **Access → Applications → Add → Self-hosted**:
- **Application domain:** `mygym.lsampaio.dev`
- **Identity provider:** Google (add Google as an IdP under Settings → Authentication if not already)
- **Policy:** Action *Allow*, Include → *Emails* → `leandro.r.sampaio@gmail.com`
- **Session duration:** 1 month (so the PWA rarely re-prompts)

After creating it, open the application's **Overview** to find the **Application Audience (AUD) tag**.

## 6. Turn on API JWT verification (defense-in-depth)

Set these as Pages environment variables (Pages → Settings → Environment variables,
Production). They make the `/api/logs` endpoint reject anything not coming through Access:

| Variable | Value |
|---|---|
| `ALLOWED_EMAIL` | `leandro.r.sampaio@gmail.com` |
| `ACCESS_TEAM_DOMAIN` | `<your-team>.cloudflareaccess.com` |
| `ACCESS_AUD` | the AUD tag from step 5 |

Redeploy (or it picks up on next deploy). Until these are set, the API still works but
relies only on Access at the edge.

---

## 7. Install on your iPhone

Open `https://mygym.lsampaio.dev` in Safari → sign in with Google → **Share → Add to
Home Screen**. That unlocks offline use and persistent storage. Logs you record offline
queue locally (the header shows "☁ N unsynced") and back up to D1 when you're back online.

---

## Local development with the backend

```bash
npm run db:migrate:local                 # set up the local D1 once
npm run build && npm run pages:dev        # serve dist + Functions + local D1
```

`npm run dev` (plain Vite) runs the UI only — the `/api/logs` calls fail gracefully and
everything stays in IndexedDB, which is fine for UI work.
