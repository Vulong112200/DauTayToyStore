import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PromotionContextService } from '../../common/promotion-context/promotion-context.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let promotionContext: {
    loadFlashSaleItems: jest.Mock;
    loadComboDeals: jest.Mock;
    loadBuyXGetYRules: jest.Mock;
  };
  let prisma: {
    product: { findUnique: jest.Mock };
    productVariant: { findUnique: jest.Mock };
    coupon: { findUnique: jest.Mock };
    giftVoucher: { findUnique: jest.Mock };
    order: { count: jest.Mock };
    cart: {
      upsert: jest.Mock;
      update: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
    cartItem: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const cart = { id: 'cart-1' };

  beforeEach(() => {
    prisma = {
      product: { findUnique: jest.fn() },
      productVariant: { findUnique: jest.fn() },
      coupon: { findUnique: jest.fn() },
      giftVoucher: { findUnique: jest.fn() },
      order: { count: jest.fn() },
      cart: {
        // getOrCreateCart now includes coupon+voucher and hands the row straight to
        // loadCartView (no second findUniqueOrThrow), so the refs live on the upsert result.
        upsert: jest.fn().mockResolvedValue({ ...cart, coupon: null, voucher: null }),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...cart, coupon: null, voucher: null }),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      cartItem: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          cartItem: { update: prisma.cartItem.update, create: prisma.cartItem.create },
          cart: { update: prisma.cart.update, delete: prisma.cart.delete },
        }),
      ),
    };
    promotionContext = {
      loadFlashSaleItems: jest.fn().mockResolvedValue([]),
      loadComboDeals: jest.fn().mockResolvedValue([]),
      loadBuyXGetYRules: jest.fn().mockResolvedValue([]),
    };
    service = new CartService(
      prisma as unknown as PrismaService,
      promotionContext as unknown as PromotionContextService,
    );
  });

  describe('getOrCreateCart identity resolution', () => {
    it('upserts by userId when authenticated', async () => {
      await service.getCart({ userId: 'user-1' });
      expect(prisma.cart.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });

    it('upserts by sessionId for guests', async () => {
      await service.getCart({ sessionId: 'session-1' });
      expect(prisma.cart.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sessionId: 'session-1' } }),
      );
    });

    it('throws BadRequestException when neither userId nor sessionId is provided', async () => {
      await expect(service.getCart({})).rejects.toThrow(BadRequestException);
    });
  });

  describe('addItem', () => {
    it('throws NotFoundException when the product does not exist or is not published', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem({ sessionId: 's1' }, { productId: 'missing', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a new cart item when none exists yet', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'PUBLISHED',
        inventory: { quantityOnHand: 10, quantityReserved: 0 },
      });
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cartItem.create.mockResolvedValue({});

      await service.addItem({ sessionId: 's1' }, { productId: 'p1', quantity: 2 });

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cartId: 'cart-1', productId: 'p1', quantity: 2 }),
        }),
      );
    });

    it('increments quantity when the item already exists in the cart', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'PUBLISHED',
        inventory: { quantityOnHand: 10, quantityReserved: 0 },
      });
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'item-1', quantity: 3 });
      prisma.cartItem.update.mockResolvedValue({});

      await service.addItem({ sessionId: 's1' }, { productId: 'p1', quantity: 2 });

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { quantity: 5 },
      });
    });

    it('throws BadRequestException when the requested quantity exceeds available stock', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'PUBLISHED',
        inventory: { quantityOnHand: 3, quantityReserved: 0 },
      });
      prisma.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.addItem({ sessionId: 's1' }, { productId: 'p1', quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('validates that the variant belongs to the product', async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'PUBLISHED',
        inventory: { quantityOnHand: 10, quantityReserved: 0 },
      });
      prisma.productVariant.findUnique.mockResolvedValue({
        productId: 'other-product',
        isActive: true,
        inventory: null,
      });

      await expect(
        service.addItem(
          { sessionId: 's1' },
          { productId: 'p1', variantId: 'v1', quantity: 1 },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeItem', () => {
    it('throws NotFoundException when the item is not in the cart', async () => {
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.removeItem({ sessionId: 's1' }, 'item-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('removes the item when found', async () => {
      prisma.cartItem.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.removeItem({ sessionId: 's1' }, 'item-1');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { id: 'item-1', cartId: 'cart-1' },
      });
      expect(result.items).toEqual([]);
    });
  });

  describe('applyCoupon', () => {
    it('throws NotFoundException when the code does not exist', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.applyCoupon({ sessionId: 's1' }, 'MISSING')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when the coupon is inactive', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ code: 'OFF10', isActive: false });

      await expect(service.applyCoupon({ sessionId: 's1' }, 'OFF10')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('enforces perUserLimit only for authenticated users', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        id: 'c1',
        code: 'OFF10',
        isActive: true,
        startsAt: null,
        expiresAt: null,
        minOrderAmount: null,
        usageLimit: null,
        usageCount: 0,
        perUserLimit: 1,
      });
      prisma.order.count.mockResolvedValue(1);

      await expect(service.applyCoupon({ userId: 'u1' }, 'OFF10')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.order.count).toHaveBeenCalledWith({
        where: { couponId: 'c1', userId: 'u1' },
      });
    });

    it('applies the coupon to the cart when usable', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        id: 'c1',
        code: 'OFF10',
        isActive: true,
        startsAt: null,
        expiresAt: null,
        minOrderAmount: null,
        usageLimit: null,
        usageCount: 0,
        perUserLimit: null,
      });

      await service.applyCoupon({ sessionId: 's1' }, 'OFF10');

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { couponId: 'c1' },
      });
    });
  });

  describe('removeCoupon', () => {
    it('clears the coupon from the cart', async () => {
      await service.removeCoupon({ sessionId: 's1' });

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { couponId: null },
      });
    });
  });

  describe('redeemVoucher', () => {
    it('throws NotFoundException when the code does not exist', async () => {
      prisma.giftVoucher.findUnique.mockResolvedValue(null);

      await expect(service.redeemVoucher({ sessionId: 's1' }, 'MISSING')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when the voucher balance is exhausted', async () => {
      prisma.giftVoucher.findUnique.mockResolvedValue({
        id: 'v1',
        code: 'GIFT10',
        isActive: true,
        expiresAt: null,
        balance: 0,
      });

      await expect(service.redeemVoucher({ sessionId: 's1' }, 'GIFT10')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('applies the voucher to the cart when usable', async () => {
      prisma.giftVoucher.findUnique.mockResolvedValue({
        id: 'v1',
        code: 'GIFT10',
        isActive: true,
        expiresAt: null,
        balance: 50_000,
      });

      await service.redeemVoucher({ sessionId: 's1' }, 'GIFT10');

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { voucherId: 'v1' },
      });
    });
  });

  describe('removeVoucher', () => {
    it('clears the voucher from the cart', async () => {
      await service.removeVoucher({ sessionId: 's1' });

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { voucherId: null },
      });
    });
  });

  describe('getCart with promotions', () => {
    function cartItemRow(overrides: Record<string, unknown> = {}) {
      return {
        id: 'item-1',
        productId: 'p1',
        variantId: null,
        quantity: 2,
        product: {
          name: 'LEGO City',
          slug: 'lego-city',
          price: 100_000,
          images: [{ url: 'https://example.com/p1.jpg' }],
          inventory: { quantityOnHand: 10, quantityReserved: 0 },
        },
        variant: null,
        ...overrides,
      };
    }

    it('overrides the unit price and caps availableStock with an active flash sale', async () => {
      prisma.cartItem.findMany.mockResolvedValue([cartItemRow()]);
      promotionContext.loadFlashSaleItems.mockResolvedValue([
        { productId: 'p1', salePrice: 70_000, remainingStock: 5 },
      ]);

      const result = await service.getCart({ sessionId: 's1' });

      expect(result.items[0]).toMatchObject({
        unitPrice: 70_000,
        lineTotal: 140_000,
        availableStock: 5,
      });
      expect(result.subtotal).toBe(140_000);
    });

    it('reflects a combo discount in promotionDiscountTotal and appliedPromotions', async () => {
      prisma.cartItem.findMany.mockResolvedValue([
        cartItemRow({ id: 'item-1', productId: 'p1', quantity: 1 }),
        cartItemRow({
          id: 'item-2',
          productId: 'p2',
          quantity: 1,
          product: {
            name: 'LEGO Star',
            slug: 'lego-star',
            price: 80_000,
            images: [],
            inventory: { quantityOnHand: 10, quantityReserved: 0 },
          },
        }),
      ]);
      promotionContext.loadComboDeals.mockResolvedValue([
        {
          id: 'combo-1',
          name: 'Combo A+B',
          comboPrice: 150_000,
          items: [
            { productId: 'p1', quantity: 1 },
            { productId: 'p2', quantity: 1 },
          ],
        },
      ]);

      const result = await service.getCart({ sessionId: 's1' });

      expect(result.subtotal).toBe(180_000);
      expect(result.promotionDiscountTotal).toBe(30_000);
      expect(result.appliedPromotions).toEqual([
        { type: 'COMBO', id: 'combo-1', label: 'Combo A+B', discountAmount: 30_000, timesApplied: 1 },
      ]);
      expect(result.total).toBe(150_000);
    });

    it('caps the voucher discount at the remaining balance and deducts it from the total', async () => {
      prisma.cartItem.findMany.mockResolvedValue([cartItemRow()]);
      prisma.cart.upsert.mockResolvedValue({
        ...cart,
        coupon: null,
        voucher: { id: 'v1', code: 'GIFT10', isActive: true, expiresAt: null, balance: 30_000 },
      });

      const result = await service.getCart({ sessionId: 's1' });

      expect(result.subtotal).toBe(200_000);
      expect(result.voucherCode).toBe('GIFT10');
      expect(result.voucherDiscountTotal).toBe(30_000);
      expect(result.total).toBe(170_000);
    });
  });

  describe('mergeGuestCartIntoUserCart', () => {
    it('does nothing when there is no guest cart for that session', async () => {
      prisma.cart.findUnique.mockResolvedValue(null);

      await service.mergeGuestCartIntoUserCart('user-1', 'session-1');

      expect(prisma.cart.upsert).not.toHaveBeenCalled();
      expect(prisma.cart.delete).not.toHaveBeenCalled();
    });

    it('deletes an empty guest cart without touching the user cart', async () => {
      prisma.cart.findUnique.mockResolvedValue({ id: 'guest-cart', couponId: null, items: [] });

      await service.mergeGuestCartIntoUserCart('user-1', 'session-1');

      expect(prisma.cart.delete).toHaveBeenCalledWith({ where: { id: 'guest-cart' } });
      expect(prisma.cart.upsert).not.toHaveBeenCalled();
    });

    it('creates new items and sums quantities for items already in the user cart', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'guest-cart',
        couponId: null,
        items: [
          { id: 'gi-1', productId: 'p1', variantId: null, quantity: 2 },
          { id: 'gi-2', productId: 'p2', variantId: null, quantity: 1 },
        ],
      });
      prisma.cart.upsert.mockResolvedValue({
        id: 'user-cart',
        couponId: null,
        items: [{ id: 'ui-1', productId: 'p1', variantId: null, quantity: 3 }],
      });

      await service.mergeGuestCartIntoUserCart('user-1', 'session-1');

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'ui-1' },
        data: { quantity: 5 },
      });
      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: { cartId: 'user-cart', productId: 'p2', variantId: null, quantity: 1 },
      });
      expect(prisma.cart.delete).toHaveBeenCalledWith({ where: { id: 'guest-cart' } });
    });

    it('carries the guest cart coupon over only when the user cart has none', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'guest-cart',
        couponId: 'coupon-1',
        voucherId: null,
        items: [{ id: 'gi-1', productId: 'p1', variantId: null, quantity: 1 }],
      });
      prisma.cart.upsert.mockResolvedValue({ id: 'user-cart', couponId: null, voucherId: null, items: [] });

      await service.mergeGuestCartIntoUserCart('user-1', 'session-1');

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'user-cart' },
        data: { couponId: 'coupon-1' },
      });
    });

    it('keeps the user cart coupon when it already has one', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'guest-cart',
        couponId: 'coupon-guest',
        voucherId: null,
        items: [{ id: 'gi-1', productId: 'p1', variantId: null, quantity: 1 }],
      });
      prisma.cart.upsert.mockResolvedValue({
        id: 'user-cart',
        couponId: 'coupon-user',
        voucherId: null,
        items: [],
      });

      await service.mergeGuestCartIntoUserCart('user-1', 'session-1');

      expect(prisma.cart.update).not.toHaveBeenCalled();
    });

    it('carries the guest cart voucher over only when the user cart has none', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'guest-cart',
        couponId: null,
        voucherId: 'voucher-1',
        items: [{ id: 'gi-1', productId: 'p1', variantId: null, quantity: 1 }],
      });
      prisma.cart.upsert.mockResolvedValue({ id: 'user-cart', couponId: null, voucherId: null, items: [] });

      await service.mergeGuestCartIntoUserCart('user-1', 'session-1');

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'user-cart' },
        data: { voucherId: 'voucher-1' },
      });
    });

    it('keeps the user cart voucher when it already has one', async () => {
      prisma.cart.findUnique.mockResolvedValue({
        id: 'guest-cart',
        couponId: null,
        voucherId: 'voucher-guest',
        items: [{ id: 'gi-1', productId: 'p1', variantId: null, quantity: 1 }],
      });
      prisma.cart.upsert.mockResolvedValue({
        id: 'user-cart',
        couponId: null,
        voucherId: 'voucher-user',
        items: [],
      });

      await service.mergeGuestCartIntoUserCart('user-1', 'session-1');

      expect(prisma.cart.update).not.toHaveBeenCalled();
    });
  });
});
