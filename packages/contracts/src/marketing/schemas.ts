import { z } from 'zod';

// Public (customer-facing) view of an active flash sale. Distinct from the admin
// schemas in `admin/schemas.ts`: no internal ids beyond what the storefront needs,
// and it carries the product's display fields (slug/image) + a computed
// `discountPercent` / `soldOut` so the frontend doesn't recompute pricing rules.
export const publicFlashSaleItemSchema = z.object({
  productId: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  primaryImageUrl: z.string().nullable(),
  originalPrice: z.number().int(),
  salePrice: z.number().int(),
  discountPercent: z.number().int(),
  stockLimit: z.number().int().nullable(),
  soldCount: z.number().int(),
  soldOut: z.boolean(),
});
export type PublicFlashSaleItem = z.infer<typeof publicFlashSaleItemSchema>;

export const publicFlashSaleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  items: z.array(publicFlashSaleItemSchema),
});
export type PublicFlashSale = z.infer<typeof publicFlashSaleSchema>;
