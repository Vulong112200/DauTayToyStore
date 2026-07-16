import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AddCartItemInput, CartItemView, CartView } from '@repo/contracts';
import { CartIdentity } from '../../common/cart-identity/cart-identity';
import { PromotionContextService } from '../../common/promotion-context/promotion-context.service';
import {
  assertCouponGloballyUsable,
  assertCouponUserUsable,
  computeCouponDiscount,
} from '../../common/utils/coupon.util';
import { assertVoucherUsable, computeVoucherDiscount } from '../../common/utils/gift-voucher.util';
import { resolveAvailableStock } from '../../common/utils/inventory.util';
import { PromotionEngineResult, runPromotionEngine } from '../../common/utils/promotion-engine.util';
import { PrismaService } from '../../infra/prisma/prisma.service';

const ITEM_INCLUDE = {
  product: {
    select: {
      name: true,
      slug: true,
      price: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      inventory: { select: { quantityOnHand: true, quantityReserved: true } },
    },
  },
  variant: {
    select: {
      name: true,
      priceOverride: true,
      imageUrl: true,
      inventory: { select: { quantityOnHand: true, quantityReserved: true } },
    },
  },
} satisfies Prisma.CartItemInclude;

type CartItemRow = Prisma.CartItemGetPayload<{ include: typeof ITEM_INCLUDE }>;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotionContext: PromotionContextService,
  ) {}

  async getCart(identity: CartIdentity): Promise<CartView> {
    const cart = await this.getOrCreateCart(identity);
    return this.loadCartView(cart.id);
  }

  async addItem(identity: CartIdentity, input: AddCartItemInput): Promise<CartView> {
    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true, status: true, inventory: { select: { quantityOnHand: true, quantityReserved: true } } },
    });

    if (!product || product.status !== 'PUBLISHED') {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    let availableStock = resolveAvailableStock(product.inventory);

    if (input.variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: input.variantId },
        select: {
          productId: true,
          isActive: true,
          inventory: { select: { quantityOnHand: true, quantityReserved: true } },
        },
      });

      if (!variant || variant.productId !== product.id || !variant.isActive) {
        throw new NotFoundException('Không tìm thấy biến thể sản phẩm');
      }

      availableStock = resolveAvailableStock(variant.inventory);
    } else {
      availableStock = await this.capByFlashStock(product.id, availableStock);
    }

    const cart = await this.getOrCreateCart(identity);

    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: input.productId, variantId: input.variantId ?? null },
    });

    const desiredQuantity = (existing?.quantity ?? 0) + input.quantity;
    if (desiredQuantity > availableStock) {
      throw new BadRequestException('Số lượng vượt quá hàng có sẵn trong kho');
    }

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: desiredQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: input.productId,
          variantId: input.variantId ?? null,
          quantity: input.quantity,
        },
      });
    }

    return this.loadCartView(cart.id);
  }

  async updateItemQuantity(
    identity: CartIdentity,
    itemId: string,
    quantity: number,
  ): Promise<CartView> {
    const cart = await this.getOrCreateCart(identity);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: ITEM_INCLUDE,
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    let availableStock = item.variant
      ? resolveAvailableStock(item.variant.inventory)
      : resolveAvailableStock(item.product.inventory);

    if (!item.variantId) {
      availableStock = await this.capByFlashStock(item.productId, availableStock);
    }

    if (quantity > availableStock) {
      throw new BadRequestException('Số lượng vượt quá hàng có sẵn trong kho');
    }

    await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });

    return this.loadCartView(cart.id);
  }

  async removeItem(identity: CartIdentity, itemId: string): Promise<CartView> {
    const cart = await this.getOrCreateCart(identity);
    const { count } = await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cartId: cart.id },
    });

    if (count === 0) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    return this.loadCartView(cart.id);
  }

  async applyCoupon(identity: CartIdentity, code: string): Promise<CartView> {
    const cart = await this.getOrCreateCart(identity);

    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      throw new NotFoundException('Mã giảm giá không tồn tại');
    }

    const { engineResult } = await this.loadCartContext(cart.id);
    assertCouponGloballyUsable(coupon, engineResult.netSubtotal);

    if (identity.userId) {
      const usedByUserCount = await this.prisma.order.count({
        where: { couponId: coupon.id, userId: identity.userId },
      });
      assertCouponUserUsable(coupon, usedByUserCount);
    }

    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: coupon.id } });

    return this.loadCartView(cart.id);
  }

  async removeCoupon(identity: CartIdentity): Promise<CartView> {
    const cart = await this.getOrCreateCart(identity);
    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    return this.loadCartView(cart.id);
  }

  async redeemVoucher(identity: CartIdentity, code: string): Promise<CartView> {
    const cart = await this.getOrCreateCart(identity);

    const voucher = await this.prisma.giftVoucher.findUnique({ where: { code } });
    if (!voucher) {
      throw new NotFoundException('Phiếu quà tặng không tồn tại');
    }
    assertVoucherUsable(voucher);

    await this.prisma.cart.update({ where: { id: cart.id }, data: { voucherId: voucher.id } });

    return this.loadCartView(cart.id);
  }

  async removeVoucher(identity: CartIdentity): Promise<CartView> {
    const cart = await this.getOrCreateCart(identity);
    await this.prisma.cart.update({ where: { id: cart.id }, data: { voucherId: null } });
    return this.loadCartView(cart.id);
  }

  /**
   * Called right after a successful login/register/Google-login when the request carried a
   * guest `x-cart-session` — folds that guest cart's items into the user's own cart (creating
   * one if they didn't have one yet) and discards the guest cart. Quantities for the same
   * (productId, variantId) are summed rather than overwritten; stock/flash-sale caps are not
   * re-checked here (same as elsewhere, checkout is the final backstop) so a merge can never
   * itself throw and block a login. The guest cart's coupon/voucher only carry over if the
   * user's cart doesn't already have one — an existing applied coupon/voucher on the account wins.
   */
  async mergeGuestCartIntoUserCart(userId: string, sessionId: string): Promise<void> {
    const guestCart = await this.prisma.cart.findUnique({
      where: { sessionId },
      include: { items: true },
    });

    if (!guestCart) return;

    if (guestCart.items.length === 0) {
      await this.prisma.cart.delete({ where: { id: guestCart.id } });
      return;
    }

    const userCart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
      include: { items: true },
    });

    if (userCart.id === guestCart.id) return;

    await this.prisma.$transaction(async (tx) => {
      for (const guestItem of guestCart.items) {
        const existing = userCart.items.find(
          (item) => item.productId === guestItem.productId && item.variantId === guestItem.variantId,
        );

        if (existing) {
          await tx.cartItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + guestItem.quantity },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: userCart.id,
              productId: guestItem.productId,
              variantId: guestItem.variantId,
              quantity: guestItem.quantity,
            },
          });
        }
      }

      if (guestCart.couponId && !userCart.couponId) {
        await tx.cart.update({ where: { id: userCart.id }, data: { couponId: guestCart.couponId } });
      }

      if (guestCart.voucherId && !userCart.voucherId) {
        await tx.cart.update({ where: { id: userCart.id }, data: { voucherId: guestCart.voucherId } });
      }

      // Cascades onto guestCart's own CartItem rows — already copied above, so this just
      // discards the now-redundant originals along with the empty shell cart.
      await tx.cart.delete({ where: { id: guestCart.id } });
    });
  }

  private async getOrCreateCart(identity: CartIdentity): Promise<{ id: string }> {
    if (identity.userId) {
      return this.prisma.cart.upsert({
        where: { userId: identity.userId },
        update: {},
        create: { userId: identity.userId },
        select: { id: true },
      });
    }

    if (identity.sessionId) {
      return this.prisma.cart.upsert({
        where: { sessionId: identity.sessionId },
        update: {},
        create: { sessionId: identity.sessionId },
        select: { id: true },
      });
    }

    throw new BadRequestException('Thiếu thông tin định danh giỏ hàng');
  }

  private async capByFlashStock(productId: string, inventoryStock: number): Promise<number> {
    const [flash] = await this.promotionContext.loadFlashSaleItems([productId]);
    if (!flash || flash.remainingStock === null) return inventoryStock;
    return Math.min(inventoryStock, Math.max(0, flash.remainingStock));
  }

  private async loadCartContext(
    cartId: string,
  ): Promise<{ items: CartItemRow[]; engineResult: PromotionEngineResult }> {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      orderBy: { createdAt: 'asc' },
      include: ITEM_INCLUDE,
    });

    const productIds = [...new Set(items.map((item) => item.productId))];
    const [flashSaleItems, comboDeals, buyXGetYRules] = await Promise.all([
      this.promotionContext.loadFlashSaleItems(productIds),
      this.promotionContext.loadComboDeals(),
      this.promotionContext.loadBuyXGetYRules(),
    ]);

    const cartLines = items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      basePrice: item.variant?.priceOverride ?? item.product.price,
    }));

    const engineResult = runPromotionEngine(cartLines, flashSaleItems, comboDeals, buyXGetYRules);

    return { items, engineResult };
  }

  private async loadCartView(cartId: string): Promise<CartView> {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: { coupon: true, voucher: true },
    });
    const { items, engineResult } = await this.loadCartContext(cartId);

    const views: CartItemView[] = items.map((item, index) => {
      const lineResult = engineResult.lines[index]!;
      const inventoryStock = item.variant
        ? resolveAvailableStock(item.variant.inventory)
        : resolveAvailableStock(item.product.inventory);
      const availableStock =
        lineResult.flashRemainingStock !== null
          ? Math.min(inventoryStock, lineResult.flashRemainingStock)
          : inventoryStock;

      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        productSlug: item.product.slug,
        variantName: item.variant?.name ?? null,
        imageUrl: item.variant?.imageUrl ?? item.product.images[0]?.url ?? null,
        unitPrice: lineResult.unitPrice,
        quantity: item.quantity,
        lineTotal: lineResult.lineTotal,
        availableStock,
      };
    });

    // Recomputed on every read rather than cached: if the cart contents shrink
    // below the coupon's minOrderAmount (or the coupon's window/usage limit lapses)
    // between apply and checkout, the discount silently drops to 0 without a
    // separate "unapply" step — same tradeoff as re-validating stock at checkout.
    let discountTotal = 0;
    if (cart.coupon) {
      try {
        assertCouponGloballyUsable(cart.coupon, engineResult.netSubtotal);
        discountTotal = computeCouponDiscount(cart.coupon, engineResult.netSubtotal);
      } catch {
        discountTotal = 0;
      }
    }

    const netAfterCoupon = engineResult.netSubtotal - discountTotal;

    // Same recompute-on-every-read tradeoff as the coupon above: if the voucher's balance
    // was spent elsewhere (or it expired/was deactivated) between redeem and checkout, the
    // discount silently drops to 0 here rather than needing a separate "unapply" step.
    let voucherDiscountTotal = 0;
    if (cart.voucher) {
      try {
        assertVoucherUsable(cart.voucher);
        voucherDiscountTotal = computeVoucherDiscount(cart.voucher, netAfterCoupon);
      } catch {
        voucherDiscountTotal = 0;
      }
    }

    return {
      id: cartId,
      items: views,
      subtotal: engineResult.subtotal,
      itemCount: views.reduce((sum, item) => sum + item.quantity, 0),
      promotionDiscountTotal: engineResult.promotionDiscountTotal,
      appliedPromotions: engineResult.appliedPromotions,
      couponCode: cart.coupon?.code ?? null,
      discountTotal,
      voucherCode: cart.voucher?.code ?? null,
      voucherDiscountTotal,
      total: netAfterCoupon - voucherDiscountTotal,
    };
  }
}
