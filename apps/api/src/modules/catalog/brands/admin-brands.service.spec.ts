import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminBrandsService } from './admin-brands.service';

describe('AdminBrandsService', () => {
  let service: AdminBrandsService;
  let prisma: {
    brand: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const input = { name: 'LEGO', slug: 'lego', isActive: true };

  beforeEach(() => {
    prisma = {
      brand: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new AdminBrandsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('throws ConflictException when the slug already exists', async () => {
      prisma.brand.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(input)).rejects.toThrow(ConflictException);
    });

    it('creates the brand when the slug is free', async () => {
      prisma.brand.findFirst.mockResolvedValue(null);
      prisma.brand.create.mockResolvedValue({
        id: 'b1',
        name: 'LEGO',
        slug: 'lego',
        logoUrl: null,
        description: null,
        originCountry: null,
        isActive: true,
      });

      const result = await service.create(input);
      expect(result.slug).toBe('lego');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the brand does not exist', async () => {
      prisma.brand.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
