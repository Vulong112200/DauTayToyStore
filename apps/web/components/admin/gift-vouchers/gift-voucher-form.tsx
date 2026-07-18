'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  type AdminGiftVoucher,
  type GiftVoucherInput,
  type UpdateGiftVoucherInput,
  giftVoucherInputSchema,
  updateGiftVoucherInputSchema,
} from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const dateFieldOptions = {
  // Empty/invalid input becomes `null` (an explicit request to clear "hết hạn"),
  // not `undefined` — otherwise the cleared field is dropped and the old expiry
  // is silently kept on save.
  setValueAs: (value: unknown) => {
    if (!value || typeof value !== 'string') return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  },
};

export function GiftVoucherCreateForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  onSubmit: (input: GiftVoucherInput) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GiftVoucherInput>({
    resolver: zodResolver(giftVoucherInputSchema),
    defaultValues: { isActive: true },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-border p-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="code">Mã phiếu</Label>
          <Input id="code" className="uppercase" aria-invalid={!!errors.code} {...register('code')} />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="amount">Giá trị (VNĐ)</Label>
          <Input
            id="amount"
            type="number"
            aria-invalid={!!errors.amount}
            {...register('amount', { valueAsNumber: true })}
          />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recipientEmail">Email người nhận (tuỳ chọn)</Label>
          <Input id="recipientEmail" type="email" {...register('recipientEmail')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expiresAt">Hết hạn (tuỳ chọn)</Label>
          <Input id="expiresAt" type="datetime-local" {...register('expiresAt', dateFieldOptions)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('isActive')} />
        Đang hoạt động
      </label>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Tạo phiếu quà tặng'}
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

function toLocalInputValue(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function GiftVoucherEditForm({
  voucher,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  voucher: AdminGiftVoucher;
  onSubmit: (input: UpdateGiftVoucherInput) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateGiftVoucherInput>({
    resolver: zodResolver(updateGiftVoucherInputSchema),
    defaultValues: {
      balance: voucher.balance,
      recipientEmail: voucher.recipientEmail ?? undefined,
      expiresAt: voucher.expiresAt ?? undefined,
      isActive: voucher.isActive,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-border p-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="balance">Số dư còn lại (VNĐ)</Label>
          <Input
            id="balance"
            type="number"
            aria-invalid={!!errors.balance}
            {...register('balance', { valueAsNumber: true })}
          />
          {errors.balance && <p className="text-xs text-destructive">{errors.balance.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recipientEmail">Email người nhận (tuỳ chọn)</Label>
          <Input id="recipientEmail" type="email" {...register('recipientEmail')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expiresAt">Hết hạn (tuỳ chọn)</Label>
          <Input
            id="expiresAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(voucher.expiresAt)}
            {...register('expiresAt', dateFieldOptions)}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('isActive')} />
        Đang hoạt động
      </label>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Huỷ
        </Button>
      </div>
    </form>
  );
}
