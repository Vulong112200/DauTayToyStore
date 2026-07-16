'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminProducts, useDeleteProduct } from '@/hooks/use-admin-products';
import { formatVnd } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  PUBLISHED: 'Đã xuất bản',
  ARCHIVED: 'Lưu trữ',
};

export default function AdminProductsPage() {
  const [page, setPage] = React.useState(1);
  const [q, setQ] = React.useState('');
  const { data, isLoading } = useAdminProducts({ page, pageSize: 20, q: q || undefined });
  const deleteProduct = useDeleteProduct();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Sản phẩm</h1>
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" /> Thêm sản phẩm
          </Link>
        </Button>
      </div>

      <input
        type="search"
        value={q}
        onChange={(event) => {
          setQ(event.target.value);
          setPage(1);
        }}
        placeholder="Tìm theo tên hoặc SKU..."
        aria-label="Tìm kiếm sản phẩm"
        className="w-full max-w-sm rounded-xl border border-input bg-background px-4 py-2 text-sm"
      />

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
                  <th className="p-4 font-medium">SKU</th>
                  <th className="p-4 font-medium">Trạng thái</th>
                  <th className="p-4 font-medium">Tồn kho</th>
                  <th className="p-4 text-right font-medium">Giá</th>
                  <th className="p-4" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {data.items.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="p-4">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {product.name}
                      </Link>
                      {product.brandName && (
                        <p className="text-xs text-muted-foreground">{product.brandName}</p>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">{product.sku}</td>
                    <td className="p-4">{STATUS_LABELS[product.status] ?? product.status}</td>
                    <td className="p-4">{product.quantityOnHand ?? '—'}</td>
                    <td className="p-4 text-right font-semibold">{formatVnd(product.price)}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Lưu trữ sản phẩm"
                        disabled={deleteProduct.isPending}
                        onClick={() => {
                          if (window.confirm(`Lưu trữ sản phẩm "${product.name}"?`)) {
                            deleteProduct.mutate(product.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        </>
      )}
    </div>
  );
}
