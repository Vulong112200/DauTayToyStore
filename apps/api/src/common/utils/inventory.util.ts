export interface InventorySnapshot {
  quantityOnHand: number;
  quantityReserved: number;
}

/** Untracked inventory (no row) is treated as unlimited stock. */
export function resolveAvailableStock(
  inventory: InventorySnapshot | null | undefined,
): number {
  if (!inventory) return Number.MAX_SAFE_INTEGER;
  return Math.max(0, inventory.quantityOnHand - inventory.quantityReserved);
}
