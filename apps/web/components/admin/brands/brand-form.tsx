'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { type AdminBrand, type BrandInput, brandInputSchema } from '@repo/contracts';
import { MediaPicker } from '@/components/admin/media/media-picker';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function BrandForm({
  initialValue,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: {
  initialValue?: AdminBrand;
  onSubmit: (input: BrandInput) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BrandInput>({
    resolver: zodResolver(brandInputSchema),
    defaultValues: initialValue
      ? {
          name: initialValue.name,
          slug: initialValue.slug,
          logoUrl: initialValue.logoUrl ?? undefined,
          description: initialValue.description ?? undefined,
          originCountry: initialValue.originCountry ?? undefined,
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
          <Label htmlFor="name">Tên thương hiệu</Label>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" aria-invalid={!!errors.slug} {...register('slug')} />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="logoUrl">URL logo (tuỳ chọn)</Label>
          <Controller
            control={control}
            name="logoUrl"
            render={({ field }) => (
              <MediaPicker value={field.value} onChange={field.onChange} />
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="originCountry">Xuất xứ (tuỳ chọn)</Label>
          <Input id="originCountry" {...register('originCountry')} />
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
          {isSubmitting ? 'Đang lưu...' : 'Lưu thương hiệu'}
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
