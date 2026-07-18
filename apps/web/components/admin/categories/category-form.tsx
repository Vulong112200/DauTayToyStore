'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { type AdminCategory, type CategoryInput, categoryInputSchema } from '@repo/contracts';
import { MediaPicker } from '@/components/admin/media/media-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CategoryForm({
  initialValue,
  categories,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  initialValue?: AdminCategory;
  categories: AdminCategory[];
  onSubmit: (input: CategoryInput) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: initialValue
      ? {
          parentId: initialValue.parentId ?? undefined,
          name: initialValue.name,
          slug: initialValue.slug,
          description: initialValue.description ?? undefined,
          imageUrl: initialValue.imageUrl ?? undefined,
          sortOrder: initialValue.sortOrder,
          isActive: initialValue.isActive,
          metaTitle: initialValue.metaTitle ?? undefined,
          metaDescription: initialValue.metaDescription ?? undefined,
        }
      : { sortOrder: 0, isActive: true },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-border p-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Tên danh mục</Label>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" aria-invalid={!!errors.slug} {...register('slug')} />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="parentId">Danh mục cha (tuỳ chọn)</Label>
        <select
          id="parentId"
          className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
          {...register('parentId')}
        >
          <option value="">-- Không có --</option>
          {categories
            .filter((category) => category.id !== initialValue?.id)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Mô tả (tuỳ chọn)</Label>
        <Input id="description" {...register('description')} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="imageUrl">Ảnh danh mục (tuỳ chọn)</Label>
        <Controller
          control={control}
          name="imageUrl"
          render={({ field }) => <MediaPicker value={field.value} onChange={field.onChange} />}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Thứ tự hiển thị</Label>
          <Input
            id="sortOrder"
            type="number"
            {...register('sortOrder', { setValueAs: (value) => (value === '' ? 0 : Number(value)) })}
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('isActive')} />
          Đang hoạt động
        </label>
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu danh mục'}
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
