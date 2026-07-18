'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type AdminCoupon, type CouponInput, couponInputSchema } from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function toLocalInputValue(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

const dateFieldOptions = {
  setValueAs: (value: unknown) => {
    if (!value || typeof value !== 'string') return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  },
};

const optionalNumberOptions = {
  setValueAs: (value: unknown) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  },
};

export function CouponForm({
  initialValue,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initialValue?: AdminCoupon;
  onSubmit: (input: CouponInput) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CouponInput>({
    resolver: zodResolver(couponInputSchema),
    defaultValues: initialValue
      ? {
          code: initialValue.code,
          description: initialValue.description ?? undefined,
          type: initialValue.type,
          value: initialValue.value,
          minOrderAmount: initialValue.minOrderAmount ?? undefined,
          maxDiscountAmount: initialValue.maxDiscountAmount ?? undefined,
          usageLimit: initialValue.usageLimit ?? undefined,
          perUserLimit: initialValue.perUserLimit ?? undefined,
          startsAt: initialValue.startsAt ?? undefined,
          expiresAt: initialValue.expiresAt ?? undefined,
          isActive: initialValue.isActive,
        }
      : { type: 'PERCENTAGE', isActive: true },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-border p-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="code">Mã giảm giá</Label>
          <Input
            id="code"
            className="uppercase"
            aria-invalid={!!errors.code}
            {...register('code')}
          />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">Loại giảm giá</Label>
          <select
            id="type"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            {...register('type')}
          >
            <option value="PERCENTAGE">Theo phần trăm (%)</option>
            <option value="FIXED_AMOUNT">Số tiền cố định (VNĐ)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="value">Giá trị</Label>
          <Input
            id="value"
            type="number"
            aria-invalid={!!errors.value}
            {...register('value', { valueAsNumber: true })}
          />
          {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maxDiscountAmount">Giảm tối đa (VNĐ, tuỳ chọn)</Label>
          <Input
            id="maxDiscountAmount"
            type="number"
            {...register('maxDiscountAmount', optionalNumberOptions)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minOrderAmount">Đơn tối thiểu (VNĐ, tuỳ chọn)</Label>
          <Input
            id="minOrderAmount"
            type="number"
            {...register('minOrderAmount', optionalNumberOptions)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="usageLimit">Tổng số lượt dùng (tuỳ chọn)</Label>
          <Input id="usageLimit" type="number" {...register('usageLimit', optionalNumberOptions)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="perUserLimit">Số lượt/khách hàng (tuỳ chọn)</Label>
          <Input
            id="perUserLimit"
            type="number"
            {...register('perUserLimit', optionalNumberOptions)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="startsAt">Bắt đầu (tuỳ chọn)</Label>
          <Input
            id="startsAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(initialValue?.startsAt)}
            {...register('startsAt', dateFieldOptions)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expiresAt">Hết hạn (tuỳ chọn)</Label>
          <Input
            id="expiresAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(initialValue?.expiresAt)}
            {...register('expiresAt', dateFieldOptions)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Mô tả (tuỳ chọn)</Label>
        <Input id="description" {...register('description')} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('isActive')} />
        Đang hoạt động
      </label>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu mã giảm giá'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Huỷ
          </Button>
        )}
      </div>
    </form>
  );
}
