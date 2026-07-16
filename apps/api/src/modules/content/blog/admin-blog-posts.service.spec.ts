import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminBlogPostsService } from './admin-blog-posts.service';

describe('AdminBlogPostsService', () => {
  let service: AdminBlogPostsService;
  let prisma: {
    blogPost: {
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
    title: 'Cách chọn đồ chơi',
    slug: 'cach-chon-do-choi',
    content: 'Nội dung...',
    status: 'DRAFT' as const,
  };

  const postRow = {
    id: 'p1',
    title: 'Cách chọn đồ chơi',
    slug: 'cach-chon-do-choi',
    excerpt: null,
    content: 'Nội dung...',
    coverImageUrl: null,
    categoryId: null,
    status: 'DRAFT' as const,
    metaTitle: null,
    metaDescription: null,
    publishedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    prisma = {
      blogPost: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new AdminBlogPostsService(prisma as unknown as PrismaService);
  });

  describe('findList', () => {
    it('applies the search and status filters', async () => {
      prisma.blogPost.findMany.mockResolvedValue([]);
      prisma.blogPost.count.mockResolvedValue(0);

      await service.findList({ page: 1, pageSize: 20, q: 'chọn', status: 'PUBLISHED' });

      const [args] = prisma.blogPost.findMany.mock.calls[0];
      expect(args.where).toMatchObject({
        status: 'PUBLISHED',
        title: { contains: 'chọn', mode: 'insensitive' },
      });
    });
  });

  describe('create', () => {
    it('throws ConflictException when the slug already exists', async () => {
      prisma.blogPost.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(input)).rejects.toThrow(ConflictException);
    });

    it('stamps publishedAt when created as PUBLISHED', async () => {
      prisma.blogPost.findFirst.mockResolvedValue(null);
      prisma.blogPost.create.mockResolvedValue({ ...postRow, status: 'PUBLISHED' });

      await service.create({ ...input, status: 'PUBLISHED' });

      const [args] = prisma.blogPost.create.mock.calls[0];
      expect(args.data.publishedAt).toBeInstanceOf(Date);
    });

    it('leaves publishedAt null when created as DRAFT', async () => {
      prisma.blogPost.findFirst.mockResolvedValue(null);
      prisma.blogPost.create.mockResolvedValue(postRow);

      await service.create(input);

      const [args] = prisma.blogPost.create.mock.calls[0];
      expect(args.data.publishedAt).toBeNull();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the post does not exist', async () => {
      prisma.blogPost.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', input)).rejects.toThrow(NotFoundException);
    });

    it('does not overwrite an already-set publishedAt', async () => {
      const publishedAt = new Date('2026-02-01');
      prisma.blogPost.findUnique.mockResolvedValue({ id: 'p1', publishedAt });
      prisma.blogPost.findFirst.mockResolvedValue(null);
      prisma.blogPost.update.mockResolvedValue({ ...postRow, status: 'PUBLISHED', publishedAt });

      await service.update('p1', { ...input, status: 'PUBLISHED' });

      const [args] = prisma.blogPost.update.mock.calls[0];
      expect(args.data.publishedAt).toBe(publishedAt);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the post does not exist', async () => {
      prisma.blogPost.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('hard-deletes an existing post', async () => {
      prisma.blogPost.findUnique.mockResolvedValue({ id: 'p1' });

      await service.remove('p1');

      expect(prisma.blogPost.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });
  });
});
