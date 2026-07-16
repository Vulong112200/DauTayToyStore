import { BadRequestException } from '@nestjs/common';
import type { Coupon } from '@prisma/client';
import {
  assertCouponGloballyUsable,
  assertCouponUserUsable,
  computeCouponDiscount,
} from './coupon.util';

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'c1',
    code: 'OFF10',
    description: null,
    type: 'PERCENTAGE',
    value: 10,
    minOrderAmount: null,
    maxDiscountAmount: null,
    usageLimit: null,
    usageCount: 0,
    perUserLimit: null,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Coupon;
}

describe('computeCouponDiscount', () => {
  it('computes a percentage discount', () => {
    expect(computeCouponDiscount(makeCoupon({ type: 'PERCENTAGE', value: 10 }), 200_000)).toBe(
      20_000,
    );
  });

  it('caps a percentage discount at maxDiscountAmount', () => {
    const coupon = makeCoupon({ type: 'PERCENTAGE', value: 50, maxDiscountAmount: 30_000 });
    expect(computeCouponDiscount(coupon, 200_000)).toBe(30_000);
  });

  it('computes a fixed amount discount', () => {
    expect(computeCouponDiscount(makeCoupon({ type: 'FIXED_AMOUNT', value: 20_000 }), 200_000)).toBe(
      20_000,
    );
  });

  it('caps a fixed amount discount so it never exceeds the subtotal', () => {
    const coupon = makeCoupon({ type: 'FIXED_AMOUNT', value: 500_000 });
    expect(computeCouponDiscount(coupon, 100_000)).toBe(100_000);
  });
});

describe('assertCouponGloballyUsable', () => {
  it('throws when the coupon is inactive', () => {
    expect(() => assertCouponGloballyUsable(makeCoupon({ isActive: false }), 100_000)).toThrow(
      BadRequestException,
    );
  });

  it('throws when the coupon has not started yet', () => {
    const coupon = makeCoupon({ startsAt: new Date(Date.now() + 86_400_000) });
    expect(() => assertCouponGloballyUsable(coupon, 100_000)).toThrow(BadRequestException);
  });

  it('throws when the coupon has expired', () => {
    const coupon = makeCoupon({ expiresAt: new Date(Date.now() - 86_400_000) });
    expect(() => assertCouponGloballyUsable(coupon, 100_000)).toThrow(BadRequestException);
  });

  it('throws when the subtotal is below minOrderAmount', () => {
    const coupon = makeCoupon({ minOrderAmount: 500_000 });
    expect(() => assertCouponGloballyUsable(coupon, 100_000)).toThrow(BadRequestException);
  });

  it('throws when the usage limit has been reached', () => {
    const coupon = makeCoupon({ usageLimit: 5, usageCount: 5 });
    expect(() => assertCouponGloballyUsable(coupon, 100_000)).toThrow(BadRequestException);
  });

  it('does not throw for a fully usable coupon', () => {
    expect(() => assertCouponGloballyUsable(makeCoupon(), 100_000)).not.toThrow();
  });
});

describe('assertCouponUserUsable', () => {
  it('throws when the user has already reached perUserLimit', () => {
    expect(() => assertCouponUserUsable(makeCoupon({ perUserLimit: 1 }), 1)).toThrow(
      BadRequestException,
    );
  });

  it('does not throw when under the per-user limit', () => {
    expect(() => assertCouponUserUsable(makeCoupon({ perUserLimit: 2 }), 1)).not.toThrow();
  });

  it('does not throw when there is no per-user limit', () => {
    expect(() => assertCouponUserUsable(makeCoupon({ perUserLimit: null }), 999)).not.toThrow();
  });
});
