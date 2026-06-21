/** Thrown when the API can't be reached or Access redirected us to a login page. */
export class SyncUnavailable extends Error {
}
async function asJson(res) {
    // An Access login redirect yields HTML, not JSON — treat as "need re-auth, defer".
    const ct = res.headers.get('content-type') ?? '';
    if (res.redirected || !res.ok || !ct.includes('application/json')) {
        throw new SyncUnavailable(`sync unavailable (${res.status})`);
    }
    return res.json();
}
export async function pullLogs() {
    const res = await fetch('/api/logs', { headers: { accept: 'application/json' } });
    const data = await asJson(res);
    return (data.entries ?? []);
}
export async function pushLogs(upserts, deletes) {
    const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ upserts, deletes }),
    });
    await asJson(res);
}
