import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { BlogService } from './blog.service';

describe('BlogService', () => {
  let service: BlogService;
  let prisma: { blogPost: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = {
      blogPost: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    };
    service = new BlogService(prisma as unknown as PrismaService);
  });

  describe('findList', () => {
    it('maps rows and builds pagination meta', async () => {
      prisma.blogPost.findMany.mockResolvedValue([
        {
          id: 'p1',
          slug: 'bai-viet-1',
          title: 'Bài viết 1',
          excerpt: 'Tóm tắt',
          coverImageUrl: null,
          category: { name: 'Mẹo hay' },
          publishedAt: new Date('2026-02-01'),
        },
      ]);
      prisma.blogPost.count.mockResolvedValue(1);

      const result = await service.findList({ page: 1, pageSize: 20 });

      expect(prisma.blogPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'PUBLISHED' } }),
      );
      expect(result.items).toEqual([
        {
          id: 'p1',
          slug: 'bai-viet-1',
          title: 'Bài viết 1',
          excerpt: 'Tóm tắt',
          coverImageUrl: null,
          categoryName: 'Mẹo hay',
          publishedAt: '2026-02-01T00:00:00.000Z',
        },
      ]);
      expect(result.meta).toEqual({ page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });
    });
  });

  describe('findBySlug', () => {
    it('throws NotFoundException when the post does not exist', async () => {
      prisma.blogPost.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the post is not published', async () => {
      prisma.blogPost.findUnique.mockResolvedValue({ status: 'DRAFT' });

      await expect(service.findBySlug('draft-post')).rejects.toThrow(NotFoundException);
    });

    it('maps a published post to the detail shape', async () => {
      prisma.blogPost.findUnique.mockResolvedValue({
        id: 'p1',
        slug: 'bai-viet-1',
        title: 'Bài viết 1',
        content: '<p>Nội dung</p>',
        coverImageUrl: null,
        category: { name: 'Mẹo hay' },
        metaTitle: null,
        metaDescription: null,
        status: 'PUBLISHED',
        publishedAt: new Date('2026-02-01'),
      });

      const result = await service.findBySlug('bai-viet-1');

      expect(result.categoryName).toBe('Mẹo hay');
      expect(result.publishedAt).toBe('2026-02-01T00:00:00.000Z');
    });
  });
});
