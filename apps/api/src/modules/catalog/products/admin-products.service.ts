import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  AdminProductDetail,
  AdminProductListItem,
  AdminProductQuery,
  PaginatedResponse,
  ProductInput,
} from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

const DETAIL_INCLUDE = {
  categories: { select: { categoryId: true } },
  images: { orderBy: { sortOrder: 'asc' } },
  specifications: { orderBy: { sortOrder: 'asc' } },
  faqs: { orderBy: { sortOrder: 'asc' } },
  inventory: { select: { quantityOnHand: true } },
} satisfies Prisma.ProductInclude;

type ProductDetailRow = Prisma.ProductGetPayload<{ include: typeof DETAIL_INCLUDE }>;

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(query: AdminProductQuery): Promise<PaginatedResponse<AdminProductListItem>> {
    const where: Prisma.ProductWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.q && {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { sku: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, totalItems] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          status: true,
          price: true,
          updatedAt: true,
          brand: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1, select: { url: true } },
          inventory: { select: { quantityOnHand: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        sku: row.sku,
        status: row.status,
        price: row.price,
        primaryImageUrl: row.images[0]?.url ?? null,
        brandName: row.brand?.name ?? null,
        quantityOnHand: row.inventory?.quantityOnHand ?? null,
        updatedAt: row.updatedAt.toISOString(),
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async findById(id: string): Promise<AdminProductDetail> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    return this.toDetail(product);
  }

  async create(input: ProductInput): Promise<AdminProductDetail> {
    await this.assertUniqueSlugAndSku(input.slug, input.sku);

    const product = await this.prisma.product.create({
      data: {
        ...this.toBaseData(input),
        publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
        categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
        images: { create: input.images.map((image, index) => this.toImageData(image, index)) },
        specifications: {
          create: input.specifications.map((spec, index) => ({ ...spec, sortOrder: index })),
        },
        faqs: { create: input.faqs.map((faq, index) => ({ ...faq, sortOrder: index })) },
        inventory: { create: { quantityOnHand: input.quantityOnHand } },
      },
      include: DETAIL_INCLUDE,
    });

    return this.toDetail(product);
  }

  async update(id: string, input: ProductInput): Promise<AdminProductDetail> {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, publishedAt: true },
    });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    await this.assertUniqueSlugAndSku(input.slug, input.sku, id);

    const product = await this.prisma.$transaction(async (tx) => {
      // Replace nested collections wholesale — simplest correct approach for
      // admin-managed lists (images/specs/faqs), avoiding per-row diffing.
      await tx.productCategory.deleteMany({ where: { productId: id } });
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productSpecification.deleteMany({ where: { productId: id } });
      await tx.productFaq.deleteMany({ where: { productId: id } });

      return tx.product.update({
        where: { id },
        data: {
          ...this.toBaseData(input),
          publishedAt:
            input.status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
          categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
          images: { create: input.images.map((image, index) => this.toImageData(image, index)) },
          specifications: {
            create: input.specifications.map((spec, index) => ({ ...spec, sortOrder: index })),
          },
          faqs: { create: input.faqs.map((faq, index) => ({ ...faq, sortOrder: index })) },
          inventory: {
            upsert: {
              create: { quantityOnHand: input.quantityOnHand },
              update: { quantityOnHand: input.quantityOnHand },
            },
          },
        },
        include: DETAIL_INCLUDE,
      });
    });

    return this.toDetail(product);
  }

  /** Archives rather than hard-deletes: OrderItem.product is onDelete:Restrict,
   * so a product referenced by any past order could never be hard-deleted anyway. */
  async remove(id: string): Promise<void> {
    const existing = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    await this.prisma.product.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  private toBaseData(input: ProductInput) {
    return {
      name: input.name,
      slug: input.slug,
      sku: input.sku,
      barcode: input.barcode,
      brandId: input.brandId,
      status: input.status,
      shortDescription: input.shortDescription,
      description: input.description,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      material: input.material,
      origin: input.origin,
      ageMin: input.ageMin,
      ageMax: input.ageMax,
      weightGrams: input.weightGrams,
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
    };
  }

  private toImageData(image: ProductInput['images'][number], index: number) {
    return {
      url: image.url,
      altText: image.altText,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder ?? index,
    };
  }

  private async assertUniqueSlugAndSku(
    slug: string,
    sku: string,
    excludeId?: string,
  ): Promise<void> {
    const conflict = await this.prisma.product.findFirst({
      where: {
        OR: [{ slug }, { sku }],
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { slug: true, sku: true },
    });

    if (conflict) {
      throw new ConflictException(
        conflict.slug === slug ? 'Slug đã được sử dụng' : 'SKU đã được sử dụng',
      );
    }
  }

  private toDetail(product: ProductDetailRow): AdminProductDetail {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      barcode: product.barcode,
      brandId: product.brandId,
      categoryIds: product.categories.map((entry) => entry.categoryId),
      status: product.status,
      shortDescription: product.shortDescription,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      material: product.material,
      origin: product.origin,
      ageMin: product.ageMin,
      ageMax: product.ageMax,
      weightGrams: product.weightGrams,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      quantityOnHand: product.inventory?.quantityOnHand ?? 0,
      images: product.images.map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.altText,
        isPrimary: image.isPrimary,
        sortOrder: image.sortOrder,
      })),
      specifications: product.specifications.map((spec) => ({
        label: spec.label,
        value: spec.value,
      })),
      faqs: product.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
    };
  }
}
