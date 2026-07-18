'use client';

import * as React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { BrandInput } from '@repo/contracts';
import { BrandForm } from '@/components/admin/brands/brand-form';
import { Button } from '@/components/ui/button';
import {
  useAdminBrands,
  useCreateBrand,
  useDeleteBrand,
  useUpdateBrand,
} from '@/hooks/use-admin-brands';
import { useCanManageContent } from '@/hooks/use-can-manage';
import { ApiError } from '@/lib/api-client';

export default function AdminBrandsPage() {
  const { data: brands, isLoading } = useAdminBrands();
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();
  const canManage = useCanManageContent();

  const [mode, setMode] = React.useState<'idle' | 'create' | string>('idle');
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreate(input: BrandInput) {
    setError(null);
    try {
      await createBrand.mutateAsync(input);
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu thương hiệu');
    }
  }

  async function handleUpdate(id: string, input: BrandInput) {
    setError(null);
    try {
      await updateBrand.mutateAsync({ id, input });
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu thương hiệu');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Thương hiệu</h1>
        {mode === 'idle' && canManage && (
          <Button size="sm" onClick={() => setMode('create')}>
            <Plus className="h-4 w-4" /> Thêm thương hiệu
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}

      {mode === 'create' && (
        <BrandForm
          onSubmit={handleCreate}
          onCancel={() => setMode('idle')}
          isSubmitting={createBrand.isPending}
          error={error}
        />
      )}

      <div className="space-y-3">
        {brands?.map((brand) =>
          mode === brand.id ? (
            <BrandForm
              key={brand.id}
              initialValue={brand}
              onSubmit={(input) => handleUpdate(brand.id, input)}
              onCancel={() => setMode('idle')}
              isSubmitting={updateBrand.isPending}
              error={error}
            />
          ) : (
            <div
              key={brand.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-semibold">
                  {brand.name}
                  {!brand.isActive && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Ẩn
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">/{brand.slug}</p>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sửa thương hiệu"
                    onClick={() => setMode(brand.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Xoá thương hiệu"
                    disabled={deleteBrand.isPending}
                    onClick={() => {
                      if (window.confirm(`Xoá thương hiệu "${brand.name}"?`)) {
                        deleteBrand.mutate(brand.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ),
        )}
        {brands?.length === 0 && mode === 'idle' && (
          <p className="text-muted-foreground">Chưa có thương hiệu nào.</p>
        )}
      </div>
    </div>
  );
}
