import { Prisma } from '@prisma/client';
import type { OrderView } from '@repo/contracts';

export const ORDER_VIEW_INCLUDE = {
  items: {
    include: { product: { select: { slug: true } } },
    orderBy: { id: 'asc' },
  },
  statusHistory: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OrderInclude;

export type OrderViewRow = Prisma.OrderGetPayload<{ include: typeof ORDER_VIEW_INCLUDE }>;

export function toOrderView(order: OrderViewRow): OrderView {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal,
    discountTotal: order.discountTotal,
    giftVoucherAmount: order.giftVoucherAmount,
    shippingFee: order.shippingFee,
    total: order.total,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    shippingAddress: {
      line1: order.shippingLine1,
      line2: order.shippingLine2,
      ward: order.shippingWard,
      district: order.shippingDistrict,
      province: order.shippingProvince,
      postalCode: order.shippingPostalCode,
    },
    note: order.note,
    items: order.items.map((item) => ({
      id: item.id,
      productSlug: item.product.slug,
      productName: item.productName,
      sku: item.sku,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    statusHistory: order.statusHistory.map((entry) => ({
      status: entry.status,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
    createdAt: order.createdAt.toISOString(),
  };
}
