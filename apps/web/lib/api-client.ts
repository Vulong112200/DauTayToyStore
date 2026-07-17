import type { AuthResponse } from '@repo/contracts';
import { useAuthStore } from '@/store/auth-store';
import { env } from './env';
import { getQueryClient } from './query-client';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body' | 'cache'> {
  body?: unknown;
  auth?: boolean;
  /** Seconds to cache the response for (Next.js ISR-style revalidation). Omit for no caching. */
  revalidateSeconds?: number;
}

function extractMessage(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message: unknown }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return 'Đã xảy ra lỗi, vui lòng thử lại';
}

// Single-flight access-token refresh. The 15-minute access token expires with no
// proactive refresh, so authenticated reads (wishlist, orders, profile) would
// 401 and render empty — unlike the cart, which falls back to an x-cart-session
// identity. When several queries 401 at once we want ONE /auth/refresh call; the
// rest await the same promise, then retry with the new token.
let refreshPromise: Promise<boolean> | null = null;

async function runRefresh(): Promise<boolean> {
  const refreshToken = useAuthStore.getState().tokens?.refreshToken;
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${env.apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    });
    if (!response.ok) {
      // Only a definitive auth rejection (invalid/revoked/expired refresh token)
      // should destroy the session. A transient non-2xx — e.g. the free-tier API
      // cold-starting and briefly returning 502/503 — must NOT log the user out,
      // or an admin mid-edit gets silently redirected to /login and loses unsaved
      // work. Leave the session intact and return false; the original request
      // surfaces its own error and can simply be retried once the API is awake.
      if (response.status === 401 || response.status === 403) {
        useAuthStore.getState().clearSession();
        // Drop the signed-out user's cached per-user data (wishlist, orders,
        // profile) so it can't linger on screen after a reactive logout — the
        // explicit logout in profile-view already does this; this path didn't.
        getQueryClient()?.clear();
      }
      return false;
    }
    const data = (await response.json()) as AuthResponse;
    useAuthStore.getState().setSession(data.user, data.tokens);
    return true;
  } catch {
    return false;
  }
}

function refreshAccessToken(): Promise<boolean> {
  refreshPromise ??= runRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function apiFetch<TResponse>(
  path: string,
  options: RequestOptions = {},
  retrying = false,
): Promise<TResponse> {
  const { body, auth = false, headers, revalidateSeconds, ...init } = options;
  const accessToken = auth ? useAuthStore.getState().tokens?.accessToken : undefined;

  const response = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    method: init.method ?? (body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...(revalidateSeconds !== undefined
      ? { next: { revalidate: revalidateSeconds } }
      : { cache: 'no-store' as const }),
  });

  // Expired access token on an authenticated request → refresh once and retry,
  // so the response reflects the logged-in user instead of falling through as
  // an empty/401 (the wishlist-goes-empty bug).
  if (
    response.status === 401 &&
    auth &&
    !retrying &&
    useAuthStore.getState().tokens?.refreshToken
  ) {
    if (await refreshAccessToken()) {
      return apiFetch<TResponse>(path, options, true);
    }
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(payload));
  }

  return payload as TResponse;
}

/** Separate from apiFetch because multipart/form-data needs the browser to set its own
 * Content-Type (with the multipart boundary) — apiFetch always forces application/json. */
export async function apiUpload<TResponse>(
  path: string,
  formData: FormData,
  retrying = false,
): Promise<TResponse> {
  const accessToken = useAuthStore.getState().tokens?.accessToken;

  const response = await fetch(`${env.apiUrl}${path}`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: formData,
    cache: 'no-store',
  });

  if (
    response.status === 401 &&
    !retrying &&
    useAuthStore.getState().tokens?.refreshToken
  ) {
    if (await refreshAccessToken()) {
      return apiUpload<TResponse>(path, formData, true);
    }
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, extractMessage(payload));
  }

  return payload as TResponse;
}
