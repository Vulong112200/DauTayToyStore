'use client';

import * as React from 'react';
import Image from 'next/image';
import type { AdminInventoryItem } from '@repo/contracts';
import { useUpdateInventory } from '@/hooks/use-admin-inventory';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

export function InventoryRow({ item }: { item: AdminInventoryItem }) {
  const updateInventory = useUpdateInventory();
  const [quantityOnHand, setQuantityOnHand] = React.useState(item.quantityOnHand);
  const [lowStockThreshold, setLowStockThreshold] = React.useState(item.lowStockThreshold);
  const [error, setError] = React.useState<string | null>(null);

  const isDirty =
    quantityOnHand !== item.quantityOnHand || lowStockThreshold !== item.lowStockThreshold;
  const isLowStock = item.availableStock <= item.lowStockThreshold;

  async function handleSave() {
    setError(null);
    try {
      await updateInventory.mutateAsync({
        productId: item.productId,
        input: { quantityOnHand, lowStockThreshold },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật tồn kho');
    }
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
            {item.primaryImageUrl ? (
              <Image
                src={item.primaryImageUrl}
                alt={item.productName}
                fill
                sizes="40px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-lg" aria-hidden>
                🧸
              </div>
            )}
          </div>
          <div>
            <p className="font-medium">{item.productName}</p>
            <p className="text-xs text-muted-foreground">{item.sku}</p>
          </div>
        </div>
      </td>
      <td className="p-4">
        <input
          type="number"
          value={quantityOnHand}
          onChange={(event) => setQuantityOnHand(Number(event.target.value))}
          aria-label={`Tồn kho của ${item.productName}`}
          className="w-20 rounded-lg border border-input bg-background px-2 py-1 text-sm"
        />
      </td>
      <td className="p-4">{item.quantityReserved}</td>
      <td className="p-4">
        <span className={cn(isLowStock && 'font-semibold text-destructive')}>
          {item.availableStock}
        </span>
      </td>
      <td className="p-4">
        <input
          type="number"
          value={lowStockThreshold}
          onChange={(event) => setLowStockThreshold(Number(event.target.value))}
          aria-label={`Ngưỡng cảnh báo của ${item.productName}`}
          className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-sm"
        />
      </td>
      <td className="p-4 text-right">
        {isDirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={updateInventory.isPending}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {updateInventory.isPending ? 'Đang lưu...' : 'Lưu'}
          </button>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </td>
    </tr>
  );
}
