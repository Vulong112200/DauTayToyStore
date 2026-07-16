'use client';

import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminComboDeals, useDeleteComboDeal } from '@/hooks/use-admin-combo-deals';
import { formatVnd } from '@/lib/utils';

export default function AdminComboDealsPage() {
  const { data: comboDeals, isLoading } = useAdminComboDeals();
  const deleteComboDeal = useDeleteComboDeal();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Combo sản phẩm</h1>
        <Button asChild>
          <Link href="/admin/combo-deals/new">
            <Plus className="h-4 w-4" /> Thêm combo
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : !comboDeals || comboDeals.length === 0 ? (
        <p className="text-muted-foreground">Chưa có combo nào.</p>
      ) : (
        <div className="space-y-3">
          {comboDeals.map((comboDeal) => (
            <div
              key={comboDeal.id}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <Link
                  href={`/admin/combo-deals/${comboDeal.id}`}
                  className="font-semibold hover:text-primary"
                >
                  {comboDeal.name}
                </Link>
                {!comboDeal.isActive && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Tắt
                  </span>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatVnd(comboDeal.comboPrice)} · {comboDeal.itemCount} sản phẩm
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Xoá combo"
                disabled={deleteComboDeal.isPending}
                onClick={() => {
                  if (window.confirm(`Xoá combo "${comboDeal.name}"?`)) {
                    deleteComboDeal.mutate(comboDeal.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
