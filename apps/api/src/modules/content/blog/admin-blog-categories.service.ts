import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { BlogCategory } from '@prisma/client';
import type { AdminBlogCategory, BlogCategoryInput } from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class AdminBlogCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminBlogCategory[]> {
    const categories = await this.prisma.blogCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: true } } },
    });
    return categories.map((category) => this.toView(category));
  }

  async create(input: BlogCategoryInput): Promise<AdminBlogCategory> {
    await this.assertUniqueSlug(input.slug);

    const category = await this.prisma.blogCategory.create({
      data: { name: input.name, slug: input.slug },
      include: { _count: { select: { posts: true } } },
    });

    return this.toView(category);
  }

  async update(id: string, input: BlogCategoryInput): Promise<AdminBlogCategory> {
    await this.ensureExists(id);
    await this.assertUniqueSlug(input.slug, id);

    const category = await this.prisma.blogCategory.update({
      where: { id },
      data: { name: input.name, slug: input.slug },
      include: { _count: { select: { posts: true } } },
    });

    return this.toView(category);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.blogCategory.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const category = await this.prisma.blogCategory.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục blog');
    }
  }

  private async assertUniqueSlug(slug: string, excludeId?: string): Promise<void> {
    const conflict = await this.prisma.blogCategory.findFirst({
      where: { slug, ...(excludeId && { id: { not: excludeId } }) },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Slug đã được sử dụng');
    }
  }

  private toView(category: BlogCategory & { _count: { posts: number } }): AdminBlogCategory {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      postCount: category._count.posts,
    };
  }
}
