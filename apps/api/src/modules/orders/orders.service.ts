import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CheckoutInput, CheckoutResult, OrderListItem, OrderView } from '@repo/contracts';
import { CartIdentity } from '../../common/cart-identity/cart-identity';
import { PromotionContextService } from '../../common/promotion-context/promotion-context.service';
import {
  assertCouponGloballyUsable,
  assertCouponUserUsable,
  computeCouponDiscount,
} from '../../common/utils/coupon.util';
import { assertVoucherUsable, computeVoucherDiscount } from '../../common/utils/gift-voucher.util';
import { resolveAvailableStock } from '../../common/utils/inventory.util';
import { resolveFreeShipping, runPromotionEngine } from '../../common/utils/promotion-engine.util';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { VnpayService } from '../payments/vnpay.service';
import { AdminSettingsService } from '../settings/admin-settings.service';
import { ORDER_VIEW_INCLUDE, toOrderView } from './order-view.util';
import { generateOrderNumber } from './utils/order-number.util';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminSettingsService: AdminSettingsService,
    private readonly promotionContext: PromotionContextService,
    private readonly vnpayService: VnpayService,
  ) {}

  async checkout(
    identity: CartIdentity,
    input: CheckoutInput,
    ipAddr = '127.0.0.1',
  ): Promise<CheckoutResult> {
    const cart = await this.prisma.cart.findFirst({
      where: identity.userId ? { userId: identity.userId } : { sessionId: identity.sessionId },
      include: { items: { include: CART_ITEM_INCLUDE }, coupon: true, voucher: true },
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

    const productIds = [...new Set(cart.items.map((item) => item.productId))];
    const [flashSaleItems, comboDeals, buyXGetYRules, freeShippingRules, settings] =
      await Promise.all([
        this.promotionContext.loadFlashSaleItems(productIds),
        this.promotionContext.loadComboDeals(),
        this.promotionContext.loadBuyXGetYRules(),
        this.promotionContext.loadFreeShippingRules(),
        this.adminSettingsService.getSettings(),
      ]);

    const cartLines = cart.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      basePrice: item.variant?.priceOverride ?? item.product.price,
    }));

    const engineResult = runPromotionEngine(cartLines, flashSaleItems, comboDeals, buyXGetYRules);

    // Flash sale stock can only be soft-guaranteed at cart-preview time — re-check here in case
    // it sold out (to someone else) between adding to cart and checking out.
    for (const line of engineResult.lines) {
      if (line.flashApplied && line.flashRemainingStock !== null && line.quantity > line.flashRemainingStock) {
        const productName = cart.items.find((item) => item.productId === line.productId)?.product.name;
        throw new BadRequestException(
          `Số lượng giảm giá sốc cho "${productName}" không còn đủ, vui lòng giảm số lượng trong giỏ hàng`,
        );
      }
    }

    const lines = cart.items.map((item, index) => {
      const lineResult = engineResult.lines[index]!;
      return {
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        sku: item.variant?.sku ?? item.product.sku,
        unitPrice: lineResult.unitPrice,
        quantity: item.quantity,
        lineTotal: lineResult.lineTotal,
      };
    });

    const subtotal = engineResult.subtotal;

    let couponDiscount = 0;
    if (cart.coupon) {
      // Re-validate rather than trust what CartService checked at apply-time — the
      // cart contents, the coupon's window, or its usage limit may have changed since.
      assertCouponGloballyUsable(cart.coupon, engineResult.netSubtotal);
      if (identity.userId) {
        const usedByUserCount = await this.prisma.order.count({
          where: { couponId: cart.coupon.id, userId: identity.userId },
        });
        assertCouponUserUsable(cart.coupon, usedByUserCount);
      }
      couponDiscount = computeCouponDiscount(cart.coupon, engineResult.netSubtotal);
    }

    const discountTotal = engineResult.promotionDiscountTotal + couponDiscount;
    const netSubtotalAfterCoupon = engineResult.netSubtotal - couponDiscount;

    // Voucher is store credit, not a price discount — it's applied after the free-shipping
    // threshold check (based on netSubtotalAfterCoupon) so it can't be used to game free
    // shipping, and it never covers the shipping fee itself.
    let voucherAmount = 0;
    if (cart.voucher) {
      assertVoucherUsable(cart.voucher);
      voucherAmount = computeVoucherDiscount(cart.voucher, netSubtotalAfterCoupon);
    }

    const isFreeShipping = resolveFreeShipping(
      netSubtotalAfterCoupon,
      input.shippingProvince,
      settings.freeShippingThreshold,
      freeShippingRules,
    );
    const shippingFee = isFreeShipping ? 0 : settings.flatShippingFee;
    const total = netSubtotalAfterCoupon - voucherAmount + shippingFee;

    const order = await this.prisma.$transaction(async (tx) => {
      // Guard flash-sale stock again inside the transaction against a last-instant race —
      // same pragmatic best-effort tradeoff as the inventory reservation below (no
      // SERIALIZABLE isolation), acceptable at this system's scale.
      for (const line of engineResult.lines) {
        if (!line.flashApplied) continue;

        const flashItem = await tx.flashSaleItem.findFirst({
          where: {
            productId: line.productId,
            flashSale: { isActive: true, startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
          },
        });
        if (!flashItem) continue;

        if (flashItem.stockLimit !== null && flashItem.stockLimit - flashItem.soldCount < line.quantity) {
          const productName = cart.items.find((item) => item.productId === line.productId)?.product
            .name;
          throw new BadRequestException(
            `Số lượng giảm giá sốc cho "${productName}" không còn đủ, vui lòng giảm số lượng trong giỏ hàng`,
          );
        }

        await tx.flashSaleItem.update({
          where: { id: flashItem.id },
          data: { soldCount: { increment: line.quantity } },
        });
      }

      // Re-check the voucher's balance inside the transaction against a last-instant race
      // (same tradeoff as flash-sale stock above) — someone else may have spent it since.
      if (cart.voucher) {
        const voucher = await tx.giftVoucher.findUnique({ where: { id: cart.voucher.id } });
        if (!voucher) {
          throw new BadRequestException('Phiếu quà tặng không còn tồn tại');
        }
        assertVoucherUsable(voucher);
        if (voucher.balance < voucherAmount) {
          throw new BadRequestException('Số dư phiếu quà tặng không còn đủ, vui lòng thử lại');
        }
        const remainingBalance = voucher.balance - voucherAmount;
        await tx.giftVoucher.update({
          where: { id: voucher.id },
          data: {
            balance: remainingBalance,
            redeemedAt: remainingBalance === 0 ? new Date() : voucher.redeemedAt,
          },
        });
      }

      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          userId: identity.userId ?? null,
          status: 'PENDING',
          subtotal,
          discountTotal,
          giftVoucherId: cart.voucher?.id,
          giftVoucherAmount: voucherAmount,
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
          payment: { create: { method: input.paymentMethod, status: 'PENDING', amount: total } },
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
      await tx.cart.update({ where: { id: cart.id }, data: { couponId: null, voucherId: null } });

      return created;
    });

    const paymentUrl =
      input.paymentMethod === 'VNPAY'
        ? this.vnpayService.buildPaymentUrl({ orderNumber: order.orderNumber, amount: total, ipAddr })
        : null;

    return { order: toOrderView(order), paymentUrl };
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
