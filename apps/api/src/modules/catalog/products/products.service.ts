import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductRelationType } from '@prisma/client';
import type {
  PaginatedResponse,
  ProductDetail,
  ProductListItem,
  ProductListQuery,
} from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

const LIST_SELECT = {
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

type ProductListRow = Prisma.ProductGetPayload<{ select: typeof LIST_SELECT }>;

function isRowInStock(row: {
  inventory: { quantityOnHand: number; quantityReserved: number } | null;
  variants: { id: string }[];
}): boolean {
  if (row.variants.length > 0) return true;
  if (!row.inventory) return true;
  return row.inventory.quantityOnHand - row.inventory.quantityReserved > 0;
}

function toListItem(row: ProductListRow): ProductListItem {
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
    inStock: isRowInStock(row),
  };
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(query: ProductListQuery): Promise<PaginatedResponse<ProductListItem>> {
    const where: Prisma.ProductWhereInput = {
      status: 'PUBLISHED',
      ...(query.categorySlug && {
        categories: { some: { category: { slug: query.categorySlug } } },
      }),
      ...(query.brandSlug && { brand: { slug: query.brandSlug } }),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined && { gte: query.minPrice }),
              ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
            },
          }
        : {}),
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { shortDescription: { contains: query.q, mode: 'insensitive' } },
          { sku: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      query.sort === 'price_asc'
        ? { price: 'asc' }
        : query.sort === 'price_desc'
          ? { price: 'desc' }
          : query.sort === 'rating'
            ? { avgRating: 'desc' }
            : { publishedAt: 'desc' };

    const [rows, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: LIST_SELECT,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows.map(toListItem),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async findBySlug(slug: string): Promise<ProductDetail> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        brand: { select: { name: true, slug: true } },
        categories: { select: { category: { select: { name: true, slug: true } } } },
        images: { orderBy: { sortOrder: 'asc' } },
        videos: { orderBy: { sortOrder: 'asc' } },
        variants: {
          where: { isActive: true },
          include: { inventory: { select: { quantityOnHand: true, quantityReserved: true } } },
        },
        specifications: { orderBy: { sortOrder: 'asc' } },
        faqs: { orderBy: { sortOrder: 'asc' } },
        inventory: { select: { quantityOnHand: true, quantityReserved: true } },
        relationsFrom: {
          include: { related: { select: LIST_SELECT } },
        },
      },
    });

    if (!product || product.status !== 'PUBLISHED') {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const relationsByType = (type: ProductRelationType): ProductListItem[] =>
      product.relationsFrom
        .filter((relation) => relation.type === type)
        .map((relation) => toListItem(relation.related));

    return {
      id: product.id,
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      material: product.material,
      origin: product.origin,
      ageMin: product.ageMin,
      ageMax: product.ageMax,
      weightGrams: product.weightGrams,
      avgRating: product.avgRating,
      reviewCount: product.reviewCount,
      brand: product.brand,
      categories: product.categories.map((entry) => entry.category),
      images: product.images.map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.altText,
        isPrimary: image.isPrimary,
        sortOrder: image.sortOrder,
      })),
      videos: product.videos.map((video) => ({
        id: video.id,
        url: video.url,
        thumbnailUrl: video.thumbnailUrl,
        title: video.title,
      })),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        priceOverride: variant.priceOverride,
        attributes: variant.attributes as Record<string, string>,
        imageUrl: variant.imageUrl,
        inStock: variant.inventory
          ? variant.inventory.quantityOnHand - variant.inventory.quantityReserved > 0
          : true,
      })),
      specifications: product.specifications.map((spec) => ({
        label: spec.label,
        value: spec.value,
      })),
      faqs: product.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
      related: relationsByType(ProductRelationType.RELATED),
      upsell: relationsByType(ProductRelationType.UPSELL),
      crossSell: relationsByType(ProductRelationType.CROSS_SELL),
      inStock: isRowInStock({ inventory: product.inventory, variants: product.variants }),
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
    };
  }
}
