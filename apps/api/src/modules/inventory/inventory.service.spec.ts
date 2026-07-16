import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: {
    inventory: { findMany: jest.Mock; count: jest.Mock; upsert: jest.Mock };
    product: { findUnique: jest.Mock };
  };

  function row(overrides: Partial<{
    quantityOnHand: number;
    quantityReserved: number;
    lowStockThreshold: number;
    productId: string;
    productName: string;
    sku: string;
  }> = {}) {
    return {
      productId: overrides.productId ?? 'p1',
      quantityOnHand: overrides.quantityOnHand ?? 10,
      quantityReserved: overrides.quantityReserved ?? 0,
      lowStockThreshold: overrides.lowStockThreshold ?? 5,
      product: {
        id: overrides.productId ?? 'p1',
        name: overrides.productName ?? 'LEGO City',
        sku: overrides.sku ?? 'SKU-1',
        images: [],
      },
    };
  }

  beforeEach(() => {
    prisma = {
      inventory: { findMany: jest.fn(), count: jest.fn(), upsert: jest.fn() },
      product: { findUnique: jest.fn() },
    };
    service = new InventoryService(prisma as unknown as PrismaService);
  });

  describe('findList', () => {
    it('scopes to product-level inventory and applies the search filter', async () => {
      prisma.inventory.findMany.mockResolvedValue([]);
      prisma.inventory.count.mockResolvedValue(0);

      await service.findList({ page: 1, pageSize: 20, q: 'lego' });

      const [args] = prisma.inventory.findMany.mock.calls[0];
      expect(args.where).toMatchObject({
        productId: { not: null },
        product: {
          OR: [
            { name: { contains: 'lego', mode: 'insensitive' } },
            { sku: { contains: 'lego', mode: 'insensitive' } },
          ],
        },
      });
    });

    it('computes availableStock from on-hand minus reserved', async () => {
      prisma.inventory.findMany.mockResolvedValue([row({ quantityOnHand: 10, quantityReserved: 3 })]);
      prisma.inventory.count.mockResolvedValue(1);

      const result = await service.findList({ page: 1, pageSize: 20 });

      expect(result.items[0]?.availableStock).toBe(7);
    });

    it('filters to low-stock items and recomputes pagination meta from the filtered set', async () => {
      prisma.inventory.findMany.mockResolvedValue([
        row({ productId: 'p1', quantityOnHand: 10, quantityReserved: 8, lowStockThreshold: 5 }), // available 2, low stock
        row({ productId: 'p2', quantityOnHand: 50, quantityReserved: 0, lowStockThreshold: 5 }), // available 50, fine
      ]);

      const result = await service.findList({ page: 1, pageSize: 20, lowStockOnly: true });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.productId).toBe('p1');
      expect(result.meta.totalItems).toBe(1);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { quantityOnHand: 10 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('upserts the inventory row for the product', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.inventory.upsert.mockResolvedValue(row({ quantityOnHand: 25 }));

      const result = await service.update('p1', { quantityOnHand: 25, lowStockThreshold: 10 });

      expect(prisma.inventory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'p1' },
          update: { quantityOnHand: 25, lowStockThreshold: 10 },
          create: { productId: 'p1', quantityOnHand: 25, lowStockThreshold: 10 },
        }),
      );
      expect(result.quantityOnHand).toBe(25);
    });
  });
});
