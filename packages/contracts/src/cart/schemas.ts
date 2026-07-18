import { z } from 'zod';

export const cartItemViewSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  productName: z.string(),
  productSlug: z.string(),
  variantName: z.string().nullable(),
  imageUrl: z.string().nullable(),
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  lineTotal: z.number().int(),
  availableStock: z.number().int(),
});
export type CartItemView = z.infer<typeof cartItemViewSchema>;

export const appliedPromotionSchema = z.object({
  type: z.enum(['COMBO', 'BUY_X_GET_Y']),
  id: z.string().uuid(),
  label: z.string(),
  discountAmount: z.number().int(),
  timesApplied: z.number().int(),
});
export type AppliedPromotion = z.infer<typeof appliedPromotionSchema>;

export const cartViewSchema = z.object({
  id: z.string().uuid(),
  items: z.array(cartItemViewSchema),
  subtotal: z.number().int(),
  itemCount: z.number().int(),
  promotionDiscountTotal: z.number().int(),
  appliedPromotions: z.array(appliedPromotionSchema),
  couponCode: z.string().nullable(),
  discountTotal: z.number().int(),
  voucherCode: z.string().nullable(),
  voucherDiscountTotal: z.number().int(),
  total: z.number().int(),
});
export type CartView = z.infer<typeof cartViewSchema>;

export const addCartItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(99).default(1),
});
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(99),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const applyCartCouponSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Mã quá ngắn')
    .max(30)
    .transform((value) => value.toUpperCase()),
});
export type ApplyCartCouponInput = z.infer<typeof applyCartCouponSchema>;

export const redeemGiftVoucherSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3, 'Mã quá ngắn')
    .max(30)
    .transform((value) => value.toUpperCase()),
});
export type RedeemGiftVoucherInput = z.infer<typeof redeemGiftVoucherSchema>;
