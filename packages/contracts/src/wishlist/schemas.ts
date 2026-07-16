import { z } from 'zod';
import { productListItemSchema } from '../catalog/schemas.js';

export const wishlistItemViewSchema = z.object({
  productId: z.string().uuid(),
  addedAt: z.string().datetime(),
  product: productListItemSchema,
});
export type WishlistItemView = z.infer<typeof wishlistItemViewSchema>;

export const wishlistViewSchema = z.object({
  items: z.array(wishlistItemViewSchema),
});
export type WishlistView = z.infer<typeof wishlistViewSchema>;

export const addWishlistItemSchema = z.object({
  productId: z.string().uuid(),
});
export type AddWishlistItemInput = z.infer<typeof addWishlistItemSchema>;
