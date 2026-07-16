'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  type AdminBuyXGetYRule,
  type BuyXGetYRuleInput,
  buyXGetYRuleInputSchema,
} from '@repo/contracts';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminProducts } from '@/hooks/use-admin-products';

export function BuyXGetYRuleForm({
  initialValue,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: {
  initialValue?: AdminBuyXGetYRule;
  onSubmit: (input: BuyXGetYRuleInput) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const { data: products } = useAdminProducts({ page: 1, pageSize: 100 });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BuyXGetYRuleInput>({
    resolver: zodResolver(buyXGetYRuleInputSchema),
    defaultValues: initialValue
      ? {
          name: initialValue.name,
          buyProductId: initialValue.buyProductId,
          buyQuantity: initialValue.buyQuantity,
          getProductId: initialValue.getProductId,
          getQuantity: initialValue.getQuantity,
          discountPercent: initialValue.discountPercent,
          isActive: initialValue.isActive,
        }
      : { discountPercent: 100, buyQuantity: 1, getQuantity: 1, isActive: true },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-border p-4"
      noValidate
    >
      <FormError message={error} />
      <div className="space-y-1.5">
        <Label htmlFor="name">Tên chương trình</Label>
        <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="buyProductId">Sản phẩm cần mua</Label>
          <select
            id="buyProductId"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            {...register('buyProductId')}
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
          <Label htmlFor="buyQuantity">Số lượng cần mua</Label>
          <Input id="buyQuantity" type="number" {...register('buyQuantity', { valueAsNumber: true })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="getProductId">Sản phẩm được tặng</Label>
          <select
            id="getProductId"
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            {...register('getProductId')}
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
          <Label htmlFor="getQuantity">Số lượng được tặng</Label>
          <Input id="getQuantity" type="number" {...register('getQuantity', { valueAsNumber: true })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="discountPercent">Giảm giá quà tặng (%)</Label>
          <Input
            id="discountPercent"
            type="number"
            {...register('discountPercent', { valueAsNumber: true })}
          />
          <p className="text-xs text-muted-foreground">100% nghĩa là tặng miễn phí.</p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('isActive')} />
        Đang hoạt động
      </label>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu chương trình'}
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
