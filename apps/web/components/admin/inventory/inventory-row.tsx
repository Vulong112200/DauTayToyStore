'use client';

import * as React from 'react';
import Image from 'next/image';
import type { AdminInventoryItem } from '@repo/contracts';
import { useUpdateInventory } from '@/hooks/use-admin-inventory';
import { toastError, toastSuccess } from '@/lib/toast';
import { cn } from '@/lib/utils';

/**
 * Parse a numeric-input value into a non-negative integer. An empty/blank field
 * becomes 0, and anything non-finite (a stray character) keeps the previous
 * value instead of poisoning state with NaN.
 */
function parseStockValue(raw: string, fallback: number): number {
  if (raw.trim() === '') return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

export function InventoryRow({ item }: { item: AdminInventoryItem }) {
  const updateInventory = useUpdateInventory();
  const [quantityOnHand, setQuantityOnHand] = React.useState(item.quantityOnHand);
  const [lowStockThreshold, setLowStockThreshold] = React.useState(item.lowStockThreshold);

  const isDirty =
    quantityOnHand !== item.quantityOnHand || lowStockThreshold !== item.lowStockThreshold;
  const isValid =
    Number.isInteger(quantityOnHand) &&
    quantityOnHand >= 0 &&
    Number.isInteger(lowStockThreshold) &&
    lowStockThreshold >= 0;
  const isLowStock = item.availableStock <= item.lowStockThreshold;

  async function handleSave() {
    try {
      await updateInventory.mutateAsync({
        productId: item.productId,
        input: { quantityOnHand, lowStockThreshold },
      });
      toastSuccess(`Đã cập nhật tồn kho: ${item.productName}`);
    } catch (err) {
      toastError(err, 'Không thể cập nhật tồn kho');
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
          min={0}
          value={quantityOnHand}
          onChange={(event) =>
            setQuantityOnHand((prev) => parseStockValue(event.target.value, prev))
          }
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
          min={0}
          value={lowStockThreshold}
          onChange={(event) =>
            setLowStockThreshold((prev) => parseStockValue(event.target.value, prev))
          }
          aria-label={`Ngưỡng cảnh báo của ${item.productName}`}
          className="w-16 rounded-lg border border-input bg-background px-2 py-1 text-sm"
        />
      </td>
      <td className="p-4 text-right">
        {isDirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={updateInventory.isPending || !isValid}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {updateInventory.isPending ? 'Đang lưu...' : 'Lưu'}
          </button>
        )}
      </td>
    </tr>
  );
}
