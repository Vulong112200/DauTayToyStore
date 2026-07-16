'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { type AdminBanner, type BannerInput, bannerInputSchema } from '@repo/contracts';
import { MediaPicker } from '@/components/admin/media/media-picker';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const POSITION_OPTIONS: { value: BannerInput['position']; label: string }[] = [
  { value: 'HOME_HERO', label: 'Trang chủ - Banner chính' },
  { value: 'HOME_MIDDLE', label: 'Trang chủ - Giữa trang' },
  { value: 'CATEGORY_TOP', label: 'Đầu trang danh mục' },
  { value: 'SIDEBAR', label: 'Thanh bên' },
];

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

export function BannerForm({
  initialValue,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: {
  initialValue?: AdminBanner;
  onSubmit: (input: BannerInput) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BannerInput>({
    resolver: zodResolver(bannerInputSchema),
    defaultValues: initialValue
      ? {
          title: initialValue.title,
          imageUrl: initialValue.imageUrl,
          linkUrl: initialValue.linkUrl ?? undefined,
          position: initialValue.position,
          sortOrder: initialValue.sortOrder,
          isActive: initialValue.isActive,
          startsAt: initialValue.startsAt ?? undefined,
          endsAt: initialValue.endsAt ?? undefined,
        }
      : { position: 'HOME_HERO', sortOrder: 0, isActive: true },
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
          <Label htmlFor="title">Tiêu đề</Label>
          <Input id="title" aria-invalid={!!errors.title} {...register('title')} />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="imageUrl">URL ảnh</Label>
          <Controller
            control={control}
            name="imageUrl"
            render={({ field }) => (
              <MediaPicker value={field.value} onChange={field.onChange} />
            )}
          />
          {errors.imageUrl && (
            <p className="text-xs text-destructive">{errors.imageUrl.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="linkUrl">URL liên kết (tuỳ chọn)</Label>
          <Input id="linkUrl" aria-invalid={!!errors.linkUrl} {...register('linkUrl')} />
          {errors.linkUrl && <p className="text-xs text-destructive">{errors.linkUrl.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="position">Vị trí</Label>
          <select
            id="position"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            {...register('position')}
          >
            {POSITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Thứ tự hiển thị</Label>
          <Input id="sortOrder" type="number" {...register('sortOrder', { valueAsNumber: true })} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="endsAt">Kết thúc (tuỳ chọn)</Label>
          <Input
            id="endsAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(initialValue?.endsAt)}
            {...register('endsAt', dateFieldOptions)}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('isActive')} />
        Đang hoạt động
      </label>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu banner'}
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
