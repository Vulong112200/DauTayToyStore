import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Category } from '@prisma/client';
import type { AdminCategory, CategoryInput } from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class AdminCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminCategory[]> {
    const categories = await this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
    return categories.map((category) => this.toView(category));
  }

  async create(input: CategoryInput): Promise<AdminCategory> {
    await this.assertUniqueSlug(input.slug);

    const category = await this.prisma.category.create({
      data: {
        parentId: input.parentId,
        name: input.name,
        slug: input.slug,
        description: input.description,
        imageUrl: input.imageUrl,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
      },
    });

    return this.toView(category);
  }

  async update(id: string, input: CategoryInput): Promise<AdminCategory> {
    await this.ensureExists(id);
    await this.assertUniqueSlug(input.slug, id);

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        parentId: input.parentId ?? null,
        name: input.name,
        slug: input.slug,
        // `?? null` so clearing an optional field in the form resets it —
        // Prisma treats `undefined` on `.update()` as "leave untouched".
        description: input.description ?? null,
        imageUrl: input.imageUrl ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
      },
    });

    return this.toView(category);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.category.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }
  }

  private async assertUniqueSlug(slug: string, excludeId?: string): Promise<void> {
    const conflict = await this.prisma.category.findFirst({
      where: { slug, ...(excludeId && { id: { not: excludeId } }) },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Slug đã được sử dụng');
    }
  }

  private toView(category: Category): AdminCategory {
    return {
      id: category.id,
      parentId: category.parentId,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      metaTitle: category.metaTitle,
      metaDescription: category.metaDescription,
    };
  }
}
