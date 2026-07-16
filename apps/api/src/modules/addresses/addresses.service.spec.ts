import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AddressesService } from './addresses.service';

describe('AddressesService', () => {
  let service: AddressesService;
  let prisma: {
    address: {
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };

  const baseAddress = {
    id: 'addr-1',
    userId: 'user-1',
    type: 'SHIPPING',
    recipient: 'Nguyen Van A',
    phone: '0912345678',
    line1: '123 Duong ABC',
    line2: null,
    ward: null,
    district: null,
    province: 'TP.HCM',
    postalCode: null,
    isDefault: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const input = {
    type: 'SHIPPING' as const,
    recipient: 'Nguyen Van A',
    phone: '0912345678',
    line1: '123 Duong ABC',
    province: 'TP.HCM',
  };

  beforeEach(() => {
    prisma = {
      address: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    service = new AddressesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('unsets other default addresses when isDefault is true', async () => {
      prisma.address.create.mockResolvedValue({ ...baseAddress, isDefault: true });

      await service.create('user-1', { ...input, isDefault: true });

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isDefault: false },
      });
    });

    it('does not touch other addresses when isDefault is not set', async () => {
      prisma.address.create.mockResolvedValue(baseAddress);

      await service.create('user-1', input);

      expect(prisma.address.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the address does not belong to the user', async () => {
      prisma.address.findFirst.mockResolvedValue(null);

      await expect(service.update('user-1', 'addr-1', input)).rejects.toThrow(NotFoundException);
    });

    it('unsets other defaults excluding itself when isDefault is true', async () => {
      prisma.address.findFirst.mockResolvedValue({ id: 'addr-1' });
      prisma.address.update.mockResolvedValue({ ...baseAddress, isDefault: true });

      await service.update('user-1', 'addr-1', { ...input, isDefault: true });

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: { not: 'addr-1' } },
        data: { isDefault: false },
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when nothing was deleted', async () => {
      prisma.address.deleteMany.mockResolvedValue({ count: 0 });

      await expect(service.remove('user-1', 'addr-1')).rejects.toThrow(NotFoundException);
    });

    it('succeeds when the address was deleted', async () => {
      prisma.address.deleteMany.mockResolvedValue({ count: 1 });

      await expect(service.remove('user-1', 'addr-1')).resolves.toBeUndefined();
    });
  });
});
