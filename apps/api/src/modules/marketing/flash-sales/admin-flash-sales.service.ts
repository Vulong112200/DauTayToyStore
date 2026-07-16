import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AdminFlashSaleDetail,
  AdminFlashSaleListItem,
  FlashSaleInput,
} from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

const DETAIL_INCLUDE = {
  items: {
    include: { product: { select: { name: true, price: true } } },
  },
} satisfies Prisma.FlashSaleInclude;

type FlashSaleDetailRow = Prisma.FlashSaleGetPayload<{ include: typeof DETAIL_INCLUDE }>;

@Injectable()
export class AdminFlashSalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminFlashSaleListItem[]> {
    const flashSales = await this.prisma.flashSale.findMany({
      orderBy: { startsAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });

    return flashSales.map((flashSale) => ({
      id: flashSale.id,
      name: flashSale.name,
      startsAt: flashSale.startsAt.toISOString(),
      endsAt: flashSale.endsAt.toISOString(),
      isActive: flashSale.isActive,
      itemCount: flashSale._count.items,
    }));
  }

  async findById(id: string): Promise<AdminFlashSaleDetail> {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!flashSale) {
      throw new NotFoundException('Không tìm thấy đợt flash sale');
    }
    return this.toDetail(flashSale);
  }

  async create(input: FlashSaleInput): Promise<AdminFlashSaleDetail> {
    const flashSale = await this.prisma.flashSale.create({
      data: {
        ...this.toBaseData(input),
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            salePrice: item.salePrice,
            stockLimit: item.stockLimit,
          })),
        },
      },
      include: DETAIL_INCLUDE,
    });

    return this.toDetail(flashSale);
  }

  async update(id: string, input: FlashSaleInput): Promise<AdminFlashSaleDetail> {
    await this.ensureExists(id);

    const flashSale = await this.prisma.$transaction(async (tx) => {
      // Replace items wholesale — same rationale as admin-products' nested collections:
      // simplest correct approach for an admin-managed list, avoiding per-row diffing.
      await tx.flashSaleItem.deleteMany({ where: { flashSaleId: id } });

      return tx.flashSale.update({
        where: { id },
        data: {
          ...this.toBaseData(input),
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              salePrice: item.salePrice,
              stockLimit: item.stockLimit,
            })),
          },
        },
        include: DETAIL_INCLUDE,
      });
    });

    return this.toDetail(flashSale);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.flashSale.delete({ where: { id } });
  }

  private toBaseData(input: FlashSaleInput) {
    return {
      name: input.name,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      isActive: input.isActive,
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const flashSale = await this.prisma.flashSale.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!flashSale) {
      throw new NotFoundException('Không tìm thấy đợt flash sale');
    }
  }

  private toDetail(flashSale: FlashSaleDetailRow): AdminFlashSaleDetail {
    return {
      id: flashSale.id,
      name: flashSale.name,
      startsAt: flashSale.startsAt.toISOString(),
      endsAt: flashSale.endsAt.toISOString(),
      isActive: flashSale.isActive,
      items: flashSale.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        originalPrice: item.product.price,
        salePrice: item.salePrice,
        stockLimit: item.stockLimit,
        soldCount: item.soldCount,
      })),
    };
  }
}
