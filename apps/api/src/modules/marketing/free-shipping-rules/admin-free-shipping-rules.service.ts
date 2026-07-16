import { Injectable, NotFoundException } from '@nestjs/common';
import type { AdminFreeShippingRule, FreeShippingRuleInput } from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class AdminFreeShippingRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminFreeShippingRule[]> {
    const rules = await this.prisma.freeShippingRule.findMany({ orderBy: { createdAt: 'desc' } });
    return rules.map((rule) => this.toView(rule));
  }

  async create(input: FreeShippingRuleInput): Promise<AdminFreeShippingRule> {
    const rule = await this.prisma.freeShippingRule.create({ data: this.toBaseData(input) });
    return this.toView(rule);
  }

  async update(id: string, input: FreeShippingRuleInput): Promise<AdminFreeShippingRule> {
    await this.ensureExists(id);
    const rule = await this.prisma.freeShippingRule.update({
      where: { id },
      data: this.toBaseData(input),
    });
    return this.toView(rule);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.freeShippingRule.delete({ where: { id } });
  }

  private toBaseData(input: FreeShippingRuleInput) {
    return {
      name: input.name,
      minOrderAmount: input.minOrderAmount,
      applicableProvinces: input.applicableProvinces ?? undefined,
      isActive: input.isActive,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const rule = await this.prisma.freeShippingRule.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!rule) {
      throw new NotFoundException('Không tìm thấy quy tắc miễn phí vận chuyển');
    }
  }

  private toView(rule: {
    id: string;
    name: string;
    minOrderAmount: number;
    applicableProvinces: unknown;
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  }): AdminFreeShippingRule {
    return {
      id: rule.id,
      name: rule.name,
      minOrderAmount: rule.minOrderAmount,
      applicableProvinces: Array.isArray(rule.applicableProvinces)
        ? (rule.applicableProvinces as string[])
        : null,
      isActive: rule.isActive,
      startsAt: rule.startsAt?.toISOString() ?? null,
      endsAt: rule.endsAt?.toISOString() ?? null,
    };
  }
}
