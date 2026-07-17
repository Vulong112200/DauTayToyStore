import type { QueryClient } from '@tanstack/react-query';

// Bridges the React-owned QueryClient to browser-only, non-React teardown code
// (reactive logout in api-client, cross-tab logout in the auth store) so those
// paths can drop a signed-out user's cached wishlist/cart. Registered by
// QueryProvider on mount; stays null on the server so SSR keeps per-request
// isolation (nothing server-side reads it).
let browserQueryClient: QueryClient | null = null;

export function setQueryClient(client: QueryClient | null): void {
  browserQueryClient = client;
}

export function getQueryClient(): QueryClient | null {
  return browserQueryClient;
}
