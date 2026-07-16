'use client';

import * as React from 'react';
import { InventoryRow } from '@/components/admin/inventory/inventory-row';
import { useAdminInventory } from '@/hooks/use-admin-inventory';

export default function AdminInventoryPage() {
  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState('');
  const [lowStockOnly, setLowStockOnly] = React.useState(false);
  const { data, isLoading } = useAdminInventory({
    page,
    pageSize: 20,
    q: q || undefined,
    lowStockOnly: lowStockOnly || undefined,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold">Tồn kho</h1>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo tên hoặc SKU..."
          aria-label="Tìm kiếm tồn kho"
          className="w-full max-w-sm rounded-xl border border-input bg-background px-4 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(event) => {
              setLowStockOnly(event.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-input"
          />
          Chỉ hiện sắp hết hàng
        </label>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : !data || data.items.length === 0 ? (
        <p className="text-muted-foreground">Không tìm thấy sản phẩm nào.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-4 font-medium">Sản phẩm</th>
                  <th className="p-4 font-medium">Tồn kho</th>
                  <th className="p-4 font-medium">Đã giữ chỗ</th>
                  <th className="p-4 font-medium">Có thể bán</th>
                  <th className="p-4 font-medium">Ngưỡng cảnh báo</th>
                  <th className="p-4" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <InventoryRow key={item.productId} item={item} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-xl border border-input px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-muted-foreground">
              Trang {data.meta.page} / {data.meta.totalPages}
            </span>
            <button
              type="button"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl border border-input px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </>
      )}
    </div>
  );
}
