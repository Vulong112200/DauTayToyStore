'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  type AdminFreeShippingRule,
  type FreeShippingRuleInput,
  freeShippingRuleInputSchema,
} from '@repo/contracts';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const provincesFieldOptions = {
  setValueAs: (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    return value
      .split(',')
      .map((province) => province.trim())
      .filter(Boolean);
  },
};

export function FreeShippingRuleForm({
  initialValue,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: {
  initialValue?: AdminFreeShippingRule;
  onSubmit: (input: FreeShippingRuleInput) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FreeShippingRuleInput>({
    resolver: zodResolver(freeShippingRuleInputSchema),
    defaultValues: initialValue
      ? {
          name: initialValue.name,
          minOrderAmount: initialValue.minOrderAmount,
          applicableProvinces: initialValue.applicableProvinces ?? undefined,
          isActive: initialValue.isActive,
        }
      : { isActive: true },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-border p-4"
      noValidate
    >
      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Tên quy tắc</Label>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="minOrderAmount">Đơn tối thiểu (VNĐ)</Label>
          <Input
            id="minOrderAmount"
            type="number"
            aria-invalid={!!errors.minOrderAmount}
            {...register('minOrderAmount', { valueAsNumber: true })}
          />
          {errors.minOrderAmount && (
            <p className="text-xs text-destructive">{errors.minOrderAmount.message}</p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="applicableProvinces">Áp dụng cho tỉnh/thành (tuỳ chọn, phân cách bằng dấu phẩy)</Label>
          <Input
            id="applicableProvinces"
            defaultValue={initialValue?.applicableProvinces?.join(', ')}
            placeholder="TP.HCM, Hà Nội"
            {...register('applicableProvinces', provincesFieldOptions)}
          />
          <p className="text-xs text-muted-foreground">Để trống nghĩa là áp dụng toàn quốc.</p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('isActive')} />
        Đang hoạt động
      </label>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu quy tắc'}
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
