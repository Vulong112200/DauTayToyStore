'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type AddressInput, type AddressView, addressInputSchema } from '@repo/contracts';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AddressForm({
  initialValue,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: {
  initialValue?: AddressView;
  onSubmit: (input: AddressInput) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressInputSchema),
    defaultValues: initialValue
      ? {
          type: initialValue.type,
          recipient: initialValue.recipient,
          phone: initialValue.phone,
          line1: initialValue.line1,
          line2: initialValue.line2 ?? undefined,
          ward: initialValue.ward ?? undefined,
          district: initialValue.district ?? undefined,
          province: initialValue.province,
          postalCode: initialValue.postalCode ?? undefined,
          isDefault: initialValue.isDefault,
        }
      : { type: 'SHIPPING' },
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
          <Label htmlFor="recipient">Tên người nhận</Label>
          <Input id="recipient" aria-invalid={!!errors.recipient} {...register('recipient')} />
          {errors.recipient && (
            <p className="text-xs text-destructive">{errors.recipient.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Số điện thoại</Label>
          <Input id="phone" aria-invalid={!!errors.phone} {...register('phone')} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="line1">Địa chỉ</Label>
        <Input id="line1" aria-invalid={!!errors.line1} {...register('line1')} />
        {errors.line1 && <p className="text-xs text-destructive">{errors.line1.message}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ward">Phường/Xã (tuỳ chọn)</Label>
          <Input id="ward" {...register('ward')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="district">Quận/Huyện (tuỳ chọn)</Label>
          <Input id="district" {...register('district')} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="province">Tỉnh/Thành phố</Label>
          <Input id="province" aria-invalid={!!errors.province} {...register('province')} />
          {errors.province && (
            <p className="text-xs text-destructive">{errors.province.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="postalCode">Mã bưu điện (tuỳ chọn)</Label>
          <Input id="postalCode" {...register('postalCode')} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('isDefault')} className="h-4 w-4 rounded border-input" />
        Đặt làm địa chỉ mặc định
      </label>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu địa chỉ'}
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
