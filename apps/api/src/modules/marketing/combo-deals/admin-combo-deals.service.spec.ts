import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminComboDealsService } from './admin-combo-deals.service';

describe('AdminComboDealsService', () => {
  let service: AdminComboDealsService;
  let prisma: {
    comboDeal: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
    comboItem: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const input = {
    name: 'Combo LEGO',
    slug: 'combo-lego',
    comboPrice: 150_000,
    isActive: true,
    items: [
      { productId: 'p1', quantity: 1 },
      { productId: 'p2', quantity: 1 },
    ],
  };

  const comboRow = {
    id: 'combo-1',
    name: 'Combo LEGO',
    slug: 'combo-lego',
    description: null,
    comboPrice: 150_000,
    isActive: true,
    startsAt: null,
    endsAt: null,
    items: [
      { id: 'i1', productId: 'p1', quantity: 1, product: { name: 'LEGO City', price: 100_000 } },
      { id: 'i2', productId: 'p2', quantity: 1, product: { name: 'LEGO Star', price: 80_000 } },
    ],
  };

  beforeEach(() => {
    prisma = {
      comboDeal: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      comboItem: { deleteMany: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          comboItem: { deleteMany: prisma.comboItem.deleteMany },
          comboDeal: { update: jest.fn().mockResolvedValue(comboRow) },
        }),
      ),
    };
    service = new AdminComboDealsService(prisma as unknown as PrismaService);
  });

  describe('findById', () => {
    it('throws NotFoundException when the combo does not exist', async () => {
      prisma.comboDeal.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });

    it('maps items with the current product name/price', async () => {
      prisma.comboDeal.findUnique.mockResolvedValue(comboRow);

      const result = await service.findById('combo-1');

      expect(result.items).toEqual([
        { id: 'i1', productId: 'p1', productName: 'LEGO City', unitPrice: 100_000, quantity: 1 },
        { id: 'i2', productId: 'p2', productName: 'LEGO Star', unitPrice: 80_000, quantity: 1 },
      ]);
    });
  });

  describe('create', () => {
    it('throws ConflictException when the slug already exists', async () => {
      prisma.comboDeal.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(input)).rejects.toThrow(ConflictException);
    });

    it('creates the combo with nested items', async () => {
      prisma.comboDeal.findFirst.mockResolvedValue(null);
      prisma.comboDeal.create.mockResolvedValue(comboRow);

      await service.create(input);

      const [args] = prisma.comboDeal.create.mock.calls[0];
      expect(args.data.items.create).toEqual([
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
      ]);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the combo does not exist', async () => {
      prisma.comboDeal.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', input)).rejects.toThrow(NotFoundException);
    });

    it('replaces items wholesale inside a transaction', async () => {
      prisma.comboDeal.findUnique.mockResolvedValue({ id: 'combo-1' });
      prisma.comboDeal.findFirst.mockResolvedValue(null);

      await service.update('combo-1', input);

      expect(prisma.comboItem.deleteMany).toHaveBeenCalledWith({
        where: { comboDealId: 'combo-1' },
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the combo does not exist', async () => {
      prisma.comboDeal.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('hard-deletes an existing combo', async () => {
      prisma.comboDeal.findUnique.mockResolvedValue({ id: 'combo-1' });

      await service.remove('combo-1');

      expect(prisma.comboDeal.delete).toHaveBeenCalledWith({ where: { id: 'combo-1' } });
    });
  });
});
