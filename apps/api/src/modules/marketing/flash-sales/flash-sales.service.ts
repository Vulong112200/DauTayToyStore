import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PublicFlashSale } from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

const ACTIVE_INCLUDE = {
  items: {
    include: {
      product: {
        select: {
          slug: true,
          name: true,
          price: true,
          status: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
        },
      },
    },
  },
} satisfies Prisma.FlashSaleInclude;

type ActiveFlashSaleRow = Prisma.FlashSaleGetPayload<{ include: typeof ACTIVE_INCLUDE }>;

/** Public, read-only counterpart to `AdminFlashSalesService`. Exposes only what a
 * customer-facing "Flash Sale" page needs, and only for sales that are actually
 * running right now (`isActive` + inside the start/end window) — mirroring how
 * `PromotionContextService` decides which flash sales apply to cart pricing, so the
 * page and the cart never disagree about what's on sale. */
@Injectable()
export class FlashSalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(): Promise<PublicFlashSale[]> {
    const now = new Date();
    const flashSales = await this.prisma.flashSale.findMany({
      where: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      orderBy: { endsAt: 'asc' },
      include: ACTIVE_INCLUDE,
    });

    return flashSales
      .map((flashSale) => this.toPublic(flashSale))
      // Drop any sale whose products are all unpublished — nothing worth showing.
      .filter((flashSale) => flashSale.items.length > 0);
  }

  private toPublic(flashSale: ActiveFlashSaleRow): PublicFlashSale {
    const items = flashSale.items
      // A product can be unpublished/archived after being added to a sale — don't
      // surface it (its detail page would 404).
      .filter((item) => item.product.status === 'PUBLISHED')
      .map((item) => {
        const originalPrice = item.product.price;
        const discountPercent =
          originalPrice > 0
            ? Math.round(((originalPrice - item.salePrice) / originalPrice) * 100)
            : 0;
        return {
          productId: item.productId,
          slug: item.product.slug,
          name: item.product.name,
          primaryImageUrl: item.product.images[0]?.url ?? null,
          originalPrice,
          salePrice: item.salePrice,
          discountPercent,
          stockLimit: item.stockLimit,
          soldCount: item.soldCount,
          soldOut: item.stockLimit != null && item.soldCount >= item.stockLimit,
        };
      });

    return {
      id: flashSale.id,
      name: flashSale.name,
      startsAt: flashSale.startsAt.toISOString(),
      endsAt: flashSale.endsAt.toISOString(),
      items,
    };
  }
}
