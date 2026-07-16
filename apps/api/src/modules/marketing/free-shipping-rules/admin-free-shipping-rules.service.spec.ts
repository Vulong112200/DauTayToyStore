import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminFreeShippingRulesService } from './admin-free-shipping-rules.service';

describe('AdminFreeShippingRulesService', () => {
  let service: AdminFreeShippingRulesService;
  let prisma: {
    freeShippingRule: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const input = { name: 'Miễn phí nội thành', minOrderAmount: 300_000, isActive: true };

  const ruleRow = {
    id: 'r1',
    name: 'Miễn phí nội thành',
    minOrderAmount: 300_000,
    applicableProvinces: ['TP.HCM'],
    isActive: true,
    startsAt: null,
    endsAt: null,
  };

  beforeEach(() => {
    prisma = {
      freeShippingRule: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new AdminFreeShippingRulesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates the rule and maps applicableProvinces through', async () => {
      prisma.freeShippingRule.create.mockResolvedValue(ruleRow);

      const result = await service.create({ ...input, applicableProvinces: ['TP.HCM'] });

      expect(result.applicableProvinces).toEqual(['TP.HCM']);
    });

    it('returns null applicableProvinces when none were set', async () => {
      prisma.freeShippingRule.create.mockResolvedValue({ ...ruleRow, applicableProvinces: null });

      const result = await service.create(input);

      expect(result.applicableProvinces).toBeNull();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the rule does not exist', async () => {
      prisma.freeShippingRule.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', input)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the rule does not exist', async () => {
      prisma.freeShippingRule.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('hard-deletes an existing rule', async () => {
      prisma.freeShippingRule.findUnique.mockResolvedValue({ id: 'r1' });

      await service.remove('r1');

      expect(prisma.freeShippingRule.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });
  });
});
