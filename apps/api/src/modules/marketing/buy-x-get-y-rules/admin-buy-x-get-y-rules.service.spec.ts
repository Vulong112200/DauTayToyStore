import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminBuyXGetYRulesService } from './admin-buy-x-get-y-rules.service';

describe('AdminBuyXGetYRulesService', () => {
  let service: AdminBuyXGetYRulesService;
  let prisma: {
    buyXGetYRule: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock };
    product: { findMany: jest.Mock };
  };

  const input = {
    name: 'Mua 2 tặng 1',
    buyProductId: 'p1',
    buyQuantity: 2,
    getProductId: 'p2',
    getQuantity: 1,
    discountPercent: 100,
    isActive: true,
  };

  const ruleRow = {
    id: 'r1',
    name: 'Mua 2 tặng 1',
    buyProductId: 'p1',
    buyQuantity: 2,
    getProductId: 'p2',
    getQuantity: 1,
    discountPercent: 100,
    isActive: true,
    startsAt: null,
    endsAt: null,
  };

  beforeEach(() => {
    prisma = {
      buyXGetYRule: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: { findMany: jest.fn() },
    };
    service = new AdminBuyXGetYRulesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('throws BadRequestException when either product does not exist', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1' }]);

      await expect(service.create(input)).rejects.toThrow(BadRequestException);
    });

    it('creates the rule and joins current product names', async () => {
      prisma.product.findMany
        .mockResolvedValueOnce([{ id: 'p1' }, { id: 'p2' }])
        .mockResolvedValueOnce([
          { id: 'p1', name: 'LEGO City' },
          { id: 'p2', name: 'LEGO Star' },
        ]);
      prisma.buyXGetYRule.create.mockResolvedValue(ruleRow);

      const result = await service.create(input);

      expect(result.buyProductName).toBe('LEGO City');
      expect(result.getProductName).toBe('LEGO Star');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the rule does not exist', async () => {
      prisma.buyXGetYRule.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', input)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the rule does not exist', async () => {
      prisma.buyXGetYRule.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('hard-deletes an existing rule', async () => {
      prisma.buyXGetYRule.findUnique.mockResolvedValue({ id: 'r1' });

      await service.remove('r1');

      expect(prisma.buyXGetYRule.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });
  });

  describe('findAll', () => {
    it('falls back to a placeholder name for a deleted product', async () => {
      prisma.buyXGetYRule.findMany.mockResolvedValue([ruleRow]);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'LEGO City' }]);

      const result = await service.findAll();

      expect(result[0]?.buyProductName).toBe('LEGO City');
      expect(result[0]?.getProductName).toBe('(Sản phẩm đã bị xoá)');
    });
  });
});
