import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminInventoryItem, AdminInventoryQuery, PaginatedResponse, UpdateInventoryInput } from '@repo/contracts';
import { PrismaService } from '../../infra/prisma/prisma.service';

const PRODUCT_INVENTORY_INCLUDE = {
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  },
} satisfies Prisma.InventoryInclude;

type ProductInventoryRow = Prisma.InventoryGetPayload<{ include: typeof PRODUCT_INVENTORY_INCLUDE }>;

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Phase 3 scope is product-level inventory only — variants aren't used by any
   * seeded/admin-editable product yet (Phase 2 note: variant admin UI is deferred). */
  async findList(query: AdminInventoryQuery): Promise<PaginatedResponse<AdminInventoryItem>> {
    const where: Prisma.InventoryWhereInput = {
      productId: { not: null },
      ...(query.q && {
        product: {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { sku: { contains: query.q, mode: 'insensitive' } },
          ],
        },
      }),
    };

    if (query.lowStockOnly) {
      const rows = await this.prisma.inventory.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: PRODUCT_INVENTORY_INCLUDE,
      });
      const lowStockItems = rows
        .filter((row) => row.product !== null)
        .map((row) => this.toItem(row))
        .filter((item) => item.availableStock <= item.lowStockThreshold);

      const start = (query.page - 1) * query.pageSize;
      return {
        items: lowStockItems.slice(start, start + query.pageSize),
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems: lowStockItems.length,
          totalPages: Math.max(1, Math.ceil(lowStockItems.length / query.pageSize)),
        },
      };
    }

    const [rows, totalItems] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { updatedAt: 'desc' },
        include: PRODUCT_INVENTORY_INCLUDE,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return {
      items: rows.filter((row) => row.product !== null).map((row) => this.toItem(row)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async update(productId: string, input: UpdateInventoryInput): Promise<AdminInventoryItem> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const inventory = await this.prisma.inventory.upsert({
      where: { productId },
      update: {
        quantityOnHand: input.quantityOnHand,
        ...(input.lowStockThreshold !== undefined && { lowStockThreshold: input.lowStockThreshold }),
      },
      create: {
        productId,
        quantityOnHand: input.quantityOnHand,
        lowStockThreshold: input.lowStockThreshold ?? 5,
      },
      include: PRODUCT_INVENTORY_INCLUDE,
    });

    return this.toItem(inventory);
  }

  private toItem(row: ProductInventoryRow): AdminInventoryItem {
    if (!row.product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return {
      productId: row.product.id,
      productName: row.product.name,
      sku: row.product.sku,
      primaryImageUrl: row.product.images[0]?.url ?? null,
      quantityOnHand: row.quantityOnHand,
      quantityReserved: row.quantityReserved,
      availableStock: Math.max(0, row.quantityOnHand - row.quantityReserved),
      lowStockThreshold: row.lowStockThreshold,
    };
  }
}
