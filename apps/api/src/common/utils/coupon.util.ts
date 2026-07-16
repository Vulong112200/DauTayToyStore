import { BadRequestException } from '@nestjs/common';
import type { Coupon } from '@prisma/client';

export function computeCouponDiscount(coupon: Coupon, subtotal: number): number {
  if (coupon.type === 'PERCENTAGE') {
    const raw = Math.floor((subtotal * coupon.value) / 100);
    return coupon.maxDiscountAmount ? Math.min(raw, coupon.maxDiscountAmount) : raw;
  }
  return Math.min(coupon.value, subtotal);
}

/** Constraints independent of who's using the coupon: active window, and order-level minimums/limits. */
export function assertCouponGloballyUsable(coupon: Coupon, subtotal: number): void {
  const now = new Date();
  if (!coupon.isActive) {
    throw new BadRequestException('Mã giảm giá không còn hiệu lực');
  }
  if (coupon.startsAt && now < coupon.startsAt) {
    throw new BadRequestException('Mã giảm giá chưa bắt đầu áp dụng');
  }
  if (coupon.expiresAt && now > coupon.expiresAt) {
    throw new BadRequestException('Mã giảm giá đã hết hạn');
  }
  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    throw new BadRequestException(
      `Đơn hàng cần tối thiểu ${coupon.minOrderAmount.toLocaleString('vi-VN')}đ để áp dụng mã này`,
    );
  }
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
  }
}

/** Per-user usage cap — only enforceable for identified (logged-in) users; guest
 * carts have no stable identity to count past orders against, so this check is
 * skipped for guests (documented gap, same shape as other guest-checkout tradeoffs). */
export function assertCouponUserUsable(coupon: Coupon, usedByUserCount: number): void {
  if (coupon.perUserLimit && usedByUserCount >= coupon.perUserLimit) {
    throw new BadRequestException('Bạn đã sử dụng hết lượt cho mã giảm giá này');
  }
}
