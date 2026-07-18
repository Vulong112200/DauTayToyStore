import { z } from 'zod';

export const categorySchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  sortOrder: z.number().int(),
});
export type Category = z.infer<typeof categorySchema>;

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}
export const categoryTreeNodeSchema: z.ZodType<CategoryTreeNode> = categorySchema.extend({
  children: z.lazy(() => z.array(categoryTreeNodeSchema)),
});

// Flash-sale pricing attached to a product for display. `salePrice` is the active
// flash sale's unit price (what the promotion engine will actually charge — same
// source, so card and cart agree), `discountPercent` is derived vs the product's
// normal price. Null when the product isn't in an active, in-stock flash sale.
export const productFlashSaleSchema = z.object({
  salePrice: z.number().int(),
  discountPercent: z.number().int(),
});
export type ProductFlashSale = z.infer<typeof productFlashSaleSchema>;

export const productListItemSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  price: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  avgRating: z.number(),
  reviewCount: z.number().int(),
  primaryImageUrl: z.string().nullable(),
  brandName: z.string().nullable(),
  inStock: z.boolean(),
  flashSale: productFlashSaleSchema.nullable(),
});
export type ProductListItem = z.infer<typeof productListItemSchema>;

export const productImageSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  altText: z.string().nullable(),
  isPrimary: z.boolean(),
  sortOrder: z.number().int(),
});
export type ProductImage = z.infer<typeof productImageSchema>;

export const productVideoSchema = z.object({
  id: z.string().uuid(),
  url: z.string(),
  thumbnailUrl: z.string().nullable(),
  title: z.string().nullable(),
});
export type ProductVideo = z.infer<typeof productVideoSchema>;

export const productVariantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sku: z.string(),
  priceOverride: z.number().int().nullable(),
  attributes: z.record(z.string(), z.string()),
  imageUrl: z.string().nullable(),
  inStock: z.boolean(),
});
export type ProductVariant = z.infer<typeof productVariantSchema>;

export const productSpecificationSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type ProductSpecification = z.infer<typeof productSpecificationSchema>;

export const productFaqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});
export type ProductFaq = z.infer<typeof productFaqSchema>;

export const productDetailSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  sku: z.string(),
  name: z.string(),
  shortDescription: z.string().nullable(),
  description: z.string().nullable(),
  price: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  flashSale: productFlashSaleSchema.nullable(),
  material: z.string().nullable(),
  origin: z.string().nullable(),
  ageMin: z.number().int().nullable(),
  ageMax: z.number().int().nullable(),
  weightGrams: z.number().int().nullable(),
  avgRating: z.number(),
  reviewCount: z.number().int(),
  brand: z.object({ name: z.string(), slug: z.string() }).nullable(),
  categories: z.array(z.object({ name: z.string(), slug: z.string() })),
  images: z.array(productImageSchema),
  videos: z.array(productVideoSchema),
  variants: z.array(productVariantSchema),
  specifications: z.array(productSpecificationSchema),
  faqs: z.array(productFaqSchema),
  related: z.array(productListItemSchema),
  upsell: z.array(productListItemSchema),
  crossSell: z.array(productListItemSchema),
  inStock: z.boolean(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
});
export type ProductDetail = z.infer<typeof productDetailSchema>;

export const productSortSchema = z.enum(['newest', 'price_asc', 'price_desc', 'rating']);
export type ProductSort = z.infer<typeof productSortSchema>;

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  categorySlug: z.string().optional(),
  brandSlug: z.string().optional(),
  q: z.string().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: productSortSchema.default('newest'),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
