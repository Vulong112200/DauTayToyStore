import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CheckoutInput, OrderListItem, OrderView } from '@repo/contracts';
import { CartIdentity } from '../../common/cart-identity/cart-identity';
import {
  assertCouponGloballyUsable,
  assertCouponUserUsable,
  computeCouponDiscount,
} from '../../common/utils/coupon.util';
import { resolveAvailableStock } from '../../common/utils/inventory.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { ORDER_VIEW_INCLUDE, toOrderView } from './order-view.util';
import { generateOrderNumber } from './utils/order-number.util';

/** Phase 2 shipping rule: flat fee below the free-shipping threshold. Real, configurable
 * FreeShippingRule-based logic lands in Phase 4 alongside the rest of the marketing engine. */
const FREE_SHIPPING_THRESHOLD = 500_000;
const FLAT_SHIPPING_FEE = 30_000;

const CART_ITEM_INCLUDE = {
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      status: true,
      price: true,
      inventory: { select: { quantityOnHand: true, quantityReserved: true } },
    },
  },
  variant: {
    select: {
      id: true,
      sku: true,
      priceOverride: true,
      isActive: true,
      inventory: { select: { quantityOnHand: true, quantityReserved: true } },
    },
  },
} satisfies Prisma.CartItemInclude;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(identity: CartIdentity, input: CheckoutInput): Promise<OrderView> {
    const cart = await this.prisma.cart.findFirst({
      where: identity.userId ? { userId: identity.userId } : { sessionId: identity.sessionId },
      include: { items: { include: CART_ITEM_INCLUDE }, coupon: true },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    for (const item of cart.items) {
      if (item.product.status !== 'PUBLISHED' || (item.variantId && !item.variant?.isActive)) {
        throw new BadRequestException(`Sản phẩm "${item.product.name}" hiện không khả dụng`);
      }
      const availableStock = item.variantId
        ? resolveAvailableStock(item.variant?.inventory)
        : resolveAvailableStock(item.product.inventory);
      if (item.quantity > availableStock) {
        throw new BadRequestException(`Sản phẩm "${item.product.name}" không đủ hàng trong kho`);
      }
    }

    const lines = cart.items.map((item) => {
      const unitPrice = item.variant?.priceOverride ?? item.product.price;
      return {
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        sku: item.variant?.sku ?? item.product.sku,
        unitPrice,
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;

    let discountTotal = 0;
    if (cart.coupon) {
      // Re-validate rather than trust what CartService checked at apply-time — the
      // cart contents, the coupon's window, or its usage limit may have changed since.
      assertCouponGloballyUsable(cart.coupon, subtotal);
      if (identity.userId) {
        const usedByUserCount = await this.prisma.order.count({
          where: { couponId: cart.coupon.id, userId: identity.userId },
        });
        assertCouponUserUsable(cart.coupon, usedByUserCount);
      }
      discountTotal = computeCouponDiscount(cart.coupon, subtotal);
    }

    const total = subtotal + shippingFee - discountTotal;

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: identity.userId ?? null,
          status: 'PENDING',
          subtotal,
          discountTotal,
          shippingFee,
          total,
          couponId: cart.coupon?.id,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          customerName: input.customerName,
          shippingLine1: input.shippingLine1,
          shippingLine2: input.shippingLine2,
          shippingWard: input.shippingWard,
          shippingDistrict: input.shippingDistrict,
          shippingProvince: input.shippingProvince,
          shippingPostalCode: input.shippingPostalCode,
          note: input.note,
          items: { create: lines },
          statusHistory: { create: [{ status: 'PENDING', note: 'Đơn hàng đã được tạo' }] },
          payment: { create: { method: 'COD', status: 'PENDING', amount: total } },
        },
        include: ORDER_VIEW_INCLUDE,
      });

      for (const item of cart.items) {
        if (item.variantId) {
          await tx.inventory.updateMany({
            where: { variantId: item.variantId },
            data: { quantityReserved: { increment: item.quantity } },
          });
        } else {
          await tx.inventory.updateMany({
            where: { productId: item.productId },
            data: { quantityReserved: { increment: item.quantity } },
          });
        }
      }

      if (cart.coupon) {
        await tx.coupon.update({
          where: { id: cart.coupon.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { couponId: null } });

      return created;
    });

    return toOrderView(order);
  }

  async listForUser(userId: string): Promise<OrderListItem[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: { select: { quantity: true } } },
    });

    return orders.map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: order.createdAt.toISOString(),
    }));
  }

  async getForUser(userId: string, orderNumber: string): Promise<OrderView> {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber, userId },
      include: ORDER_VIEW_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return toOrderView(order);
  }

  async trackByNumberAndEmail(orderNumber: string, email: string): Promise<OrderView> {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber, customerEmail: { equals: email, mode: 'insensitive' } },
      include: ORDER_VIEW_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng với thông tin đã cung cấp');
    }

    return toOrderView(order);
  }
}
