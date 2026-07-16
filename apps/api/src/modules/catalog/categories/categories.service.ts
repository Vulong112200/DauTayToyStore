import { Injectable, NotFoundException } from '@nestjs/common';
import type { Category, CategoryTreeNode } from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

interface CategoryRow {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findTree(): Promise<CategoryTreeNode[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
      },
    });

    return this.buildTree(categories);
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      select: {
        id: true,
        parentId: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
        isActive: true,
      },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    const { isActive: _isActive, ...rest } = category;
    return rest;
  }

  private buildTree(rows: CategoryRow[]): CategoryTreeNode[] {
    const nodesById = new Map<string, CategoryTreeNode>(
      rows.map((row) => [row.id, { ...row, children: [] }]),
    );
    const roots: CategoryTreeNode[] = [];

    for (const row of rows) {
      const node = nodesById.get(row.id) as CategoryTreeNode;
      if (row.parentId && nodesById.has(row.parentId)) {
        nodesById.get(row.parentId)?.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
