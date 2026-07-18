'use client';

import * as React from 'react';
import Image from 'next/image';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { BannerInput } from '@repo/contracts';
import { BannerForm } from '@/components/admin/banners/banner-form';
import { Button } from '@/components/ui/button';
import {
  useAdminBanners,
  useCreateBanner,
  useDeleteBanner,
  useUpdateBanner,
} from '@/hooks/use-admin-banners';
import { useCanManageContent } from '@/hooks/use-can-manage';

const POSITION_LABELS: Record<string, string> = {
  HOME_HERO: 'Trang chủ - Banner chính',
  HOME_MIDDLE: 'Trang chủ - Giữa trang',
  CATEGORY_TOP: 'Đầu trang danh mục',
  SIDEBAR: 'Thanh bên',
};

export default function AdminBannersPage() {
  const { data: banners, isLoading } = useAdminBanners();
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();
  const canManage = useCanManageContent();

  const [mode, setMode] = React.useState<'idle' | 'create' | string>('idle');

  async function handleCreate(input: BannerInput) {
    try {
      await createBanner.mutateAsync(input);
      setMode('idle');
    } catch {
      // Error toast is surfaced by the mutation hook.
    }
  }

  async function handleUpdate(id: string, input: BannerInput) {
    try {
      await updateBanner.mutateAsync({ id, input });
      setMode('idle');
    } catch {
      // Error toast is surfaced by the mutation hook.
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Banner</h1>
        {mode === 'idle' && canManage && (
          <Button size="sm" onClick={() => setMode('create')}>
            <Plus className="h-4 w-4" /> Thêm banner
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}

      {mode === 'create' && (
        <BannerForm
          onSubmit={handleCreate}
          onCancel={() => setMode('idle')}
          isSubmitting={createBanner.isPending}
        />
      )}

      <div className="space-y-3">
        {banners?.map((banner) =>
          mode === banner.id ? (
            <BannerForm
              key={banner.id}
              initialValue={banner}
              onSubmit={(input) => handleUpdate(banner.id, input)}
              onCancel={() => setMode('idle')}
              isSubmitting={updateBanner.isPending}
            />
          ) : (
            <div
              key={banner.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-4">
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={banner.imageUrl}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold">
                    {banner.title}
                    {!banner.isActive && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Ẩn
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {POSITION_LABELS[banner.position] ?? banner.position} · Thứ tự{' '}
                    {banner.sortOrder}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sửa banner"
                    onClick={() => setMode(banner.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Xoá banner"
                    disabled={deleteBanner.isPending}
                    onClick={() => {
                      if (window.confirm(`Xoá banner "${banner.title}"?`)) {
                        deleteBanner.mutate(banner.id);
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
        {banners?.length === 0 && mode === 'idle' && (
          <p className="text-muted-foreground">Chưa có banner nào.</p>
        )}
      </div>
    </div>
  );
}
