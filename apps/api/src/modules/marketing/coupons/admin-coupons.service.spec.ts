import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminCouponsService } from './admin-coupons.service';

describe('AdminCouponsService', () => {
  let service: AdminCouponsService;
  let prisma: {
    coupon: {
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const input = {
    code: 'OFF10',
    type: 'PERCENTAGE' as const,
    value: 10,
    isActive: true,
  };

  const couponRow = {
    id: 'c1',
    code: 'OFF10',
    description: null,
    type: 'PERCENTAGE' as const,
    value: 10,
    minOrderAmount: null,
    maxDiscountAmount: null,
    usageLimit: null,
    usageCount: 0,
    perUserLimit: null,
    startsAt: null,
    expiresAt: null,
    isActive: true,
  };

  beforeEach(() => {
    prisma = {
      coupon: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new AdminCouponsService(prisma as unknown as PrismaService);
  });

  describe('findList', () => {
    it('applies the search filter across code and description', async () => {
      prisma.coupon.findMany.mockResolvedValue([]);
      prisma.coupon.count.mockResolvedValue(0);

      await service.findList({ page: 1, pageSize: 20, q: 'off' });

      const [args] = prisma.coupon.findMany.mock.calls[0];
      expect(args.where).toMatchObject({
        OR: [
          { code: { contains: 'off', mode: 'insensitive' } },
          { description: { contains: 'off', mode: 'insensitive' } },
        ],
      });
    });
  });

  describe('create', () => {
    it('throws ConflictException when the code already exists', async () => {
      prisma.coupon.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(input)).rejects.toThrow(ConflictException);
    });

    it('creates the coupon when the code is free', async () => {
      prisma.coupon.findFirst.mockResolvedValue(null);
      prisma.coupon.create.mockResolvedValue(couponRow);

      const result = await service.create(input);
      expect(result.code).toBe('OFF10');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the coupon does not exist', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', input)).rejects.toThrow(NotFoundException);
    });

    it('clears optional fields to null when they are omitted (the reported bug)', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.coupon.findFirst.mockResolvedValue(null);
      prisma.coupon.update.mockResolvedValue(couponRow);

      // The admin cleared "Giảm tối đa" (and other optional fields) — the input
      // arrives with those keys absent. They must be written as explicit null,
      // not dropped as undefined (which Prisma would leave untouched).
      await service.update('c1', input);

      const [args] = prisma.coupon.update.mock.calls[0];
      expect(args.data.maxDiscountAmount).toBeNull();
      expect(args.data.minOrderAmount).toBeNull();
      expect(args.data.usageLimit).toBeNull();
      expect(args.data.perUserLimit).toBeNull();
      expect(args.data.description).toBeNull();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the coupon does not exist', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('hard-deletes an existing coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ id: 'c1' });

      await service.remove('c1');

      expect(prisma.coupon.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });
  });
});
