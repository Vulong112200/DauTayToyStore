import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AdminGiftVoucher,
  AdminGiftVoucherQuery,
  GiftVoucherInput,
  PaginatedResponse,
  UpdateGiftVoucherInput,
} from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

const SELECT = {
  id: true,
  code: true,
  amount: true,
  balance: true,
  isActive: true,
  recipientEmail: true,
  expiresAt: true,
  redeemedAt: true,
} satisfies Prisma.GiftVoucherSelect;

type GiftVoucherRow = Prisma.GiftVoucherGetPayload<{ select: typeof SELECT }>;

@Injectable()
export class AdminGiftVouchersService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(query: AdminGiftVoucherQuery): Promise<PaginatedResponse<AdminGiftVoucher>> {
    const where: Prisma.GiftVoucherWhereInput = {
      ...(query.q && {
        OR: [
          { code: { contains: query.q, mode: 'insensitive' } },
          { recipientEmail: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, totalItems] = await Promise.all([
      this.prisma.giftVoucher.findMany({
        where,
        select: SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.giftVoucher.count({ where }),
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

  async create(input: GiftVoucherInput): Promise<AdminGiftVoucher> {
    await this.assertUniqueCode(input.code);

    const voucher = await this.prisma.giftVoucher.create({
      data: {
        code: input.code,
        amount: input.amount,
        balance: input.amount,
        recipientEmail: input.recipientEmail,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        isActive: input.isActive,
      },
      select: SELECT,
    });

    return this.toView(voucher);
  }

  async update(id: string, input: UpdateGiftVoucherInput): Promise<AdminGiftVoucher> {
    await this.ensureExists(id);

    const voucher = await this.prisma.giftVoucher.update({
      where: { id },
      data: {
        ...(input.balance !== undefined && { balance: input.balance }),
        ...(input.recipientEmail !== undefined && { recipientEmail: input.recipientEmail }),
        ...(input.expiresAt !== undefined && { expiresAt: new Date(input.expiresAt) }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: SELECT,
    });

    return this.toView(voucher);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.giftVoucher.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const voucher = await this.prisma.giftVoucher.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!voucher) {
      throw new NotFoundException('Không tìm thấy phiếu quà tặng');
    }
  }

  private async assertUniqueCode(code: string): Promise<void> {
    const conflict = await this.prisma.giftVoucher.findUnique({
      where: { code },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Mã phiếu quà tặng đã được sử dụng');
    }
  }

  private toView(voucher: GiftVoucherRow): AdminGiftVoucher {
    return {
      id: voucher.id,
      code: voucher.code,
      amount: voucher.amount,
      balance: voucher.balance,
      isActive: voucher.isActive,
      recipientEmail: voucher.recipientEmail,
      expiresAt: voucher.expiresAt?.toISOString() ?? null,
      redeemedAt: voucher.redeemedAt?.toISOString() ?? null,
    };
  }
}
