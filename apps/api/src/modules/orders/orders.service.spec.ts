import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PromotionContextService } from '../../common/promotion-context/promotion-context.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MomoService } from '../payments/momo.service';
import { VnpayService } from '../payments/vnpay.service';
import { AdminSettingsService } from '../settings/admin-settings.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let adminSettingsService: { getSettings: jest.Mock };
  let vnpayService: { buildPaymentUrl: jest.Mock };
  let momoService: { createPayment: jest.Mock };
  let promotionContext: {
    loadFlashSaleItems: jest.Mock;
    loadComboDeals: jest.Mock;
    loadBuyXGetYRules: jest.Mock;
    loadFreeShippingRules: jest.Mock;
  };
  let prisma: {
    cart: { findFirst: jest.Mock; update: jest.Mock };
    order: { create: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock; count: jest.Mock };
    coupon: { update: jest.Mock };
    giftVoucher: { findUnique: jest.Mock; update: jest.Mock };
    inventory: { updateMany: jest.Mock };
    cartItem: { deleteMany: jest.Mock };
    flashSaleItem: { findFirst: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };

  const checkoutInput = {
    customerName: 'Nguyen Van A',
    customerEmail: 'a@example.com',
    customerPhone: '0912345678',
    shippingLine1: '123 Đường ABC',
    shippingProvince: 'TP.HCM',
    paymentMethod: 'COD' as const,
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
      cart: { findFirst: jest.fn(), update: jest.fn() },
      order: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
      coupon: { update: jest.fn() },
      giftVoucher: { findUnique: jest.fn(), update: jest.fn() },
      inventory: { updateMany: jest.fn() },
      cartItem: { deleteMany: jest.fn() },
      flashSaleItem: { findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          order: { create: prisma.order.create },
          coupon: { update: prisma.coupon.update },
          giftVoucher: { findUnique: prisma.giftVoucher.findUnique, update: prisma.giftVoucher.update },
          inventory: { updateMany: prisma.inventory.updateMany },
          cartItem: { deleteMany: prisma.cartItem.deleteMany },
          cart: { update: prisma.cart.update },
          flashSaleItem: { findFirst: prisma.flashSaleItem.findFirst, update: prisma.flashSaleItem.update },
        }),
      ),
    };
    adminSettingsService = {
      getSettings: jest.fn().mockResolvedValue({
        siteName: 'DauTayToy Store',
        freeShippingThreshold: 500_000,
        flatShippingFee: 30_000,
      }),
    };
    promotionContext = {
      loadFlashSaleItems: jest.fn().mockResolvedValue([]),
      loadComboDeals: jest.fn().mockResolvedValue([]),
      loadBuyXGetYRules: jest.fn().mockResolvedValue([]),
      loadFreeShippingRules: jest.fn().mockResolvedValue([]),
    };
    vnpayService = {
      buildPaymentUrl: jest.fn().mockReturnValue('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?mock=1'),
    };
    momoService = {
      createPayment: jest.fn().mockResolvedValue('https://test-payment.momo.vn/pay/mock'),
    };
    service = new OrdersService(
      prisma as unknown as PrismaService,
      adminSettingsService as unknown as AdminSettingsService,
      promotionContext as unknown as PromotionContextService,
      vnpayService as unknown as VnpayService,
      momoService as unknown as MomoService,
    );
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
      expect(result.order.orderNumber).toBe('DTT12345678');
      expect(result.order.items[0]?.productSlug).toBe('lego-city');
      expect(result.paymentUrl).toBeNull();
      expect(vnpayService.buildPaymentUrl).not.toHaveBeenCalled();
    });

    it('creates a VNPAY payment and returns a paymentUrl instead of null', async () => {
      prisma.cart.findFirst.mockResolvedValue(cartWithItems([publishedItem()]));
      prisma.order.create.mockResolvedValue({
        orderNumber: 'DTT12345678',
        items: [{ product: { slug: 'lego-city' } }],
        statusHistory: [],
        createdAt: new Date('2026-01-01'),
      });

      const result = await service.checkout(
        { sessionId: 's1' },
        { ...checkoutInput, paymentMethod: 'VNPAY' },
        '203.0.113.5',
      );

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            payment: { create: { method: 'VNPAY', status: 'PENDING', amount: 230000 } },
          }),
        }),
      );
      expect(vnpayService.buildPaymentUrl).toHaveBeenCalledWith({
        orderNumber: 'DTT12345678',
        amount: 230000,
        ipAddr: '203.0.113.5',
      });
      expect(result.paymentUrl).toBe('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?mock=1');
    });

    it('creates a MOMO payment and returns a paymentUrl instead of null', async () => {
      prisma.cart.findFirst.mockResolvedValue(cartWithItems([publishedItem()]));
      prisma.order.create.mockResolvedValue({
        orderNumber: 'DTT12345678',
        items: [{ product: { slug: 'lego-city' } }],
        statusHistory: [],
        createdAt: new Date('2026-01-01'),
      });

      const result = await service.checkout(
        { sessionId: 's1' },
        { ...checkoutInput, paymentMethod: 'MOMO' },
        '203.0.113.5',
      );

      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            payment: { create: { method: 'MOMO', status: 'PENDING', amount: 230000 } },
          }),
        }),
      );
      expect(momoService.createPayment).toHaveBeenCalledWith({
        orderNumber: 'DTT12345678',
        amount: 230000,
      });
      expect(result.paymentUrl).toBe('https://test-payment.momo.vn/pay/mock');
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

    it('applies a valid cart coupon as a discount and increments its usage count', async () => {
      prisma.cart.findFirst.mockResolvedValue({
        ...cartWithItems([publishedItem()]),
        coupon: {
          id: 'c1',
          type: 'FIXED_AMOUNT',
          value: 20000,
          isActive: true,
          startsAt: null,
          expiresAt: null,
          minOrderAmount: null,
          maxDiscountAmount: null,
          usageLimit: null,
          usageCount: 0,
          perUserLimit: null,
        },
      });
      prisma.order.create.mockResolvedValue({
        id: 'order-3',
        orderNumber: 'DTT00000003',
        status: 'PENDING',
        subtotal: 200000,
        discountTotal: 20000,
        shippingFee: 30000,
        total: 210000,
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
        expect.objectContaining({
          data: expect.objectContaining({ discountTotal: 20000, total: 210000, couponId: 'c1' }),
        }),
      );
      expect(prisma.coupon.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { usageCount: { increment: 1 } },
      });
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { couponId: null, voucherId: null },
      });
    });

    it('throws BadRequestException when the applied coupon has expired by checkout time', async () => {
      prisma.cart.findFirst.mockResolvedValue({
        ...cartWithItems([publishedItem()]),
        coupon: {
          id: 'c1',
          type: 'FIXED_AMOUNT',
          value: 20000,
          isActive: true,
          startsAt: null,
          expiresAt: new Date('2020-01-01'),
          minOrderAmount: null,
          maxDiscountAmount: null,
          usageLimit: null,
          usageCount: 0,
          perUserLimit: null,
        },
      });

      await expect(service.checkout({ sessionId: 's1' }, checkoutInput)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('charges the flash-sale price and increments soldCount', async () => {
      prisma.cart.findFirst.mockResolvedValue(cartWithItems([publishedItem({ quantity: 2 })]));
      promotionContext.loadFlashSaleItems.mockResolvedValue([
        { productId: 'p1', salePrice: 70_000, remainingStock: 5 },
      ]);
      prisma.flashSaleItem.findFirst.mockResolvedValue({
        id: 'fsi-1',
        stockLimit: 10,
        soldCount: 3,
      });
      prisma.order.create.mockResolvedValue({
        id: 'order-4',
        orderNumber: 'DTT00000004',
        status: 'PENDING',
        subtotal: 140_000,
        discountTotal: 0,
        shippingFee: 30_000,
        total: 170_000,
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
        expect.objectContaining({
          data: expect.objectContaining({ subtotal: 140_000 }),
          include: expect.anything(),
        }),
      );
      const [createArgs] = prisma.order.create.mock.calls[0];
      expect(createArgs.data.items.create[0]).toMatchObject({ unitPrice: 70_000, lineTotal: 140_000 });
      expect(prisma.flashSaleItem.update).toHaveBeenCalledWith({
        where: { id: 'fsi-1' },
        data: { soldCount: { increment: 2 } },
      });
    });

    it('rejects checkout when flash-sale stock ran out between preview and checkout', async () => {
      prisma.cart.findFirst.mockResolvedValue(cartWithItems([publishedItem({ quantity: 2 })]));
      promotionContext.loadFlashSaleItems.mockResolvedValue([
        { productId: 'p1', salePrice: 70_000, remainingStock: 5 },
      ]);
      prisma.flashSaleItem.findFirst.mockResolvedValue({
        id: 'fsi-1',
        stockLimit: 10,
        soldCount: 9, // only 1 left, but the order wants 2
      });

      await expect(service.checkout({ sessionId: 's1' }, checkoutInput)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('deducts a gift voucher balance from the total and decrements it inside the transaction', async () => {
      prisma.cart.findFirst.mockResolvedValue({
        ...cartWithItems([publishedItem()]),
        coupon: null,
        voucher: { id: 'v1', code: 'GIFT10', isActive: true, expiresAt: null, balance: 50_000 },
      });
      prisma.giftVoucher.findUnique.mockResolvedValue({
        id: 'v1',
        code: 'GIFT10',
        isActive: true,
        expiresAt: null,
        balance: 50_000,
        redeemedAt: null,
      });
      prisma.order.create.mockResolvedValue({
        id: 'order-5',
        orderNumber: 'DTT00000005',
        status: 'PENDING',
        subtotal: 200000,
        discountTotal: 0,
        giftVoucherId: 'v1',
        giftVoucherAmount: 50_000,
        shippingFee: 30000,
        total: 180000,
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
        expect.objectContaining({
          data: expect.objectContaining({
            giftVoucherId: 'v1',
            giftVoucherAmount: 50_000,
            total: 180000,
          }),
        }),
      );
      expect(prisma.giftVoucher.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { balance: 0, redeemedAt: expect.any(Date) },
      });
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { couponId: null, voucherId: null },
      });
    });

    it('rejects checkout when the voucher balance was spent elsewhere before the transaction ran', async () => {
      prisma.cart.findFirst.mockResolvedValue({
        ...cartWithItems([publishedItem()]),
        coupon: null,
        voucher: { id: 'v1', code: 'GIFT10', isActive: true, expiresAt: null, balance: 50_000 },
      });
      prisma.giftVoucher.findUnique.mockResolvedValue({
        id: 'v1',
        code: 'GIFT10',
        isActive: true,
        expiresAt: null,
        balance: 10_000, // spent down to 10_000 since the cart-level check saw 50_000
        redeemedAt: null,
      });

      await expect(service.checkout({ sessionId: 's1' }, checkoutInput)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.order.create).not.toHaveBeenCalled();
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
