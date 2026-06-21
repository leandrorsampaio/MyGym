/**
 * Cloudflare Access verification (defense-in-depth). Access already gates requests
 * at the edge; this confirms the request really came through Access and is *your*
 * identity, so the API can't be hit directly bypassing Access.
 *
 * If ACCESS_TEAM_DOMAIN / ACCESS_AUD are not configured, JWT verification is skipped
 * (we still enforce ALLOWED_EMAIL when an email is available).
 */

export interface AccessEnv {
  ALLOWED_EMAIL?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
}

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
}

let certsCache: { domain: string; keys: Jwk[]; fetchedAt: number } | null = null;
const CERTS_TTL_MS = 60 * 60 * 1000; // 1 hour

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJson(seg: string): any {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(seg)));
}

async function getCerts(domain: string): Promise<Jwk[]> {
  if (certsCache && certsCache.domain === domain && Date.now() - certsCache.fetchedAt < CERTS_TTL_MS) {
    return certsCache.keys;
  }
  const res = await fetch(`https://${domain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error('certs fetch failed');
  const json = (await res.json()) as { keys: Jwk[] };
  certsCache = { domain, keys: json.keys, fetchedAt: Date.now() };
  return json.keys;
}

async function verifyJwt(token: string, domain: string, aud: string): Promise<string | null> {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  const header = decodeJson(h);
  const payload = decodeJson(p);

  if (payload.aud && !(Array.isArray(payload.aud) ? payload.aud : [payload.aud]).includes(aud)) return null;
  if (payload.exp && Date.now() / 1000 > payload.exp) return null;

  const jwk = (await getCerts(domain)).find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(s) as BufferSource,
    new TextEncoder().encode(`${h}.${p}`) as BufferSource,
  );
  if (!ok) return null;
  return typeof payload.email === 'string' ? payload.email : null;
}

/** Returns null if authorized, or a Response to return (401/403) if not. */
export async function checkAccess(request: Request, env: AccessEnv): Promise<Response | null> {
  const allowed = env.ALLOWED_EMAIL?.trim().toLowerCase();
  let email: string | null =
    request.headers.get('Cf-Access-Authenticated-User-Email')?.toLowerCase() ?? null;

  // Verify the JWT when configured.
  if (env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD) {
    const token =
      request.headers.get('Cf-Access-Jwt-Assertion') ??
      request.headers.get('cf-access-jwt-assertion');
    if (!token) return json({ error: 'no access token' }, 401);
    const verifiedEmail = await verifyJwt(token, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD).catch(() => null);
    if (!verifiedEmail) return json({ error: 'invalid access token' }, 401);
    email = verifiedEmail.toLowerCase();
  }

  if (allowed && email && email !== allowed) return json({ error: 'forbidden' }, 403);
  return null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
