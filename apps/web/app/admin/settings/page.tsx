'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type UpdateSiteSettingsInput, updateSiteSettingsSchema } from '@repo/contracts';
import { AdminQueryError } from '@/components/admin/admin-query-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminSettings, useUpdateSettings } from '@/hooks/use-admin-settings';

const numberFieldOptions = {
  setValueAs: (value: unknown) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  },
};

export default function AdminSettingsPage() {
  const { data: settings, isLoading, isError, error: queryError, refetch } = useAdminSettings();
  const updateSettings = useUpdateSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateSiteSettingsInput>({
    resolver: zodResolver(updateSiteSettingsSchema),
    values: settings,
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await updateSettings.mutateAsync(values);
      reset(values);
    } catch {
      // Success/error toast is surfaced by the mutation hook.
    }
  });

  if (isError) {
    return <AdminQueryError error={queryError} onRetry={() => refetch()} />;
  }

  if (isLoading || !settings) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Cấu hình cửa hàng</h1>

      <form onSubmit={onSubmit} className="max-w-2xl space-y-6" noValidate>
        <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="siteName">Tên cửa hàng</Label>
            <Input id="siteName" aria-invalid={!!errors.siteName} {...register('siteName')} />
            {errors.siteName && (
              <p className="text-xs text-destructive">{errors.siteName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactEmail">Email liên hệ (tuỳ chọn)</Label>
            <Input
              id="contactEmail"
              type="email"
              aria-invalid={!!errors.contactEmail}
              {...register('contactEmail')}
            />
            {errors.contactEmail && (
              <p className="text-xs text-destructive">{errors.contactEmail.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactPhone">Số điện thoại liên hệ (tuỳ chọn)</Label>
            <Input
              id="contactPhone"
              aria-invalid={!!errors.contactPhone}
              {...register('contactPhone')}
            />
            {errors.contactPhone && (
              <p className="text-xs text-destructive">{errors.contactPhone.message}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="facebookUrl">URL Facebook (tuỳ chọn)</Label>
            <Input
              id="facebookUrl"
              aria-invalid={!!errors.facebookUrl}
              {...register('facebookUrl')}
            />
            {errors.facebookUrl && (
              <p className="text-xs text-destructive">{errors.facebookUrl.message}</p>
            )}
          </div>
        </section>

        <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="freeShippingThreshold">Miễn phí ship từ (VNĐ)</Label>
            <Input
              id="freeShippingThreshold"
              type="number"
              {...register('freeShippingThreshold', numberFieldOptions)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="flatShippingFee">Phí ship mặc định (VNĐ)</Label>
            <Input
              id="flatShippingFee"
              type="number"
              {...register('flatShippingFee', numberFieldOptions)}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Áp dụng ngay cho phần tính phí vận chuyển khi khách đặt hàng.
          </p>
        </section>

        <Button type="submit" disabled={updateSettings.isPending}>
          {updateSettings.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
        </Button>
      </form>
    </div>
  );
}
