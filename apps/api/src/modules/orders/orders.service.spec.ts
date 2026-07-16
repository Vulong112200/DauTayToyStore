import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    cart: { findFirst: jest.Mock };
    order: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock };
    inventory: { updateMany: jest.Mock };
    cartItem: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const checkoutInput = {
    customerName: 'Nguyen Van A',
    customerEmail: 'a@example.com',
    customerPhone: '0912345678',
    shippingLine1: '123 Đường ABC',
    shippingProvince: 'TP.HCM',
  };

  function cartWithItems(items: unknown[]) {
    return { id: 'cart-1', items };
  }

  function publishedItem(overrides: Record<string, unknown> = {}) {
    return {
      productId: 'p1',
      variantId: null,
      quantity: 2,
      product: {
        id: 'p1',
        name: 'LEGO City',
        sku: 'SKU-1',
        status: 'PUBLISHED',
        price: 100000,
        inventory: { quantityOnHand: 10, quantityReserved: 0 },
      },
      variant: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      cart: { findFirst: jest.fn() },
      order: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
      inventory: { updateMany: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          order: { create: prisma.order.create },
          inventory: { updateMany: prisma.inventory.updateMany },
          cartItem: { deleteMany: prisma.cartItem.deleteMany },
        }),
      ),
    };
    service = new OrdersService(prisma as unknown as PrismaService);
  });

  describe('checkout', () => {
    it('throws BadRequestException when the cart is empty or missing', async () => {
      prisma.cart.findFirst.mockResolvedValue(null);

      await expect(service.checkout({ sessionId: 's1' }, checkoutInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when a product is not published', async () => {
      prisma.cart.findFirst.mockResolvedValue(
        cartWithItems([publishedItem({ product: { ...publishedItem().product, status: 'DRAFT' } })]),
      );

      await expect(service.checkout({ sessionId: 's1' }, checkoutInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when requested quantity exceeds available stock', async () => {
      prisma.cart.findFirst.mockResolvedValue(
        cartWithItems([
          publishedItem({
            quantity: 20,
            product: {
              ...publishedItem().product,
              inventory: { quantityOnHand: 5, quantityReserved: 0 },
            },
          }),
        ]),
      );

      await expect(service.checkout({ sessionId: 's1' }, checkoutInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates an order, reserves inventory, and clears the cart', async () => {
      prisma.cart.findFirst.mockResolvedValue(cartWithItems([publishedItem()]));
      prisma.order.create.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'DTT12345678',
        status: 'PENDING',
        subtotal: 200000,
        discountTotal: 0,
        shippingFee: 30000,
        total: 230000,
        customerName: checkoutInput.customerName,
        customerEmail: checkoutInput.customerEmail,
        customerPhone: checkoutInput.customerPhone,
        shippingLine1: checkoutInput.shippingLine1,
        shippingLine2: null,
        shippingWard: null,
        shippingDistrict: null,
        shippingProvince: checkoutInput.shippingProvince,
        shippingPostalCode: null,
        note: null,
        createdAt: new Date('2026-01-01'),
        items: [
          {
            id: 'item-1',
            productName: 'LEGO City',
            sku: 'SKU-1',
            unitPrice: 100000,
            quantity: 2,
            lineTotal: 200000,
            product: { slug: 'lego-city' },
          },
        ],
        statusHistory: [{ status: 'PENDING', note: 'Đơn hàng đã được tạo', createdAt: new Date('2026-01-01') }],
      });

      const result = await service.checkout({ sessionId: 's1' }, checkoutInput);

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ subtotal: 200000, shippingFee: 30000, total: 230000 }),
        }),
      );
      expect(prisma.inventory.updateMany).toHaveBeenCalledWith({
        where: { productId: 'p1' },
        data: { quantityReserved: { increment: 2 } },
      });
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
      expect(result.orderNumber).toBe('DTT12345678');
      expect(result.items[0]?.productSlug).toBe('lego-city');
    });

    it('applies free shipping above the threshold', async () => {
      prisma.cart.findFirst.mockResolvedValue(
        cartWithItems([publishedItem({ quantity: 6 })]), // 6 * 100_000 = 600_000 >= 500_000 threshold
      );
      prisma.order.create.mockResolvedValue({
        id: 'order-2',
        orderNumber: 'DTT00000001',
        status: 'PENDING',
        subtotal: 600000,
        discountTotal: 0,
        shippingFee: 0,
        total: 600000,
        customerName: checkoutInput.customerName,
        customerEmail: checkoutInput.customerEmail,
        customerPhone: checkoutInput.customerPhone,
        shippingLine1: checkoutInput.shippingLine1,
        shippingLine2: null,
        shippingWard: null,
        shippingDistrict: null,
        shippingProvince: checkoutInput.shippingProvince,
        shippingPostalCode: null,
        note: null,
        createdAt: new Date('2026-01-01'),
        items: [],
        statusHistory: [],
      });

      await service.checkout({ sessionId: 's1' }, checkoutInput);

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ shippingFee: 0 }) }),
      );
    });
  });

  describe('getForUser', () => {
    it('throws NotFoundException when the order does not belong to the user', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(service.getForUser('user-1', 'DTT00000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('trackByNumberAndEmail', () => {
    it('throws NotFoundException when no order matches the number/email pair', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.trackByNumberAndEmail('DTT00000000', 'nobody@example.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listForUser', () => {
    it('maps orders to lightweight list items with computed itemCount', async () => {
      prisma.order.findMany.mockResolvedValue([
        {
          orderNumber: 'DTT1',
          status: 'PENDING',
          total: 100000,
          createdAt: new Date('2026-01-01'),
          items: [{ quantity: 2 }, { quantity: 3 }],
        },
      ]);

      const result = await service.listForUser('user-1');

      expect(result).toEqual([
        {
          orderNumber: 'DTT1',
          status: 'PENDING',
          total: 100000,
          itemCount: 5,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]);
    });
  });
});
