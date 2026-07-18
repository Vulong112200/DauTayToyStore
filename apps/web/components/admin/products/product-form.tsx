'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { type AdminProductDetail, type ProductInput, productInputSchema } from '@repo/contracts';
import { MediaPicker } from '@/components/admin/media/media-picker';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminBrands } from '@/hooks/use-admin-brands';
import { useAdminCategories } from '@/hooks/use-admin-categories';
import { useCreateProduct, useUpdateProduct } from '@/hooks/use-admin-products';
import { ApiError } from '@/lib/api-client';

const numberFieldOptions = {
  setValueAs: (value: unknown) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  },
};

function toDefaultValues(product?: AdminProductDetail): ProductInput {
  if (!product) {
    return {
      name: '',
      slug: '',
      sku: '',
      categoryIds: [],
      status: 'DRAFT',
      price: 0,
      quantityOnHand: 0,
      images: [],
      specifications: [],
      faqs: [],
    };
  }

  return {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    barcode: product.barcode ?? undefined,
    brandId: product.brandId ?? undefined,
    categoryIds: product.categoryIds,
    status: product.status,
    shortDescription: product.shortDescription ?? undefined,
    description: product.description ?? undefined,
    price: product.price,
    compareAtPrice: product.compareAtPrice ?? undefined,
    material: product.material ?? undefined,
    origin: product.origin ?? undefined,
    ageMin: product.ageMin ?? undefined,
    ageMax: product.ageMax ?? undefined,
    weightGrams: product.weightGrams ?? undefined,
    metaTitle: product.metaTitle ?? undefined,
    metaDescription: product.metaDescription ?? undefined,
    quantityOnHand: product.quantityOnHand,
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText ?? undefined,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder,
    })),
    specifications: product.specifications,
    faqs: product.faqs,
  };
}

export function ProductForm({ product }: { product?: AdminProductDetail }) {
  const router = useRouter();
  const isEdit = !!product;
  const { data: brands } = useAdminBrands();
  const { data: categories } = useAdminCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productInputSchema),
    defaultValues: toDefaultValues(product),
  });

  const imagesArray = useFieldArray({ control, name: 'images' });
  const specsArray = useFieldArray({ control, name: 'specifications' });
  const faqsArray = useFieldArray({ control, name: 'faqs' });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      if (isEdit) {
        await updateProduct.mutateAsync({ id: product.id, input: values });
      } else {
        await createProduct.mutateAsync(values);
      }
      router.push('/admin/products');
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Không thể lưu sản phẩm');
    }
  });

  const isSubmitting = createProduct.isPending || updateProduct.isPending;

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <FormError message={serverError} />

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Tên sản phẩm</Label>
          <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" aria-invalid={!!errors.slug} {...register('slug')} />
          {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sku">SKU</Label>
          <Input id="sku" aria-invalid={!!errors.sku} {...register('sku')} />
          {errors.sku && <p className="text-xs text-destructive">{errors.sku.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="barcode">Mã vạch (tuỳ chọn)</Label>
          <Input id="barcode" {...register('barcode')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brandId">Thương hiệu</Label>
          <select
            id="brandId"
            className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
            {...register('brandId', {
              setValueAs: (value: unknown) => (value === '' ? undefined : value),
            })}
          >
            <option value="">-- Không có --</option>
            {brands?.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Trạng thái</Label>
          <select
            id="status"
            className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
            {...register('status')}
          >
            <option value="DRAFT">Nháp</option>
            <option value="PUBLISHED">Đã xuất bản</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-bold">Danh mục</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories?.map((category) => (
            <label key={category.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                value={category.id}
                className="h-4 w-4 rounded border-input"
                {...register('categoryIds')}
              />
              {category.name}
            </label>
          ))}
          {categories?.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có danh mục nào.</p>
          )}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="price">Giá bán (₫)</Label>
          <Input
            id="price"
            type="number"
            aria-invalid={!!errors.price}
            {...register('price', numberFieldOptions)}
          />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="compareAtPrice">Giá so sánh (tuỳ chọn)</Label>
          <Input id="compareAtPrice" type="number" {...register('compareAtPrice', numberFieldOptions)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quantityOnHand">Tồn kho</Label>
          <Input id="quantityOnHand" type="number" {...register('quantityOnHand', numberFieldOptions)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weightGrams">Khối lượng (gram, tuỳ chọn)</Label>
          <Input id="weightGrams" type="number" {...register('weightGrams', numberFieldOptions)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ageMin">Độ tuổi tối thiểu (tuỳ chọn)</Label>
          <Input id="ageMin" type="number" {...register('ageMin', numberFieldOptions)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ageMax">Độ tuổi tối đa (tuỳ chọn)</Label>
          <Input id="ageMax" type="number" {...register('ageMax', numberFieldOptions)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="material">Chất liệu (tuỳ chọn)</Label>
          <Input id="material" {...register('material')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="origin">Xuất xứ (tuỳ chọn)</Label>
          <Input id="origin" {...register('origin')} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="space-y-1.5">
          <Label htmlFor="shortDescription">Mô tả ngắn (tuỳ chọn)</Label>
          <textarea
            id="shortDescription"
            rows={2}
            className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
            {...register('shortDescription')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Mô tả chi tiết (HTML, tuỳ chọn)</Label>
          <textarea
            id="description"
            rows={6}
            className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm font-mono"
            {...register('description')}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Hình ảnh</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              imagesArray.append({
                url: '',
                isPrimary: imagesArray.fields.length === 0,
                sortOrder: imagesArray.fields.length,
              })
            }
          >
            <Plus className="h-4 w-4" /> Thêm ảnh
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {imagesArray.fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-3">
              <div className="flex-1">
                <Controller
                  control={control}
                  name={`images.${index}.url` as const}
                  render={({ field: urlField }) => (
                    <MediaPicker value={urlField.value} onChange={urlField.onChange} />
                  )}
                />
              </div>
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                {/* Radio-style: exactly one image can be primary. A plain checkbox per row let
                    an admin mark several, leaving which one wins undefined. */}
                <input
                  type="radio"
                  name="primaryImage"
                  checked={!!watch(`images.${index}.isPrimary`)}
                  onChange={() =>
                    imagesArray.fields.forEach((_, i) =>
                      setValue(`images.${i}.isPrimary` as const, i === index),
                    )
                  }
                />{' '}
                Ảnh chính
              </label>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Xoá ảnh"
                onClick={() => imagesArray.remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {imagesArray.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">Chưa có hình ảnh nào.</p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Thông số kỹ thuật</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => specsArray.append({ label: '', value: '' })}
          >
            <Plus className="h-4 w-4" /> Thêm thông số
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {specsArray.fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-3">
              <Input placeholder="Nhãn" {...register(`specifications.${index}.label` as const)} />
              <Input placeholder="Giá trị" {...register(`specifications.${index}.value` as const)} />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Xoá thông số"
                onClick={() => specsArray.remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Câu hỏi thường gặp</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => faqsArray.append({ question: '', answer: '' })}
          >
            <Plus className="h-4 w-4" /> Thêm câu hỏi
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {faqsArray.fields.map((field, index) => (
            <div key={field.id} className="space-y-2 rounded-xl border border-border p-3">
              <Input placeholder="Câu hỏi" {...register(`faqs.${index}.question` as const)} />
              <textarea
                placeholder="Câu trả lời"
                rows={2}
                className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm"
                {...register(`faqs.${index}.answer` as const)}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => faqsArray.remove(index)}
              >
                <Trash2 className="h-4 w-4" /> Xoá
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="metaTitle">SEO: Meta title (tuỳ chọn)</Label>
          <Input id="metaTitle" {...register('metaTitle')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="metaDescription">SEO: Meta description (tuỳ chọn)</Label>
          <Input id="metaDescription" {...register('metaDescription')} />
        </div>
      </section>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Đang lưu...' : isEdit ? 'Cập nhật sản phẩm' : 'Tạo sản phẩm'}
      </Button>
    </form>
  );
}
