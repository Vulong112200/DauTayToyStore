import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminBlogCategoriesService } from './admin-blog-categories.service';

describe('AdminBlogCategoriesService', () => {
  let service: AdminBlogCategoriesService;
  let prisma: {
    blogCategory: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const input = { name: 'Mẹo hay', slug: 'meo-hay' };

  beforeEach(() => {
    prisma = {
      blogCategory: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new AdminBlogCategoriesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('throws ConflictException when the slug already exists', async () => {
      prisma.blogCategory.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(input)).rejects.toThrow(ConflictException);
    });

    it('creates the category when the slug is free', async () => {
      prisma.blogCategory.findFirst.mockResolvedValue(null);
      prisma.blogCategory.create.mockResolvedValue({
        id: 'c1',
        name: 'Mẹo hay',
        slug: 'meo-hay',
        _count: { posts: 0 },
      });

      const result = await service.create(input);
      expect(result).toEqual({ id: 'c1', name: 'Mẹo hay', slug: 'meo-hay', postCount: 0 });
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the category does not exist', async () => {
      prisma.blogCategory.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', input)).rejects.toThrow(NotFoundException);
    });

    it('excludes itself from the slug conflict check', async () => {
      prisma.blogCategory.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.blogCategory.findFirst.mockResolvedValue(null);
      prisma.blogCategory.update.mockResolvedValue({
        id: 'c1',
        name: 'Mẹo hay',
        slug: 'meo-hay',
        _count: { posts: 2 },
      });

      await service.update('c1', input);

      expect(prisma.blogCategory.findFirst).toHaveBeenCalledWith({
        where: { slug: 'meo-hay', id: { not: 'c1' } },
        select: { id: true },
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the category does not exist', async () => {
      prisma.blogCategory.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('hard-deletes an existing category', async () => {
      prisma.blogCategory.findUnique.mockResolvedValue({ id: 'c1' });

      await service.remove('c1');

      expect(prisma.blogCategory.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });
  });
});
