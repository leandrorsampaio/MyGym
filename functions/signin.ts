/// <reference types="@cloudflare/workers-types" />

/**
 * GET /signin → bounce back to the app.
 *
 * Cloudflare Access gates this path like everything else, so simply *navigating* here
 * forces the login flow when the session has lapsed and returns with a fresh
 * CF_Authorization cookie. A `fetch()` can't do that — an interactive OAuth redirect
 * needs a real navigation — which is why re-auth needs a dedicated URL.
 *
 * `navigateFallbackDenylist` in vite.config.ts keeps the service worker from serving
 * this from the precache; without that the SW answers locally and Access never sees it.
 */
export const onRequestGet: PagesFunction = async () =>
  new Response(null, { status: 302, headers: { location: '/' } });
