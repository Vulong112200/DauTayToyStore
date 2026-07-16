'use client';

import * as React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { GiftVoucherInput, UpdateGiftVoucherInput } from '@repo/contracts';
import {
  GiftVoucherCreateForm,
  GiftVoucherEditForm,
} from '@/components/admin/gift-vouchers/gift-voucher-form';
import { Button } from '@/components/ui/button';
import {
  useAdminGiftVouchers,
  useCreateGiftVoucher,
  useDeleteGiftVoucher,
  useUpdateGiftVoucher,
} from '@/hooks/use-admin-gift-vouchers';
import { ApiError } from '@/lib/api-client';
import { formatVnd } from '@/lib/utils';

export default function AdminGiftVouchersPage() {
  const [page, setPage] = React.useState(1);
  const { data, isLoading } = useAdminGiftVouchers({ page, pageSize: 20 });
  const createVoucher = useCreateGiftVoucher();
  const updateVoucher = useUpdateGiftVoucher();
  const deleteVoucher = useDeleteGiftVoucher();

  const [mode, setMode] = React.useState<'idle' | 'create' | string>('idle');
  const [error, setError] = React.useState<string | null>(null);

  async function handleCreate(input: GiftVoucherInput) {
    setError(null);
    try {
      await createVoucher.mutateAsync(input);
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tạo phiếu quà tặng');
    }
  }

  async function handleUpdate(id: string, input: UpdateGiftVoucherInput) {
    setError(null);
    try {
      await updateVoucher.mutateAsync({ id, input });
      setMode('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu phiếu quà tặng');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Phiếu quà tặng</h1>
        {mode === 'idle' && (
          <Button size="sm" onClick={() => setMode('create')}>
            <Plus className="h-4 w-4" /> Thêm phiếu quà tặng
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Đang tải...</p>}

      {mode === 'create' && (
        <GiftVoucherCreateForm
          onSubmit={handleCreate}
          onCancel={() => setMode('idle')}
          isSubmitting={createVoucher.isPending}
          error={error}
        />
      )}

      <div className="space-y-3">
        {data?.items.map((voucher) =>
          mode === voucher.id ? (
            <GiftVoucherEditForm
              key={voucher.id}
              voucher={voucher}
              onSubmit={(input) => handleUpdate(voucher.id, input)}
              onCancel={() => setMode('idle')}
              isSubmitting={updateVoucher.isPending}
              error={error}
            />
          ) : (
            <div
              key={voucher.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-semibold">
                  {voucher.code}
                  {!voucher.isActive && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Tắt
                    </span>
                  )}
                  {voucher.redeemedAt && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Đã dùng
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Còn lại {formatVnd(voucher.balance)} / {formatVnd(voucher.amount)}
                  {voucher.recipientEmail && ` · ${voucher.recipientEmail}`}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Sửa phiếu quà tặng"
                  onClick={() => setMode(voucher.id)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Xoá phiếu quà tặng"
                  disabled={deleteVoucher.isPending}
                  onClick={() => {
                    if (window.confirm(`Xoá phiếu quà tặng "${voucher.code}"?`)) {
                      deleteVoucher.mutate(voucher.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ),
        )}
        {data?.items.length === 0 && mode === 'idle' && (
          <p className="text-muted-foreground">Chưa có phiếu quà tặng nào.</p>
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
