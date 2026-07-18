import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminGiftVouchersService } from './admin-gift-vouchers.service';

describe('AdminGiftVouchersService', () => {
  let service: AdminGiftVouchersService;
  let prisma: {
    giftVoucher: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const input = { code: 'GIFT100K', amount: 100_000, isActive: true };

  const voucherRow = {
    id: 'v1',
    code: 'GIFT100K',
    amount: 100_000,
    balance: 100_000,
    isActive: true,
    recipientEmail: null,
    expiresAt: null,
    redeemedAt: null,
  };

  beforeEach(() => {
    prisma = {
      giftVoucher: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new AdminGiftVouchersService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('throws ConflictException when the code already exists', async () => {
      prisma.giftVoucher.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(input)).rejects.toThrow(ConflictException);
    });

    it('sets the initial balance equal to the amount', async () => {
      prisma.giftVoucher.findUnique.mockResolvedValue(null);
      prisma.giftVoucher.create.mockResolvedValue(voucherRow);

      await service.create(input);

      const [args] = prisma.giftVoucher.create.mock.calls[0];
      expect(args.data.balance).toBe(100_000);
      expect(args.data.amount).toBe(100_000);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the voucher does not exist', async () => {
      prisma.giftVoucher.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { balance: 50_000 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('only writes fields that were actually provided', async () => {
      prisma.giftVoucher.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.giftVoucher.update.mockResolvedValue({ ...voucherRow, balance: 50_000 });

      await service.update('v1', { balance: 50_000 });

      expect(prisma.giftVoucher.update).toHaveBeenCalledWith({
        where: { id: 'v1' },
        data: { balance: 50_000 },
        select: expect.any(Object),
      });
    });

    it('clears expiresAt to null (not epoch) when passed null', async () => {
      prisma.giftVoucher.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.giftVoucher.update.mockResolvedValue(voucherRow);

      await service.update('v1', { expiresAt: null });

      const [args] = prisma.giftVoucher.update.mock.calls[0];
      expect(args.data).toEqual({ expiresAt: null });
    });

    it('clears recipientEmail when passed null', async () => {
      prisma.giftVoucher.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.giftVoucher.update.mockResolvedValue(voucherRow);

      await service.update('v1', { recipientEmail: null });

      const [args] = prisma.giftVoucher.update.mock.calls[0];
      expect(args.data).toEqual({ recipientEmail: null });
    });

    it('converts a provided expiresAt string into a Date', async () => {
      prisma.giftVoucher.findUnique.mockResolvedValue({ id: 'v1' });
      prisma.giftVoucher.update.mockResolvedValue(voucherRow);

      await service.update('v1', { expiresAt: '2026-12-31T00:00:00.000Z' });

      const [args] = prisma.giftVoucher.update.mock.calls[0];
      expect(args.data.expiresAt).toEqual(new Date('2026-12-31T00:00:00.000Z'));
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the voucher does not exist', async () => {
      prisma.giftVoucher.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('hard-deletes an existing voucher', async () => {
      prisma.giftVoucher.findUnique.mockResolvedValue({ id: 'v1' });

      await service.remove('v1');

      expect(prisma.giftVoucher.delete).toHaveBeenCalledWith({ where: { id: 'v1' } });
    });
  });

  describe('findList', () => {
    it('applies the search filter across code and recipientEmail', async () => {
      prisma.giftVoucher.findMany.mockResolvedValue([]);
      prisma.giftVoucher.count.mockResolvedValue(0);

      await service.findList({ page: 1, pageSize: 20, q: 'gift' });

      const [args] = prisma.giftVoucher.findMany.mock.calls[0];
      expect(args.where).toMatchObject({
        OR: [
          { code: { contains: 'gift', mode: 'insensitive' } },
          { recipientEmail: { contains: 'gift', mode: 'insensitive' } },
        ],
      });
    });
  });
});
