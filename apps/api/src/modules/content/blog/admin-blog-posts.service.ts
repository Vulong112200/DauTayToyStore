import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AdminBlogPostDetail,
  AdminBlogPostListItem,
  AdminBlogPostQuery,
  BlogPostInput,
  PaginatedResponse,
} from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

const DETAIL_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  coverImageUrl: true,
  categoryId: true,
  status: true,
  metaTitle: true,
  metaDescription: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BlogPostSelect;

type PostDetailRow = Prisma.BlogPostGetPayload<{ select: typeof DETAIL_SELECT }>;

@Injectable()
export class AdminBlogPostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(query: AdminBlogPostQuery): Promise<PaginatedResponse<AdminBlogPostListItem>> {
    const where: Prisma.BlogPostWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.q && { title: { contains: query.q, mode: 'insensitive' } }),
    };

    const [rows, totalItems] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          publishedAt: true,
          updatedAt: true,
          category: { select: { name: true } },
        },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        categoryName: row.category?.name ?? null,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async findById(id: string): Promise<AdminBlogPostDetail> {
    const post = await this.prisma.blogPost.findUnique({ where: { id }, select: DETAIL_SELECT });
    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }
    return this.toDetail(post);
  }

  async create(input: BlogPostInput): Promise<AdminBlogPostDetail> {
    await this.assertUniqueSlug(input.slug);

    const post = await this.prisma.blogPost.create({
      data: {
        ...this.toBaseData(input),
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      },
      select: DETAIL_SELECT,
    });

    return this.toDetail(post);
  }

  async update(id: string, input: BlogPostInput): Promise<AdminBlogPostDetail> {
    const existing = await this.prisma.blogPost.findUnique({
      where: { id },
      select: { id: true, publishedAt: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    await this.assertUniqueSlug(input.slug, id);

    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...this.toBaseData(input),
        publishedAt:
          input.status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      },
      select: DETAIL_SELECT,
    });

    return this.toDetail(post);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }
    await this.prisma.blogPost.delete({ where: { id } });
  }

  private toBaseData(input: BlogPostInput) {
    return {
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
      coverImageUrl: input.coverImageUrl,
      categoryId: input.categoryId,
      status: input.status,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    };
  }

  private async assertUniqueSlug(slug: string, excludeId?: string): Promise<void> {
    const conflict = await this.prisma.blogPost.findFirst({
      where: { slug, ...(excludeId && { id: { not: excludeId } }) },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Slug đã được sử dụng');
    }
  }

  private toDetail(post: PostDetailRow): AdminBlogPostDetail {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverImageUrl: post.coverImageUrl,
      categoryId: post.categoryId,
      status: post.status,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }
}
