'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import {
  type AdminFlashSaleDetail,
  type FlashSaleInput,
  flashSaleInputSchema,
} from '@repo/contracts';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminProducts } from '@/hooks/use-admin-products';
import { useCreateFlashSale, useUpdateFlashSale } from '@/hooks/use-admin-flash-sales';
import { ApiError } from '@/lib/api-client';

function toLocalInputValue(iso?: string): string | undefined {
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

function toDefaultValues(flashSale?: AdminFlashSaleDetail): FlashSaleInput {
  if (!flashSale) {
    return { name: '', startsAt: '', endsAt: '', isActive: true, items: [] };
  }

  return {
    name: flashSale.name,
    startsAt: flashSale.startsAt,
    endsAt: flashSale.endsAt,
    isActive: flashSale.isActive,
    items: flashSale.items.map((item) => ({
      productId: item.productId,
      salePrice: item.salePrice,
      stockLimit: item.stockLimit ?? undefined,
    })),
  };
}

export function FlashSaleForm({ flashSale }: { flashSale?: AdminFlashSaleDetail }) {
  const router = useRouter();
  const isEdit = !!flashSale;
  const { data: products } = useAdminProducts({ page: 1, pageSize: 100 });
  const createFlashSale = useCreateFlashSale();
  const updateFlashSale = useUpdateFlashSale();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FlashSaleInput>({
    resolver: zodResolver(flashSaleInputSchema),
    defaultValues: toDefaultValues(flashSale),
  });

  const itemsArray = useFieldArray({ control, name: 'items' });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (isEdit) {
        await updateFlashSale.mutateAsync({ id: flashSale.id, input: values });
      } else {
        await createFlashSale.mutateAsync(values);
      }
      router.push('/admin/flash-sales');
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Không thể lưu flash sale');
    }
  });

  const isSubmitting = createFlashSale.isPending || updateFlashSale.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <FormError message={serverError} />

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="name">Tên đợt flash sale</Label>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="startsAt">Bắt đầu</Label>
          <Input
            id="startsAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(flashSale?.startsAt)}
            aria-invalid={!!errors.startsAt}
            {...register('startsAt', dateFieldOptions)}
          />
          {errors.startsAt && (
            <p className="text-xs text-destructive">{errors.startsAt.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endsAt">Kết thúc</Label>
          <Input
            id="endsAt"
            type="datetime-local"
            defaultValue={toLocalInputValue(flashSale?.endsAt)}
            aria-invalid={!!errors.endsAt}
            {...register('endsAt', dateFieldOptions)}
          />
          {errors.endsAt && <p className="text-xs text-destructive">{errors.endsAt.message}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            {...register('isActive')}
          />
          Đang hoạt động
        </label>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Sản phẩm trong đợt sale</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => itemsArray.append({ productId: '', salePrice: 0 })}
          >
            <Plus className="h-4 w-4" /> Thêm sản phẩm
          </Button>
        </div>

        {errors.items?.message && (
          <p className="text-xs text-destructive">{errors.items.message}</p>
        )}

        {itemsArray.fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2">
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
            <div className="space-y-1.5">
              <Label htmlFor={`items.${index}.salePrice`}>Giá sale</Label>
              <Input
                id={`items.${index}.salePrice`}
                type="number"
                {...register(`items.${index}.salePrice` as const, { valueAsNumber: true })}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor={`items.${index}.stockLimit`}>Giới hạn kho (tuỳ chọn)</Label>
                <Input
                  id={`items.${index}.stockLimit`}
                  type="number"
                  {...register(`items.${index}.stockLimit` as const, optionalNumberOptions)}
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
          <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào trong đợt sale này.</p>
        )}
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu flash sale'}
        </Button>
      </div>
    </form>
  );
}
