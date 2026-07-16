import type { AddCartItemInput, CartView, UpdateCartItemInput } from '@repo/contracts';
import { useAuthStore } from '@/store/auth-store';
import { apiFetch } from '../api-client';
import { getOrCreateCartSessionId } from '../cart-session';

function cartHeaders(): Record<string, string> {
  const accessToken = useAuthStore.getState().tokens?.accessToken;
  if (accessToken) return { Authorization: `Bearer ${accessToken}` };
  return { 'x-cart-session': getOrCreateCartSessionId() };
}

export const cartApi = {
  get: () => apiFetch<CartView>('/cart', { headers: cartHeaders() }),

  addItem: (input: AddCartItemInput) =>
    apiFetch<CartView>('/cart/items', { body: input, headers: cartHeaders() }),

  updateItem: (itemId: string, input: UpdateCartItemInput) =>
    apiFetch<CartView>(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: input,
      headers: cartHeaders(),
    }),

  removeItem: (itemId: string) =>
    apiFetch<CartView>(`/cart/items/${itemId}`, { method: 'DELETE', headers: cartHeaders() }),
};
