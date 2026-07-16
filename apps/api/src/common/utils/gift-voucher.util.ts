import { BadRequestException } from '@nestjs/common';
import type { GiftVoucher } from '@prisma/client';

/** A voucher is store credit, not a percentage/fixed discount — it can only ever
 * cover up to its remaining balance, never more than what's actually owed. */
export function computeVoucherDiscount(voucher: GiftVoucher, amountOwed: number): number {
  return Math.min(voucher.balance, Math.max(amountOwed, 0));
}

export function assertVoucherUsable(voucher: GiftVoucher): void {
  const now = new Date();
  if (!voucher.isActive) {
    throw new BadRequestException('Phiếu quà tặng không còn hiệu lực');
  }
  if (voucher.expiresAt && now > voucher.expiresAt) {
    throw new BadRequestException('Phiếu quà tặng đã hết hạn');
  }
  if (voucher.balance <= 0) {
    throw new BadRequestException('Phiếu quà tặng đã được sử dụng hết');
  }
}
