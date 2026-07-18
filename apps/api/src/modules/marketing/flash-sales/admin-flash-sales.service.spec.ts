import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminFlashSalesService } from './admin-flash-sales.service';

describe('AdminFlashSalesService', () => {
  let service: AdminFlashSalesService;
  let prisma: {
    flashSale: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; delete: jest.Mock };
    flashSaleItem: { deleteMany: jest.Mock; upsert: jest.Mock };
    $transaction: jest.Mock;
  };

  const input = {
    name: 'Flash sale hè',
    startsAt: '2026-07-01T00:00:00.000Z',
    endsAt: '2026-07-02T00:00:00.000Z',
    isActive: true,
    items: [{ productId: 'p1', salePrice: 90_000 }],
  };

  const flashSaleRow = {
    id: 'fs1',
    name: 'Flash sale hè',
    startsAt: new Date('2026-07-01'),
    endsAt: new Date('2026-07-02'),
    isActive: true,
    items: [
      {
        id: 'item-1',
        productId: 'p1',
        salePrice: 90_000,
        stockLimit: null,
        soldCount: 0,
        product: { name: 'LEGO City', price: 120_000 },
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      flashSale: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      flashSaleItem: { deleteMany: jest.fn(), upsert: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          flashSaleItem: {
            deleteMany: prisma.flashSaleItem.deleteMany,
            upsert: prisma.flashSaleItem.upsert,
          },
          flashSale: { update: jest.fn().mockResolvedValue(flashSaleRow) },
        }),
      ),
    };
    service = new AdminFlashSalesService(prisma as unknown as PrismaService);
  });

  describe('findById', () => {
    it('throws NotFoundException when the flash sale does not exist', async () => {
      prisma.flashSale.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });

    it('maps the flash sale and its items to the detail shape', async () => {
      prisma.flashSale.findUnique.mockResolvedValue(flashSaleRow);

      const result = await service.findById('fs1');

      expect(result.items).toEqual([
        {
          id: 'item-1',
          productId: 'p1',
          productName: 'LEGO City',
          originalPrice: 120_000,
          salePrice: 90_000,
          stockLimit: null,
          soldCount: 0,
        },
      ]);
    });
  });

  describe('create', () => {
    it('creates the flash sale with nested items', async () => {
      prisma.flashSale.create.mockResolvedValue(flashSaleRow);

      await service.create(input);

      const [args] = prisma.flashSale.create.mock.calls[0];
      expect(args.data.items.create).toEqual([
        { productId: 'p1', salePrice: 90_000, stockLimit: undefined },
      ]);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the flash sale does not exist', async () => {
      prisma.flashSale.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', input)).rejects.toThrow(NotFoundException);
    });

    it('diffs items — removes only dropped ones and upserts the rest to preserve soldCount', async () => {
      prisma.flashSale.findUnique.mockResolvedValue({ id: 'fs1' });

      await service.update('fs1', input);

      // Only items no longer in the sale are deleted; the ones that stay keep their soldCount.
      expect(prisma.flashSaleItem.deleteMany).toHaveBeenCalledWith({
        where: { flashSaleId: 'fs1', productId: { notIn: ['p1'] } },
      });
      expect(prisma.flashSaleItem.upsert).toHaveBeenCalledWith({
        where: { flashSaleId_productId: { flashSaleId: 'fs1', productId: 'p1' } },
        create: { flashSaleId: 'fs1', productId: 'p1', salePrice: 90_000, stockLimit: undefined },
        update: { salePrice: 90_000, stockLimit: undefined },
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the flash sale does not exist', async () => {
      prisma.flashSale.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('hard-deletes an existing flash sale', async () => {
      prisma.flashSale.findUnique.mockResolvedValue({ id: 'fs1' });

      await service.remove('fs1');

      expect(prisma.flashSale.delete).toHaveBeenCalledWith({ where: { id: 'fs1' } });
    });
  });
});
