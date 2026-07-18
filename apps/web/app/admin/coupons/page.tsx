'use client';

import * as React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { CouponInput } from '@repo/contracts';
import { CouponForm } from '@/components/admin/coupons/coupon-form';
import { Button } from '@/components/ui/button';
import {
  useAdminCoupons,
  useCreateCoupon,
  useDeleteCoupon,
  useUpdateCoupon,
} from '@/hooks/use-admin-coupons';
import { useCanManageContent } from '@/hooks/use-can-manage';
import { ApiError } from '@/lib/api-client';
import { formatVnd } from '@/lib/utils';

function formatValue(coupon: { type: string; value: number }): string {
  return coupon.type === 'PERCENTAGE' ? `${coupon.value}%` : formatVnd(coupon.value);
}

export default function AdminCouponsPage() {
  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState('');
  const { data, isLoading } = useAdminCoupons({ page, pageSize: 20, q: q || undefined });
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const canManage = useCanManageContent();

  const [mode, setMode] = React.useState<'idle' | 'create' | string>('idle');
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreate(input: CouponInput) {
    setError(null);
    try {
      await createCoupon.mutateAsync(input);
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu mã giảm giá');
    }
  }

  async function handleUpdate(id: string, input: CouponInput) {
    setError(null);
    try {
      await updateCoupon.mutateAsync({ id, input });
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu mã giảm giá');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Mã giảm giá</h1>
        {mode === 'idle' && canManage && (
          <Button size="sm" onClick={() => setMode('create')}>
            <Plus className="h-4 w-4" /> Thêm mã giảm giá
          </Button>
        )}
      </div>

      <input
        type="search"
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setPage(1);
        }}
        placeholder="Tìm theo mã hoặc mô tả..."
        aria-label="Tìm kiếm mã giảm giá"
        className="w-full max-w-sm rounded-xl border border-input bg-background px-4 py-2 text-sm"
      />

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}

      {mode === 'create' && (
        <CouponForm
          onSubmit={handleCreate}
          onCancel={() => setMode('idle')}
          isSubmitting={createCoupon.isPending}
          error={error}
        />
      )}

      <div className="space-y-3">
        {data?.items.map((coupon) =>
          mode === coupon.id ? (
            <CouponForm
              key={coupon.id}
              initialValue={coupon}
              onSubmit={(input) => handleUpdate(coupon.id, input)}
              onCancel={() => setMode('idle')}
              isSubmitting={updateCoupon.isPending}
              error={error}
            />
          ) : (
            <div
              key={coupon.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-semibold">
                  {coupon.code}
                  {!coupon.isActive && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Tắt
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Giảm {formatValue(coupon)} · Đã dùng {coupon.usageCount}
                  {coupon.usageLimit ? `/${coupon.usageLimit}` : ''} lượt
                </p>
              </div>
              {canManage && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Sửa mã giảm giá"
                    onClick={() => setMode(coupon.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Xoá mã giảm giá"
                    disabled={deleteCoupon.isPending}
                    onClick={() => {
                      if (window.confirm(`Xoá mã giảm giá "${coupon.code}"?`)) {
                        deleteCoupon.mutate(coupon.id);
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
        {data?.items.length === 0 && mode === 'idle' && (
          <p className="text-muted-foreground">Chưa có mã giảm giá nào.</p>
        )}
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {data.meta.page} / {data.meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Sau
          </Button>
        </div>
      )}
    </div>
  );
}
