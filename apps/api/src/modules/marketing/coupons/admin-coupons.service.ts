import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AdminCoupon, AdminCouponQuery, CouponInput, PaginatedResponse } from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

const SELECT = {
  id: true,
  code: true,
  description: true,
  type: true,
  value: true,
  minOrderAmount: true,
  maxDiscountAmount: true,
  usageLimit: true,
  usageCount: true,
  perUserLimit: true,
  startsAt: true,
  expiresAt: true,
  isActive: true,
} satisfies Prisma.CouponSelect;

type CouponRow = Prisma.CouponGetPayload<{ select: typeof SELECT }>;

@Injectable()
export class AdminCouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(query: AdminCouponQuery): Promise<PaginatedResponse<AdminCoupon>> {
    const where: Prisma.CouponWhereInput = {
      ...(query.q && {
        OR: [
          { code: { contains: query.q, mode: 'insensitive' } },
          { description: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, totalItems] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toView(row)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async create(input: CouponInput): Promise<AdminCoupon> {
    await this.assertUniqueCode(input.code);

    const coupon = await this.prisma.coupon.create({
      data: this.toBaseData(input),
      select: SELECT,
    });

    return this.toView(coupon);
  }

  async update(id: string, input: CouponInput): Promise<AdminCoupon> {
    await this.ensureExists(id);
    await this.assertUniqueCode(input.code, id);

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: this.toBaseData(input),
      select: SELECT,
    });

    return this.toView(coupon);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.coupon.delete({ where: { id } });
  }

  private toBaseData(input: CouponInput) {
    // Optional fields are coerced `undefined -> null` so that clearing a field
    // in the admin form actually resets it. Prisma treats `undefined` on
    // `.update()` as "leave this column untouched", which would otherwise make
    // it impossible to clear an already-set optional value (e.g. maxDiscountAmount).
    return {
      code: input.code,
      description: input.description ?? null,
      type: input.type,
      value: input.value,
      minOrderAmount: input.minOrderAmount ?? null,
      maxDiscountAmount: input.maxDiscountAmount ?? null,
      usageLimit: input.usageLimit ?? null,
      perUserLimit: input.perUserLimit ?? null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: input.isActive,
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!coupon) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }
  }

  private async assertUniqueCode(code: string, excludeId?: string): Promise<void> {
    const conflict = await this.prisma.coupon.findFirst({
      where: { code, ...(excludeId && { id: { not: excludeId } }) },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Mã giảm giá đã được sử dụng');
    }
  }

  private toView(coupon: CouponRow): AdminCoupon {
    return {
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      minOrderAmount: coupon.minOrderAmount,
      maxDiscountAmount: coupon.maxDiscountAmount,
      usageLimit: coupon.usageLimit,
      usageCount: coupon.usageCount,
      perUserLimit: coupon.perUserLimit,
      startsAt: coupon.startsAt?.toISOString() ?? null,
      expiresAt: coupon.expiresAt?.toISOString() ?? null,
      isActive: coupon.isActive,
    };
  }
}
