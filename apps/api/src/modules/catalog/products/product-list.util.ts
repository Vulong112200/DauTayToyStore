import { Prisma } from '@prisma/client';
import type { ProductListItem } from '@repo/contracts';

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

export function toProductListItem(row: ProductListRow): ProductListItem {
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
  };
}
