const CART_SESSION_KEY = 'dautaytoy-cart-session';

/** Stable guest cart identity, persisted in localStorage. Client-only. */
export function getOrCreateCartSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = window.localStorage.getItem(CART_SESSION_KEY);
  if (!sessionId) {
    sessionId = window.crypto.randomUUID();
    window.localStorage.setItem(CART_SESSION_KEY, sessionId);
  }
  return sessionId;
}
