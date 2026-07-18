'use client';

import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminFlashSales, useDeleteFlashSale } from '@/hooks/use-admin-flash-sales';
import { useCanManageContent } from '@/hooks/use-can-manage';

export default function AdminFlashSalesPage() {
  const { data: flashSales, isLoading } = useAdminFlashSales();
  const deleteFlashSale = useDeleteFlashSale();
  const canManage = useCanManageContent();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Flash Sale</h1>
        {canManage && (
          <Button asChild>
            <Link href="/admin/flash-sales/new">
              <Plus className="h-4 w-4" /> Thêm flash sale
            </Link>
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : !flashSales || flashSales.length === 0 ? (
        <p className="text-muted-foreground">Chưa có đợt flash sale nào.</p>
      ) : (
        <div className="space-y-3">
          {flashSales.map((flashSale) => (
            <div
              key={flashSale.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <Link
                  href={`/admin/flash-sales/${flashSale.id}`}
                  className="font-semibold hover:text-primary"
                >
                  {flashSale.name}
                </Link>
                {!flashSale.isActive && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Tắt
                  </span>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(flashSale.startsAt).toLocaleString('vi-VN')} —{' '}
                  {new Date(flashSale.endsAt).toLocaleString('vi-VN')} · {flashSale.itemCount} sản
                  phẩm
                </p>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Xoá flash sale"
                  disabled={deleteFlashSale.isPending}
                  onClick={() => {
                    if (window.confirm(`Xoá flash sale "${flashSale.name}"?`)) {
                      deleteFlashSale.mutate(flashSale.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
