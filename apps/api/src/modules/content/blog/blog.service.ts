import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  BlogPostDetail,
  BlogPostListItem,
  PaginatedResponse,
  PaginationQuery,
} from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(query: PaginationQuery): Promise<PaginatedResponse<BlogPostListItem>> {
    const where = { status: 'PUBLISHED' as const };

    const [rows, totalItems] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { category: { select: { name: true } } },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        coverImageUrl: row.coverImageUrl,
        categoryName: row.category?.name ?? null,
        publishedAt: row.publishedAt?.toISOString() ?? null,
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async findBySlug(slug: string): Promise<BlogPostDetail> {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      include: { category: { select: { name: true } } },
    });

    if (!post || post.status !== 'PUBLISHED') {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      content: post.content,
      coverImageUrl: post.coverImageUrl,
      categoryName: post.category?.name ?? null,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      publishedAt: post.publishedAt?.toISOString() ?? null,
    };
  }
}
