import { z } from 'zod';
import { orderStatusSchema } from '../orders/schemas.js';

const slugSchema = z
  .string()
  .min(2, 'Slug quá ngắn')
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang');

export const productStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type ProductStatus = z.infer<typeof productStatusSchema>;

// ---------------------------------------------------------------------------
// Admin products
// ---------------------------------------------------------------------------

export const adminProductListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  sku: z.string(),
  status: productStatusSchema,
  price: z.number().int(),
  primaryImageUrl: z.string().nullable(),
  brandName: z.string().nullable(),
  quantityOnHand: z.number().int().nullable(),
  updatedAt: z.string().datetime(),
});
export type AdminProductListItem = z.infer<typeof adminProductListItemSchema>;

export const adminProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  status: productStatusSchema.optional(),
});
export type AdminProductQuery = z.infer<typeof adminProductQuerySchema>;

export const productImageInputSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().url('URL hình ảnh không hợp lệ'),
  altText: z.string().optional(),
  isPrimary: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});
export type ProductImageInput = z.infer<typeof productImageInputSchema>;

export const productSpecificationInputSchema = z.object({
  label: z.string().min(1, 'Vui lòng nhập nhãn'),
  value: z.string().min(1, 'Vui lòng nhập giá trị'),
});
export type ProductSpecificationInput = z.infer<typeof productSpecificationInputSchema>;

export const productFaqInputSchema = z.object({
  question: z.string().min(1, 'Vui lòng nhập câu hỏi'),
  answer: z.string().min(1, 'Vui lòng nhập câu trả lời'),
});
export type ProductFaqInput = z.infer<typeof productFaqInputSchema>;

export const productInputSchema = z.object({
  name: z.string().min(2, 'Tên sản phẩm quá ngắn').max(200),
  slug: slugSchema,
  sku: z.string().min(1, 'Vui lòng nhập SKU').max(100),
  barcode: z.string().optional(),
  brandId: z.string().uuid().optional(),
  categoryIds: z.array(z.string().uuid()).default([]),
  status: productStatusSchema.default('DRAFT'),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  price: z.number().int().min(0, 'Giá không hợp lệ'),
  compareAtPrice: z.number().int().min(0).optional(),
  material: z.string().optional(),
  origin: z.string().optional(),
  ageMin: z.number().int().min(0).optional(),
  ageMax: z.number().int().min(0).optional(),
  weightGrams: z.number().int().min(0).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  quantityOnHand: z.number().int().min(0).default(0),
  images: z.array(productImageInputSchema).default([]),
  specifications: z.array(productSpecificationInputSchema).default([]),
  faqs: z.array(productFaqInputSchema).default([]),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const adminProductDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  sku: z.string(),
  barcode: z.string().nullable(),
  brandId: z.string().uuid().nullable(),
  categoryIds: z.array(z.string().uuid()),
  status: productStatusSchema,
  shortDescription: z.string().nullable(),
  description: z.string().nullable(),
  price: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  material: z.string().nullable(),
  origin: z.string().nullable(),
  ageMin: z.number().int().nullable(),
  ageMax: z.number().int().nullable(),
  weightGrams: z.number().int().nullable(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  quantityOnHand: z.number().int(),
  images: z.array(
    z.object({
      id: z.string().uuid(),
      url: z.string(),
      altText: z.string().nullable(),
      isPrimary: z.boolean(),
      sortOrder: z.number().int(),
    }),
  ),
  specifications: z.array(z.object({ label: z.string(), value: z.string() })),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })),
});
export type AdminProductDetail = z.infer<typeof adminProductDetailSchema>;

// ---------------------------------------------------------------------------
// Admin categories
// ---------------------------------------------------------------------------

export const categoryInputSchema = z.object({
  parentId: z.string().uuid().optional(),
  name: z.string().min(2, 'Tên danh mục quá ngắn').max(100),
  slug: slugSchema,
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const adminCategorySchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
});
export type AdminCategory = z.infer<typeof adminCategorySchema>;

// ---------------------------------------------------------------------------
// Admin brands
// ---------------------------------------------------------------------------

export const brandInputSchema = z.object({
  name: z.string().min(2, 'Tên thương hiệu quá ngắn').max(100),
  slug: slugSchema,
  logoUrl: z.string().url().optional(),
  description: z.string().optional(),
  originCountry: z.string().optional(),
  isActive: z.boolean().default(true),
});
export type BrandInput = z.infer<typeof brandInputSchema>;

export const adminBrandSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().nullable(),
  description: z.string().nullable(),
  originCountry: z.string().nullable(),
  isActive: z.boolean(),
});
export type AdminBrand = z.infer<typeof adminBrandSchema>;

// ---------------------------------------------------------------------------
// Admin dashboard
// ---------------------------------------------------------------------------

export const dashboardRecentOrderSchema = z.object({
  orderNumber: z.string(),
  customerName: z.string(),
  status: orderStatusSchema,
  total: z.number().int(),
  createdAt: z.string().datetime(),
});
export type DashboardRecentOrder = z.infer<typeof dashboardRecentOrderSchema>;

export const dashboardSummarySchema = z.object({
  totalProducts: z.number().int(),
  totalOrders: z.number().int(),
  totalRevenue: z.number().int(),
  totalCustomers: z.number().int(),
  recentOrders: z.array(dashboardRecentOrderSchema),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
