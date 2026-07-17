import { z } from 'zod';

export const orderStatusSchema = z.enum([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const paymentMethodSchema = z.enum(['COD', 'VNPAY']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const checkoutSchema = z.object({
  customerName: z.string().min(2, 'Họ tên quá ngắn').max(100),
  customerEmail: z.string().email('Email không hợp lệ'),
  customerPhone: z.string().regex(/^(0|\+84)(\d{9,10})$/, 'Số điện thoại không hợp lệ'),
  shippingLine1: z.string().min(3, 'Vui lòng nhập địa chỉ chi tiết'),
  shippingLine2: z.string().optional(),
  shippingWard: z.string().optional(),
  shippingDistrict: z.string().optional(),
  shippingProvince: z.string().min(2, 'Vui lòng chọn tỉnh/thành phố'),
  shippingPostalCode: z.string().optional(),
  note: z.string().max(500).optional(),
  paymentMethod: paymentMethodSchema.default('COD'),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderItemViewSchema = z.object({
  id: z.string().uuid(),
  productSlug: z.string(),
  productName: z.string(),
  sku: z.string(),
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  lineTotal: z.number().int(),
});
export type OrderItemView = z.infer<typeof orderItemViewSchema>;

export const orderStatusHistoryEntrySchema = z.object({
  status: orderStatusSchema,
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type OrderStatusHistoryEntry = z.infer<typeof orderStatusHistoryEntrySchema>;

export const shippingAddressViewSchema = z.object({
  line1: z.string(),
  line2: z.string().nullable(),
  ward: z.string().nullable(),
  district: z.string().nullable(),
  province: z.string(),
  postalCode: z.string().nullable(),
});
export type ShippingAddressView = z.infer<typeof shippingAddressViewSchema>;

export const orderViewSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  status: orderStatusSchema,
  subtotal: z.number().int(),
  discountTotal: z.number().int(),
  giftVoucherAmount: z.number().int(),
  shippingFee: z.number().int(),
  total: z.number().int(),
  customerName: z.string(),
  customerEmail: z.string(),
  customerPhone: z.string(),
  shippingAddress: shippingAddressViewSchema,
  note: z.string().nullable(),
  items: z.array(orderItemViewSchema),
  statusHistory: z.array(orderStatusHistoryEntrySchema),
  createdAt: z.string().datetime(),
});
export type OrderView = z.infer<typeof orderViewSchema>;

export const checkoutResultSchema = z.object({
  order: orderViewSchema,
  paymentUrl: z.string().url().nullable(),
});
export type CheckoutResult = z.infer<typeof checkoutResultSchema>;

export const orderListItemSchema = z.object({
  orderNumber: z.string(),
  status: orderStatusSchema,
  total: z.number().int(),
  itemCount: z.number().int(),
  createdAt: z.string().datetime(),
});
export type OrderListItem = z.infer<typeof orderListItemSchema>;

export const orderTrackQuerySchema = z.object({
  orderNumber: z.string().min(1, 'Vui lòng nhập mã đơn hàng'),
  email: z.string().email('Email không hợp lệ'),
});
export type OrderTrackQuery = z.infer<typeof orderTrackQuerySchema>;
