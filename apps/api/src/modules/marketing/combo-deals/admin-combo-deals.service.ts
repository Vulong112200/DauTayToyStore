import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminComboDealDetail, AdminComboDealListItem, ComboDealInput } from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

const DETAIL_INCLUDE = {
  items: {
    include: { product: { select: { name: true, price: true } } },
  },
} satisfies Prisma.ComboDealInclude;

type ComboDealDetailRow = Prisma.ComboDealGetPayload<{ include: typeof DETAIL_INCLUDE }>;

@Injectable()
export class AdminComboDealsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminComboDealListItem[]> {
    const comboDeals = await this.prisma.comboDeal.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { items: true } } },
    });

    return comboDeals.map((comboDeal) => ({
      id: comboDeal.id,
      name: comboDeal.name,
      slug: comboDeal.slug,
      comboPrice: comboDeal.comboPrice,
      isActive: comboDeal.isActive,
      startsAt: comboDeal.startsAt?.toISOString() ?? null,
      endsAt: comboDeal.endsAt?.toISOString() ?? null,
      itemCount: comboDeal._count.items,
    }));
  }

  async findById(id: string): Promise<AdminComboDealDetail> {
    const comboDeal = await this.prisma.comboDeal.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });
    if (!comboDeal) {
      throw new NotFoundException('Không tìm thấy combo');
    }
    return this.toDetail(comboDeal);
  }

  async create(input: ComboDealInput): Promise<AdminComboDealDetail> {
    await this.assertUniqueSlug(input.slug);

    const comboDeal = await this.prisma.comboDeal.create({
      data: {
        ...this.toBaseData(input),
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: DETAIL_INCLUDE,
    });

    return this.toDetail(comboDeal);
  }

  async update(id: string, input: ComboDealInput): Promise<AdminComboDealDetail> {
    await this.ensureExists(id);
    await this.assertUniqueSlug(input.slug, id);

    const comboDeal = await this.prisma.$transaction(async (tx) => {
      // Replace items wholesale — same rationale as admin-products'/admin-flash-sales' nested
      // collections: simplest correct approach for an admin-managed list.
      await tx.comboItem.deleteMany({ where: { comboDealId: id } });

      return tx.comboDeal.update({
        where: { id },
        data: {
          ...this.toBaseData(input),
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: DETAIL_INCLUDE,
      });
    });

    return this.toDetail(comboDeal);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.comboDeal.delete({ where: { id } });
  }

  private toBaseData(input: ComboDealInput) {
    return {
      name: input.name,
      slug: input.slug,
      description: input.description,
      comboPrice: input.comboPrice,
      isActive: input.isActive,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const comboDeal = await this.prisma.comboDeal.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!comboDeal) {
      throw new NotFoundException('Không tìm thấy combo');
    }
  }

  private async assertUniqueSlug(slug: string, excludeId?: string): Promise<void> {
    const conflict = await this.prisma.comboDeal.findFirst({
      where: { slug, ...(excludeId && { id: { not: excludeId } }) },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Slug đã được sử dụng');
    }
  }

  private toDetail(comboDeal: ComboDealDetailRow): AdminComboDealDetail {
    return {
      id: comboDeal.id,
      name: comboDeal.name,
      slug: comboDeal.slug,
      description: comboDeal.description,
      comboPrice: comboDeal.comboPrice,
      isActive: comboDeal.isActive,
      startsAt: comboDeal.startsAt?.toISOString() ?? null,
      endsAt: comboDeal.endsAt?.toISOString() ?? null,
      items: comboDeal.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        unitPrice: item.product.price,
        quantity: item.quantity,
      })),
    };
  }
}
