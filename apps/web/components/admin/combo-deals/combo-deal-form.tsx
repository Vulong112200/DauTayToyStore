'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { type AdminComboDealDetail, type ComboDealInput, comboDealInputSchema } from '@repo/contracts';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminProducts } from '@/hooks/use-admin-products';
import { useCreateComboDeal, useUpdateComboDeal } from '@/hooks/use-admin-combo-deals';
import { ApiError } from '@/lib/api-client';

function toDefaultValues(comboDeal?: AdminComboDealDetail): ComboDealInput {
  if (!comboDeal) {
    return { name: '', slug: '', comboPrice: 0, isActive: true, items: [] };
  }

  return {
    name: comboDeal.name,
    slug: comboDeal.slug,
    description: comboDeal.description ?? undefined,
    comboPrice: comboDeal.comboPrice,
    isActive: comboDeal.isActive,
    startsAt: comboDeal.startsAt ?? undefined,
    endsAt: comboDeal.endsAt ?? undefined,
    items: comboDeal.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
  };
}

export function ComboDealForm({ comboDeal }: { comboDeal?: AdminComboDealDetail }) {
  const router = useRouter();
  const isEdit = !!comboDeal;
  const { data: products } = useAdminProducts({ page: 1, pageSize: 100 });
  const createComboDeal = useCreateComboDeal();
  const updateComboDeal = useUpdateComboDeal();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ComboDealInput>({
    resolver: zodResolver(comboDealInputSchema),
    defaultValues: toDefaultValues(comboDeal),
  });

  const itemsArray = useFieldArray({ control, name: 'items' });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (isEdit) {
        await updateComboDeal.mutateAsync({ id: comboDeal.id, input: values });
      } else {
        await createComboDeal.mutateAsync(values);
      }
      router.push('/admin/combo-deals');
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Không thể lưu combo');
    }
  });

  const isSubmitting = createComboDeal.isPending || updateComboDeal.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <FormError message={serverError} />

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Tên combo</Label>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" aria-invalid={!!errors.slug} {...register('slug')} />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="comboPrice">Giá combo (VNĐ)</Label>
          <Input
            id="comboPrice"
            type="number"
            aria-invalid={!!errors.comboPrice}
            {...register('comboPrice', { valueAsNumber: true })}
          />
          {errors.comboPrice && (
            <p className="text-xs text-destructive">{errors.comboPrice.message}</p>
          )}
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            {...register('isActive')}
          />
          Đang hoạt động
        </label>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="description">Mô tả (tuỳ chọn)</Label>
          <Input id="description" {...register('description')} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Sản phẩm trong combo</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => itemsArray.append({ productId: '', quantity: 1 })}
          >
            <Plus className="h-4 w-4" /> Thêm sản phẩm
          </Button>
        </div>

        {errors.items?.message && (
          <p className="text-xs text-destructive">{errors.items.message}</p>
        )}

        {itemsArray.fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-3">
              <Label htmlFor={`items.${index}.productId`}>Sản phẩm</Label>
              <select
                id={`items.${index}.productId`}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                {...register(`items.${index}.productId` as const)}
              >
                <option value="">— Chọn sản phẩm —</option>
                {products?.items.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`items.${index}.quantity`}>Số lượng</Label>
                <Input
                  id={`items.${index}.quantity`}
                  type="number"
                  {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Xoá sản phẩm"
                onClick={() => itemsArray.remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {itemsArray.fields.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào trong combo này.</p>
        )}
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu combo'}
        </Button>
      </div>
    </form>
  );
}
