import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: {
    product: { findUnique: jest.Mock };
    productVariant: { findUnique: jest.Mock };
    coupon: { findUnique: jest.Mock };
    order: { count: jest.Mock };
    cart: { upsert: jest.Mock; update: jest.Mock; findUniqueOrThrow: jest.Mock };
    cartItem: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  const cart = { id: 'cart-1' };

  beforeEach(() => {
    prisma = {
      product: { findUnique: jest.fn() },
      productVariant: { findUnique: jest.fn() },
      coupon: { findUnique: jest.fn() },
      order: { count: jest.fn() },
      cart: {
        upsert: jest.fn().mockResolvedValue(cart),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...cart, coupon: null }),
      },
      cartItem: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn(),
      },
    };
    service = new CartService(prisma as unknown as PrismaService);
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
});
