import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AuthTokens, UserProfile } from '@repo/contracts';

interface AuthState {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  setSession: (user: UserProfile, tokens: AuthTokens) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      setSession: (user, tokens) => set({ user, tokens }),
      clearSession: () => set({ user: null, tokens: null }),
    }),
    {
      name: 'dautaytoy-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
