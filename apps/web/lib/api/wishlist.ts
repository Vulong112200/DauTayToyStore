import type { AddWishlistItemInput, WishlistView } from '@repo/contracts';
import { apiFetch } from '../api-client';

export const wishlistApi = {
  get: () => apiFetch<WishlistView>('/wishlist', { auth: true }),

  addItem: (input: AddWishlistItemInput) =>
    apiFetch<WishlistView>('/wishlist/items', { body: input, auth: true }),

  removeItem: (productId: string) =>
    apiFetch<WishlistView>(`/wishlist/items/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
      auth: true,
    }),
};
