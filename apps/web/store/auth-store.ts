import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthTokens, UserProfile } from '@repo/contracts';

interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  setSession: (user: UserProfile, tokens: AuthTokens) => void;
  clearSession: () => void;
}

const AUTH_STORAGE_KEY = 'dautaytoy-auth';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      setSession: (user, tokens) => set({ user, tokens }),
      clearSession: () => set({ user: null, tokens: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// Cross-tab sync: refresh tokens rotate on every use (the old one is revoked
// server-side), but zustand's persist only reads localStorage once at load — so
// a second tab keeps a stale, already-revoked refresh token in memory. When it
// later tries to refresh, the server 401s and the tab gets logged out mid-edit.
// Re-reading localStorage on the browser's `storage` event (which fires only in
// *other* tabs) keeps every tab's in-memory session current with whichever tab
// last refreshed, logged in, or logged out.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === AUTH_STORAGE_KEY || event.key === null) {
      void useAuthStore.persist.rehydrate();
    }
  });
}
