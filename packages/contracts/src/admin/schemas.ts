import { z } from 'zod';
import { passwordSchema } from '../auth/schemas.js';
import { RoleName } from '../common/enums.js';
import { orderStatusSchema } from '../orders/schemas.js';

const slugSchema = z
  .string()
  .min(2, 'Slug quá ngắn')
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang');

// Admin image/link fields hold either a pasted absolute URL (https://…) or a
// root-relative path (/demo/…) — the latter is what seed data stores when R2
// isn't configured, and what an admin may legitimately type. A bare
// z.string().url() rejects the relative form (and any stray surrounding
// whitespace), which silently blocks the *entire* form from saving client-side.
// Trim first, then accept an absolute URL or a root-relative path.
const imageUrlSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith('/') || z.string().url().safeParse(value).success, {
    message: 'URL ảnh không hợp lệ',
  });

// Banner/link targets are overwhelmingly internal pages (/flash-sales, /products/x). A bare
// z.string().url() rejects those root-relative paths and any surrounding whitespace, which
// silently blocks the entire banner form from saving — the same class of bug fixed for image
// fields above. Trim first, then accept a root-relative path or an absolute URL.
const linkUrlSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith('/') || z.string().url().safeParse(value).success, {
    message: 'URL liên kết không hợp lệ',
  });

// Optional fields that an admin must be able to *clear*. A blank form input
// arrives as an empty string, which we normalize to an explicit `null` (a
// request to reset the column) while leaving an absent field (`undefined`)
// untouched so partial updates still work. Without this, an optional
// `z.string().email()` would reject the empty string outright, and even once
// past validation a plain `.optional()` value is dropped as `undefined` — which
// Prisma treats as "leave untouched" on `.update()`, silently keeping the old
// value. Result type: `<inner> | null | undefined`.
const clearableOptional = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === '' ? null : value), schema.nullable()).optional();

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
  url: imageUrlSchema,
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
  imageUrl: imageUrlSchema.optional(),
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
  logoUrl: imageUrlSchema.optional(),
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

export const dashboardActiveFlashSaleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  endsAt: z.string().datetime(),
  itemCount: z.number().int(),
});
export type DashboardActiveFlashSale = z.infer<typeof dashboardActiveFlashSaleSchema>;

export const dashboardSummarySchema = z.object({
  totalProducts: z.number().int(),
  totalOrders: z.number().int(),
  totalRevenue: z.number().int(),
  totalCustomers: z.number().int(),
  recentOrders: z.array(dashboardRecentOrderSchema),
  activeFlashSales: z.array(dashboardActiveFlashSaleSchema),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

// ---------------------------------------------------------------------------
// Admin orders
// ---------------------------------------------------------------------------

export const adminOrderListItemSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  status: orderStatusSchema,
  total: z.number().int(),
  itemCount: z.number().int(),
  createdAt: z.string().datetime(),
});
export type AdminOrderListItem = z.infer<typeof adminOrderListItemSchema>;

export const adminOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  status: orderStatusSchema.optional(),
});
export type AdminOrderQuery = z.infer<typeof adminOrderQuerySchema>;

export const updateOrderStatusInputSchema = z.object({
  status: orderStatusSchema,
  note: z.string().max(500).optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

// ---------------------------------------------------------------------------
// Admin inventory
// ---------------------------------------------------------------------------

export const adminInventoryItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  sku: z.string(),
  primaryImageUrl: z.string().nullable(),
  quantityOnHand: z.number().int(),
  quantityReserved: z.number().int(),
  availableStock: z.number().int(),
  lowStockThreshold: z.number().int(),
});
export type AdminInventoryItem = z.infer<typeof adminInventoryItemSchema>;

export const adminInventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  lowStockOnly: z.coerce.boolean().optional(),
});
export type AdminInventoryQuery = z.infer<typeof adminInventoryQuerySchema>;

export const updateInventoryInputSchema = z.object({
  quantityOnHand: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional(),
});
export type UpdateInventoryInput = z.infer<typeof updateInventoryInputSchema>;

// ---------------------------------------------------------------------------
// Admin users
// ---------------------------------------------------------------------------

export const adminUserListItemSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  phone: z.string().nullable(),
  roles: z.array(z.nativeEnum(RoleName)),
  isActive: z.boolean(),
  isEmailVerified: z.boolean(),
  createdAt: z.string().datetime(),
});
export type AdminUserListItem = z.infer<typeof adminUserListItemSchema>;

export const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  role: z.nativeEnum(RoleName).optional(),
});
export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;

export const createUserInputSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: passwordSchema,
  fullName: z.string().min(2, 'Họ tên quá ngắn').max(100),
  phone: clearableOptional(
    z.string().regex(/^(0|\+84)(\d{9,10})$/, 'Số điện thoại không hợp lệ'),
  ),
  roles: z.array(z.nativeEnum(RoleName)).min(1, 'Phải chọn ít nhất 1 vai trò'),
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const adminUpdateUserInputSchema = z.object({
  fullName: z.string().min(2, 'Họ tên quá ngắn').max(100).optional(),
  phone: clearableOptional(
    z.string().regex(/^(0|\+84)(\d{9,10})$/, 'Số điện thoại không hợp lệ'),
  ),
  isActive: z.boolean().optional(),
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserInputSchema>;

export const updateUserRolesInputSchema = z.object({
  roles: z.array(z.nativeEnum(RoleName)).min(1, 'Phải có ít nhất 1 vai trò'),
});
export type UpdateUserRolesInput = z.infer<typeof updateUserRolesInputSchema>;

// --- Admin blog ---

export const blogStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);
export type BlogPostStatus = z.infer<typeof blogStatusSchema>;

export const blogCategoryInputSchema = z.object({
  name: z.string().min(2, 'Tên quá ngắn').max(100),
  slug: slugSchema,
});
export type BlogCategoryInput = z.infer<typeof blogCategoryInputSchema>;

export const adminBlogCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  postCount: z.number().int(),
});
export type AdminBlogCategory = z.infer<typeof adminBlogCategorySchema>;

export const blogPostInputSchema = z.object({
  title: z.string().min(2, 'Tiêu đề quá ngắn').max(200),
  slug: slugSchema,
  excerpt: z.string().max(300).optional(),
  content: z.string().min(1, 'Nội dung không được để trống'),
  coverImageUrl: imageUrlSchema.optional(),
  categoryId: z.string().uuid().optional(),
  status: blogStatusSchema.default('DRAFT'),
  metaTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(300).optional(),
});
export type BlogPostInput = z.infer<typeof blogPostInputSchema>;

export const adminBlogPostListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  status: blogStatusSchema,
  categoryName: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});
export type AdminBlogPostListItem = z.infer<typeof adminBlogPostListItemSchema>;

export const adminBlogPostQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  status: blogStatusSchema.optional(),
});
export type AdminBlogPostQuery = z.infer<typeof adminBlogPostQuerySchema>;

export const adminBlogPostDetailSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  content: z.string(),
  coverImageUrl: z.string().nullable(),
  categoryId: z.string().uuid().nullable(),
  status: blogStatusSchema,
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AdminBlogPostDetail = z.infer<typeof adminBlogPostDetailSchema>;

// --- Admin banners ---

export const bannerPositionSchema = z.enum([
  'HOME_HERO',
  'HOME_MIDDLE',
  'CATEGORY_TOP',
  'SIDEBAR',
]);
export type BannerPosition = z.infer<typeof bannerPositionSchema>;

export const bannerInputSchema = z.object({
  title: z.string().min(2, 'Tiêu đề quá ngắn').max(150),
  imageUrl: imageUrlSchema,
  linkUrl: linkUrlSchema.optional(),
  position: bannerPositionSchema,
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});
export type BannerInput = z.infer<typeof bannerInputSchema>;

export const adminBannerSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  imageUrl: z.string(),
  linkUrl: z.string().nullable(),
  position: bannerPositionSchema,
  sortOrder: z.number().int(),
  isActive: z.boolean(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
});
export type AdminBanner = z.infer<typeof adminBannerSchema>;

// --- Admin coupons ---

export const couponTypeSchema = z.enum(['PERCENTAGE', 'FIXED_AMOUNT']);
export type CouponType = z.infer<typeof couponTypeSchema>;

const couponCodeSchema = z
  .string()
  .trim()
  .min(3, 'Mã quá ngắn')
  .max(30)
  .regex(/^[A-Za-z0-9_-]+$/, 'Mã chỉ gồm chữ cái, số, gạch ngang và gạch dưới')
  .transform((code) => code.toUpperCase());

export const couponInputSchema = z
  .object({
    code: couponCodeSchema,
    description: z.string().max(300).optional(),
    type: couponTypeSchema,
    value: z.coerce.number().int().min(1),
    minOrderAmount: z.coerce.number().int().min(0).optional(),
    maxDiscountAmount: z.coerce.number().int().min(1).optional(),
    usageLimit: z.coerce.number().int().min(1).optional(),
    perUserLimit: z.coerce.number().int().min(1).optional(),
    startsAt: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.type !== 'PERCENTAGE' || data.value <= 100, {
    message: 'Giảm giá theo phần trăm không được vượt quá 100',
    path: ['value'],
  });
export type CouponInput = z.infer<typeof couponInputSchema>;

export const adminCouponSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  description: z.string().nullable(),
  type: couponTypeSchema,
  value: z.number().int(),
  minOrderAmount: z.number().int().nullable(),
  maxDiscountAmount: z.number().int().nullable(),
  usageLimit: z.number().int().nullable(),
  usageCount: z.number().int(),
  perUserLimit: z.number().int().nullable(),
  startsAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  isActive: z.boolean(),
});
export type AdminCoupon = z.infer<typeof adminCouponSchema>;

export const adminCouponQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
});
export type AdminCouponQuery = z.infer<typeof adminCouponQuerySchema>;

// --- Admin flash sales ---

export const flashSaleItemInputSchema = z.object({
  productId: z.string().uuid(),
  salePrice: z.coerce.number().int().min(1),
  stockLimit: z.coerce.number().int().min(1).optional(),
});
export type FlashSaleItemInput = z.infer<typeof flashSaleItemInputSchema>;

export const flashSaleInputSchema = z.object({
  name: z.string().min(2, 'Tên quá ngắn').max(150),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean().default(true),
  items: z.array(flashSaleItemInputSchema).min(1, 'Phải có ít nhất 1 sản phẩm'),
});
export type FlashSaleInput = z.infer<typeof flashSaleInputSchema>;

export const adminFlashSaleItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  originalPrice: z.number().int(),
  salePrice: z.number().int(),
  stockLimit: z.number().int().nullable(),
  soldCount: z.number().int(),
});
export type AdminFlashSaleItem = z.infer<typeof adminFlashSaleItemSchema>;

export const adminFlashSaleListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean(),
  itemCount: z.number().int(),
});
export type AdminFlashSaleListItem = z.infer<typeof adminFlashSaleListItemSchema>;

export const adminFlashSaleDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  isActive: z.boolean(),
  items: z.array(adminFlashSaleItemSchema),
});
export type AdminFlashSaleDetail = z.infer<typeof adminFlashSaleDetailSchema>;

// --- Admin audit logs ---

export const adminAuditLogItemSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
  actorEmail: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type AdminAuditLogItem = z.infer<typeof adminAuditLogItemSchema>;

export const adminAuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  actorId: z.string().uuid().optional(),
  entityType: z.string().optional(),
  action: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});
export type AdminAuditLogQuery = z.infer<typeof adminAuditLogQuerySchema>;

// --- Admin reports ---

export const reportRangeQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'month']).default('day'),
});
export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>;

export const revenueReportPointSchema = z.object({
  bucket: z.string(),
  revenue: z.number().int(),
  orderCount: z.number().int(),
});
export type RevenueReportPoint = z.infer<typeof revenueReportPointSchema>;

export const topProductReportItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  quantitySold: z.number().int(),
  revenue: z.number().int(),
});
export type TopProductReportItem = z.infer<typeof topProductReportItemSchema>;

export const orderStatusBreakdownItemSchema = z.object({
  status: orderStatusSchema,
  count: z.number().int(),
});
export type OrderStatusBreakdownItem = z.infer<typeof orderStatusBreakdownItemSchema>;

// --- Admin media ---

export const mediaTypeSchema = z.enum(['IMAGE', 'VIDEO', 'DOCUMENT']);
export type MediaType = z.infer<typeof mediaTypeSchema>;

export const adminMediaAssetSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  url: z.string(),
  type: mediaTypeSchema,
  mimeType: z.string(),
  sizeBytes: z.number().int(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  altText: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type AdminMediaAsset = z.infer<typeof adminMediaAssetSchema>;

export const adminMediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  type: mediaTypeSchema.optional(),
});
export type AdminMediaQuery = z.infer<typeof adminMediaQuerySchema>;

// --- Admin settings ---

export const siteSettingsSchema = z.object({
  siteName: z.string().min(1, 'Tên cửa hàng không được để trống').max(150),
  contactEmail: clearableOptional(z.string().email('Email không hợp lệ')),
  contactPhone: clearableOptional(
    z.string().regex(/^(0|\+84)(\d{9,10})$/, 'Số điện thoại không hợp lệ'),
  ),
  facebookUrl: clearableOptional(z.string().url('URL không hợp lệ')),
  freeShippingThreshold: z.coerce.number().int().min(0),
  flatShippingFee: z.coerce.number().int().min(0),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const updateSiteSettingsSchema = siteSettingsSchema.partial();
export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;

// --- Admin gift vouchers ---

const giftVoucherCodeSchema = z
  .string()
  .trim()
  .min(3, 'Mã quá ngắn')
  .max(30)
  .regex(/^[A-Za-z0-9_-]+$/, 'Mã chỉ gồm chữ cái, số, gạch ngang và gạch dưới')
  .transform((code) => code.toUpperCase());

export const giftVoucherInputSchema = z.object({
  code: giftVoucherCodeSchema,
  amount: z.coerce.number().int().min(1),
  recipientEmail: clearableOptional(z.string().email('Email không hợp lệ')),
  expiresAt: clearableOptional(z.string().datetime()),
  isActive: z.boolean().default(true),
});
export type GiftVoucherInput = z.infer<typeof giftVoucherInputSchema>;

export const updateGiftVoucherInputSchema = z.object({
  balance: z.coerce.number().int().min(0).optional(),
  recipientEmail: clearableOptional(z.string().email('Email không hợp lệ')),
  expiresAt: clearableOptional(z.string().datetime()),
  isActive: z.boolean().optional(),
});
export type UpdateGiftVoucherInput = z.infer<typeof updateGiftVoucherInputSchema>;

export const adminGiftVoucherSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  amount: z.number().int(),
  balance: z.number().int(),
  isActive: z.boolean(),
  recipientEmail: z.string().nullable(),
  expiresAt: z.string().datetime().nullable(),
  redeemedAt: z.string().datetime().nullable(),
});
export type AdminGiftVoucher = z.infer<typeof adminGiftVoucherSchema>;

export const adminGiftVoucherQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
});
export type AdminGiftVoucherQuery = z.infer<typeof adminGiftVoucherQuerySchema>;

// --- Admin combo deals ---

export const comboItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).default(1),
});
export type ComboItemInput = z.infer<typeof comboItemInputSchema>;

export const comboDealInputSchema = z.object({
  name: z.string().min(2, 'Tên quá ngắn').max(150),
  slug: slugSchema,
  description: z.string().max(1000).optional(),
  comboPrice: z.coerce.number().int().min(1),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  items: z.array(comboItemInputSchema).min(2, 'Combo cần ít nhất 2 sản phẩm'),
});
export type ComboDealInput = z.infer<typeof comboDealInputSchema>;

export const adminComboItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  productName: z.string(),
  unitPrice: z.number().int(),
  quantity: z.number().int(),
});
export type AdminComboItem = z.infer<typeof adminComboItemSchema>;

export const adminComboDealListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  comboPrice: z.number().int(),
  isActive: z.boolean(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  itemCount: z.number().int(),
});
export type AdminComboDealListItem = z.infer<typeof adminComboDealListItemSchema>;

export const adminComboDealDetailSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  comboPrice: z.number().int(),
  isActive: z.boolean(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  items: z.array(adminComboItemSchema),
});
export type AdminComboDealDetail = z.infer<typeof adminComboDealDetailSchema>;

// --- Admin buy-X-get-Y rules ---

export const buyXGetYRuleInputSchema = z.object({
  name: z.string().min(2, 'Tên quá ngắn').max(150),
  buyProductId: z.string().uuid(),
  buyQuantity: z.coerce.number().int().min(1),
  getProductId: z.string().uuid(),
  getQuantity: z.coerce.number().int().min(1),
  discountPercent: z.coerce.number().int().min(1).max(100).default(100),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});
export type BuyXGetYRuleInput = z.infer<typeof buyXGetYRuleInputSchema>;

export const adminBuyXGetYRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  buyProductId: z.string().uuid(),
  buyProductName: z.string(),
  buyQuantity: z.number().int(),
  getProductId: z.string().uuid(),
  getProductName: z.string(),
  getQuantity: z.number().int(),
  discountPercent: z.number().int(),
  isActive: z.boolean(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
});
export type AdminBuyXGetYRule = z.infer<typeof adminBuyXGetYRuleSchema>;

// --- Admin free shipping rules ---

export const freeShippingRuleInputSchema = z.object({
  name: z.string().min(2, 'Tên quá ngắn').max(150),
  minOrderAmount: z.coerce.number().int().min(0),
  applicableProvinces: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});
export type FreeShippingRuleInput = z.infer<typeof freeShippingRuleInputSchema>;

export const adminFreeShippingRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  minOrderAmount: z.number().int(),
  applicableProvinces: z.array(z.string()).nullable(),
  isActive: z.boolean(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
});
export type AdminFreeShippingRule = z.infer<typeof adminFreeShippingRuleSchema>;
