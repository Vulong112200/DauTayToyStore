import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AdminBuyXGetYRule, BuyXGetYRuleInput } from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class AdminBuyXGetYRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminBuyXGetYRule[]> {
    const rules = await this.prisma.buyXGetYRule.findMany({ orderBy: { createdAt: 'desc' } });
    return this.toViews(rules);
  }

  async create(input: BuyXGetYRuleInput): Promise<AdminBuyXGetYRule> {
    await this.assertProductsExist(input.buyProductId, input.getProductId);

    const rule = await this.prisma.buyXGetYRule.create({ data: this.toBaseData(input) });
    return this.toView(rule, await this.getProductNames([rule.buyProductId, rule.getProductId]));
  }

  async update(id: string, input: BuyXGetYRuleInput): Promise<AdminBuyXGetYRule> {
    await this.ensureExists(id);
    await this.assertProductsExist(input.buyProductId, input.getProductId);

    const rule = await this.prisma.buyXGetYRule.update({
      where: { id },
      data: this.toBaseData(input),
    });
    return this.toView(rule, await this.getProductNames([rule.buyProductId, rule.getProductId]));
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.buyXGetYRule.delete({ where: { id } });
  }

  private toBaseData(input: BuyXGetYRuleInput) {
    return {
      name: input.name,
      buyProductId: input.buyProductId,
      buyQuantity: input.buyQuantity,
      getProductId: input.getProductId,
      getQuantity: input.getQuantity,
      discountPercent: input.discountPercent,
      isActive: input.isActive,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const rule = await this.prisma.buyXGetYRule.findUnique({ where: { id }, select: { id: true } });
    if (!rule) {
      throw new NotFoundException('Không tìm thấy chương trình mua X tặng Y');
    }
  }

  /** buyProductId/getProductId are plain scalars (no FK in the schema), so referential
   * integrity has to be checked at the application level instead of relying on the DB. */
  private async assertProductsExist(buyProductId: string, getProductId: string): Promise<void> {
    const products = await this.prisma.product.findMany({
      where: { id: { in: [buyProductId, getProductId] } },
      select: { id: true },
    });
    const foundIds = new Set(products.map((product) => product.id));

    if (!foundIds.has(buyProductId) || !foundIds.has(getProductId)) {
      throw new BadRequestException('Sản phẩm "mua" hoặc "tặng" không tồn tại');
    }
  }

  private async getProductNames(ids: string[]): Promise<Map<string, string>> {
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(products.map((product) => [product.id, product.name]));
  }

  private async toViews(
    rules: {
      id: string;
      name: string;
      buyProductId: string;
      buyQuantity: number;
      getProductId: string;
      getQuantity: number;
      discountPercent: number;
      isActive: boolean;
      startsAt: Date | null;
      endsAt: Date | null;
    }[],
  ): Promise<AdminBuyXGetYRule[]> {
    const allProductIds = rules.flatMap((rule) => [rule.buyProductId, rule.getProductId]);
    const nameById = await this.getProductNames(allProductIds);
    return rules.map((rule) => this.toView(rule, nameById));
  }

  private toView(
    rule: {
      id: string;
      name: string;
      buyProductId: string;
      buyQuantity: number;
      getProductId: string;
      getQuantity: number;
      discountPercent: number;
      isActive: boolean;
      startsAt: Date | null;
      endsAt: Date | null;
    },
    nameById: Map<string, string>,
  ): AdminBuyXGetYRule {
    return {
      id: rule.id,
      name: rule.name,
      buyProductId: rule.buyProductId,
      buyProductName: nameById.get(rule.buyProductId) ?? '(Sản phẩm đã bị xoá)',
      buyQuantity: rule.buyQuantity,
      getProductId: rule.getProductId,
      getProductName: nameById.get(rule.getProductId) ?? '(Sản phẩm đã bị xoá)',
      getQuantity: rule.getQuantity,
      discountPercent: rule.discountPercent,
      isActive: rule.isActive,
      startsAt: rule.startsAt?.toISOString() ?? null,
      endsAt: rule.endsAt?.toISOString() ?? null,
    };
  }
}
