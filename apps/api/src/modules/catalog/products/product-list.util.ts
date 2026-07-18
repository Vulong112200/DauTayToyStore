import { Prisma } from '@prisma/client';
import type { ProductFlashSale, ProductListItem } from '@repo/contracts';

export const PRODUCT_LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  price: true,
  compareAtPrice: true,
  avgRating: true,
  reviewCount: true,
  brand: { select: { name: true } },
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { url: true },
  },
  inventory: { select: { quantityOnHand: true, quantityReserved: true } },
  variants: { select: { id: true } },
} satisfies Prisma.ProductSelect;

export type ProductListRow = Prisma.ProductGetPayload<{ select: typeof PRODUCT_LIST_SELECT }>;

export function isProductRowInStock(row: {
  inventory: { quantityOnHand: number; quantityReserved: number } | null;
  variants: { id: string }[];
}): boolean {
  if (row.variants.length > 0) return true;
  if (!row.inventory) return true;
  return row.inventory.quantityOnHand - row.inventory.quantityReserved > 0;
}

/**
 * Derives the display flash-sale for a product from an active `FlashSaleItem`
 * (as loaded by `PromotionContextService.loadFlashSaleItems`). Returns null unless
 * the flash sale would actually apply — i.e. still in stock (mirroring the engine's
 * `remainingStock === null || > 0` rule) and genuinely cheaper than the base price —
 * so a card never shows a badge for a price the cart wouldn't honor.
 */
export function resolveProductFlashSale(
  basePrice: number,
  flash: { salePrice: number; remainingStock: number | null } | undefined,
): ProductFlashSale | null {
  if (!flash) return null;
  const inStock = flash.remainingStock === null || flash.remainingStock > 0;
  if (!inStock || flash.salePrice >= basePrice) return null;
  const discountPercent =
    basePrice > 0 ? Math.round(((basePrice - flash.salePrice) / basePrice) * 100) : 0;
  return { salePrice: flash.salePrice, discountPercent };
}

export function toProductListItem(
  row: ProductListRow,
  flashSale: ProductFlashSale | null = null,
): ProductListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    avgRating: row.avgRating,
    reviewCount: row.reviewCount,
    primaryImageUrl: row.images[0]?.url ?? null,
    brandName: row.brand?.name ?? null,
    inStock: isProductRowInStock(row),
    flashSale,
  };
}
