'use client';

import * as React from 'react';
import { ensureFreshAccessToken } from '@/lib/api-client';
import { isAccessTokenFresh } from '@/lib/jwt';
import { useAuthStore } from '@/store/auth-store';
import { useAuthHydrated } from './use-auth-hydrated';

/**
 * Gates authenticated queries until it's safe to fire them, i.e.:
 *  (a) the persisted Zustand session has hydrated from localStorage, AND
 *  (b) if the stored access token is already expired, one proactive /auth/refresh
 *      has completed.
 *
 * Without this, the first authenticated read after the app reopens pays a
 * `401 -> /auth/refresh -> retry` chain — a 3-hop waterfall that's especially costly
 * when the API's DB is cross-region. Refreshing up front means that first read carries
 * a valid token and returns in a single hop. Guests and users with a still-fresh token
 * become ready immediately (nothing to wait for).
 */
export function useAuthReady(): boolean {
  const hydrated = useAuthHydrated();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated) return;
    const tokens = useAuthStore.getState().tokens;
    if (!tokens?.refreshToken || isAccessTokenFresh(tokens.accessToken)) {
      setReady(true);
      return;
    }
    let active = true;
    ensureFreshAccessToken().finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [hydrated]);

  return ready;
}
