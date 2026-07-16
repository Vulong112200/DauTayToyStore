import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminCategoriesService } from './admin-categories.service';

describe('AdminCategoriesService', () => {
  let service: AdminCategoriesService;
  let prisma: {
    category: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const input = {
    name: 'Đồ chơi lắp ráp',
    slug: 'do-choi-lap-rap',
    sortOrder: 0,
    isActive: true,
  };

  beforeEach(() => {
    prisma = {
      category: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new AdminCategoriesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('throws ConflictException when the slug already exists', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(input)).rejects.toThrow(ConflictException);
    });

    it('creates the category when the slug is free', async () => {
      prisma.category.findFirst.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({
        id: 'c1',
        parentId: null,
        name: input.name,
        slug: input.slug,
        description: null,
        imageUrl: null,
        sortOrder: 0,
        isActive: true,
        metaTitle: null,
        metaDescription: null,
      });

      const result = await service.create(input);
      expect(result.slug).toBe('do-choi-lap-rap');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', input)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes the category when it exists', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.category.delete.mockResolvedValue({});

      await service.remove('c1');

      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });
  });
});
