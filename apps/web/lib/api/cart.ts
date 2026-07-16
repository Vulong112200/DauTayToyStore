import type { AddCartItemInput, CartView, UpdateCartItemInput } from '@repo/contracts';
import { apiFetch } from '../api-client';
import { cartIdentityHeaders } from '../cart-headers';

export const cartApi = {
  get: () => apiFetch<CartView>('/cart', { headers: cartIdentityHeaders() }),

  addItem: (input: AddCartItemInput) =>
    apiFetch<CartView>('/cart/items', { body: input, headers: cartIdentityHeaders() }),

  updateItem: (itemId: string, input: UpdateCartItemInput) =>
    apiFetch<CartView>(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: input,
      headers: cartIdentityHeaders(),
    }),

  removeItem: (itemId: string) =>
    apiFetch<CartView>(`/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: cartIdentityHeaders(),
    }),
};
