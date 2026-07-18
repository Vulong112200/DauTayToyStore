import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductRelationType } from '@prisma/client';
import type {
  PaginatedResponse,
  ProductDetail,
  ProductListItem,
  ProductListQuery,
} from '@repo/contracts';
import { PromotionContextService } from '../../../common/promotion-context/promotion-context.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import {
  PRODUCT_LIST_SELECT,
  isProductRowInStock,
  resolveProductFlashSale,
  toProductListItem,
} from './product-list.util';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotionContext: PromotionContextService,
  ) {}

  /** Loads the currently-active flash-sale item per product (same source the cart's
   * promotion engine uses, so the badge price and the cart price can't disagree). If
   * a product is in more than one active sale, last-wins — matching how
   * `runPromotionEngine` de-dupes its own `flashByProduct` map. */
  private async loadFlashSaleMap(
    productIds: string[],
  ): Promise<Map<string, { salePrice: number; remainingStock: number | null }>> {
    const items = await this.promotionContext.loadFlashSaleItems(productIds);
    return new Map(items.map((item) => [item.productId, item]));
  }

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
        select: PRODUCT_LIST_SELECT,
      }),
      this.prisma.product.count({ where }),
    ]);

    const flashByProduct = await this.loadFlashSaleMap(rows.map((row) => row.id));

    return {
      items: rows.map((row) =>
        toProductListItem(row, resolveProductFlashSale(row.price, flashByProduct.get(row.id))),
      ),
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
          include: { related: { select: PRODUCT_LIST_SELECT } },
        },
      },
    });

    if (!product || product.status !== 'PUBLISHED') {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // One flash-sale lookup covering the main product AND every related/upsell/
    // cross-sell card shown on the page.
    const relatedProducts = product.relationsFrom.map((relation) => relation.related);
    const flashByProduct = await this.loadFlashSaleMap([
      product.id,
      ...relatedProducts.map((related) => related.id),
    ]);

    const relationsByType = (type: ProductRelationType): ProductListItem[] =>
      product.relationsFrom
        .filter((relation) => relation.type === type)
        .map((relation) =>
          toProductListItem(
            relation.related,
            resolveProductFlashSale(relation.related.price, flashByProduct.get(relation.related.id)),
          ),
        );

    return {
      id: product.id,
      slug: product.slug,
      sku: product.sku,
      name: product.name,
      shortDescription: product.shortDescription,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      flashSale: resolveProductFlashSale(product.price, flashByProduct.get(product.id)),
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
      inStock: isProductRowInStock({ inventory: product.inventory, variants: product.variants }),
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
    };
  }
}
