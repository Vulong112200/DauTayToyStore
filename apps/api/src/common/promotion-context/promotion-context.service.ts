import { Injectable } from '@nestjs/common';
import type {
  ActiveBuyXGetYRule,
  ActiveComboDeal,
  ActiveFlashSaleItem,
  ActiveFreeShippingRule,
} from '../utils/promotion-engine.util';
import { PrismaService } from '../../infra/prisma/prisma.service';

/**
 * Centralizes "what promotions are live right now" so CartService (live preview) and
 * OrdersService (checkout) run the exact same promotion engine against the exact same data —
 * a cart total and the order it turns into can never disagree on which promotions applied.
 */
@Injectable()
export class PromotionContextService {
  constructor(private readonly prisma: PrismaService) {}

  async loadFlashSaleItems(productIds: string[]): Promise<ActiveFlashSaleItem[]> {
    if (productIds.length === 0) return [];

    const now = new Date();
    const items = await this.prisma.flashSaleItem.findMany({
      where: {
        productId: { in: productIds },
        flashSale: { isActive: true, startsAt: { lte: now }, endsAt: { gte: now } },
      },
      select: { productId: true, salePrice: true, stockLimit: true, soldCount: true },
    });

    return items.map((item) => ({
      productId: item.productId,
      salePrice: item.salePrice,
      remainingStock: item.stockLimit === null ? null : item.stockLimit - item.soldCount,
    }));
  }

  async loadComboDeals(): Promise<ActiveComboDeal[]> {
    const now = new Date();
    const combos = await this.prisma.comboDeal.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      include: { items: { select: { productId: true, quantity: true } } },
    });

    return combos.map((combo) => ({
      id: combo.id,
      name: combo.name,
      comboPrice: combo.comboPrice,
      items: combo.items,
    }));
  }

  async loadBuyXGetYRules(): Promise<ActiveBuyXGetYRule[]> {
    const now = new Date();
    const rules = await this.prisma.buyXGetYRule.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
    });

    return rules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      buyProductId: rule.buyProductId,
      buyQuantity: rule.buyQuantity,
      getProductId: rule.getProductId,
      getQuantity: rule.getQuantity,
      discountPercent: rule.discountPercent,
    }));
  }

  async loadFreeShippingRules(): Promise<ActiveFreeShippingRule[]> {
    const now = new Date();
    const rules = await this.prisma.freeShippingRule.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
    });

    return rules.map((rule) => ({
      id: rule.id,
      minOrderAmount: rule.minOrderAmount,
      applicableProvinces: Array.isArray(rule.applicableProvinces)
        ? (rule.applicableProvinces as string[])
        : null,
    }));
  }
}
