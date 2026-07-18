// Minimal client-side JWT payload reader — just enough to know when the access
// token is about to expire so we can refresh it PROACTIVELY (before a request 401s)
// instead of paying a 401 -> /auth/refresh -> retry round-trip chain on the first
// authenticated read after the app reopens. Not a verifier: the server still fully
// verifies every token; this only reads the unverified `exp` claim for scheduling.

/** Epoch-ms of the token's `exp` claim, or null if it can't be read. */
export function getJwtExpiryMs(token: string | undefined | null): number | null {
  if (!token) return null;
  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) return null;
  try {
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(base64)) as { exp?: unknown };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** True iff the token exists and won't expire within `skewMs` (default 30s of headroom). */
export function isAccessTokenFresh(token: string | undefined | null, skewMs = 30_000): boolean {
  const expiryMs = getJwtExpiryMs(token);
  if (expiryMs === null) return false;
  return expiryMs - Date.now() > skewMs;
}
