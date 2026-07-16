import { useAuthStore } from '@/store/auth-store';
import { getOrCreateCartSessionId } from './cart-session';

/** Resolves to either a Bearer token (logged-in) or a guest session header. */
export function cartIdentityHeaders(): Record<string, string> {
  const accessToken = useAuthStore.getState().tokens?.accessToken;
  if (accessToken) return { Authorization: `Bearer ${accessToken}` };
  return { 'x-cart-session': getOrCreateCartSessionId() };
}
