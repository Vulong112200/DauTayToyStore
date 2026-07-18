import { NotFoundException } from '@nestjs/common';
import { ProductRelationType } from '@prisma/client';
import { PromotionContextService } from '../../../common/promotion-context/promotion-context.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock };
  };
  let promotionContext: { loadFlashSaleItems: jest.Mock };

  beforeEach(() => {
    prisma = {
      product: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    };
    promotionContext = { loadFlashSaleItems: jest.fn().mockResolvedValue([]) };
    service = new ProductsService(
      prisma as unknown as PrismaService,
      promotionContext as unknown as PromotionContextService,
    );
  });

  describe('findList', () => {
    it('maps rows to list items and builds pagination meta', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          slug: 'lego-city',
          name: 'LEGO City',
          price: 890000,
          compareAtPrice: 990000,
          avgRating: 4.8,
          reviewCount: 12,
          brand: { name: 'LEGO' },
          images: [{ url: 'https://example.com/img.jpg' }],
          inventory: { quantityOnHand: 10, quantityReserved: 2 },
          variants: [],
        },
      ]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.findList({
        page: 1,
        pageSize: 20,
        sort: 'newest',
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'p1',
        slug: 'lego-city',
        primaryImageUrl: 'https://example.com/img.jpg',
        brandName: 'LEGO',
        inStock: true,
      });
      expect(result.meta).toEqual({ page: 1, pageSize: 20, totalItems: 1, totalPages: 1 });
    });

    it('attaches flash-sale pricing when the product is in an active in-stock flash sale', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          slug: 'lego-city',
          name: 'LEGO City',
          price: 200000,
          compareAtPrice: null,
          avgRating: 0,
          reviewCount: 0,
          brand: null,
          images: [],
          inventory: { quantityOnHand: 10, quantityReserved: 0 },
          variants: [],
        },
      ]);
      prisma.product.count.mockResolvedValue(1);
      promotionContext.loadFlashSaleItems.mockResolvedValue([
        { productId: 'p1', salePrice: 150000, remainingStock: 5 },
      ]);

      const result = await service.findList({ page: 1, pageSize: 20, sort: 'newest' });

      expect(result.items[0]?.flashSale).toEqual({ salePrice: 150000, discountPercent: 25 });
    });

    it('omits flash-sale pricing when the flash item is sold out', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p1',
          slug: 'lego-city',
          name: 'LEGO City',
          price: 200000,
          compareAtPrice: null,
          avgRating: 0,
          reviewCount: 0,
          brand: null,
          images: [],
          inventory: { quantityOnHand: 10, quantityReserved: 0 },
          variants: [],
        },
      ]);
      prisma.product.count.mockResolvedValue(1);
      promotionContext.loadFlashSaleItems.mockResolvedValue([
        { productId: 'p1', salePrice: 150000, remainingStock: 0 },
      ]);

      const result = await service.findList({ page: 1, pageSize: 20, sort: 'newest' });

      expect(result.items[0]?.flashSale).toBeNull();
    });

    it('marks a product out of stock when inventory is depleted and it has no variants', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'p2',
          slug: 'out-of-stock',
          name: 'Out of stock toy',
          price: 100000,
          compareAtPrice: null,
          avgRating: 0,
          reviewCount: 0,
          brand: null,
          images: [],
          inventory: { quantityOnHand: 5, quantityReserved: 5 },
          variants: [],
        },
      ]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.findList({ page: 1, pageSize: 20, sort: 'newest' });

      expect(result.items[0]?.inStock).toBe(false);
    });

    it('applies category/brand/search/price filters to the where clause', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findList({
        page: 2,
        pageSize: 10,
        sort: 'price_asc',
        categorySlug: 'do-choi-lap-rap',
        brandSlug: 'lego',
        q: 'xe cuu hoa',
        minPrice: 100000,
        maxPrice: 900000,
      });

      const [args] = prisma.product.findMany.mock.calls[0];
      expect(args.where).toMatchObject({
        status: 'PUBLISHED',
        categories: { some: { category: { slug: 'do-choi-lap-rap' } } },
        brand: { slug: 'lego' },
        price: { gte: 100000, lte: 900000 },
      });
      expect(args.orderBy).toEqual({ price: 'asc' });
      expect(args.skip).toBe(10);
      expect(args.take).toBe(10);
    });
  });

  describe('findBySlug', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the product is not published', async () => {
      prisma.product.findUnique.mockResolvedValue({ status: 'DRAFT' });

      await expect(service.findBySlug('draft-product')).rejects.toThrow(NotFoundException);
    });

    it('groups relationsFrom by type into related/upsell/crossSell', async () => {
      const relatedProduct = {
        id: 'related-1',
        slug: 'related',
        name: 'Related toy',
        price: 50000,
        compareAtPrice: null,
        avgRating: 4,
        reviewCount: 1,
        brand: null,
        images: [],
        inventory: null,
        variants: [],
      };

      prisma.product.findUnique.mockResolvedValue({
        id: 'p1',
        slug: 'main-product',
        sku: 'SKU-1',
        name: 'Main product',
        shortDescription: null,
        description: null,
        price: 100000,
        compareAtPrice: null,
        material: null,
        origin: null,
        ageMin: null,
        ageMax: null,
        weightGrams: null,
        avgRating: 5,
        reviewCount: 2,
        status: 'PUBLISHED',
        brand: null,
        categories: [],
        images: [],
        videos: [],
        variants: [],
        specifications: [],
        faqs: [],
        inventory: { quantityOnHand: 10, quantityReserved: 0 },
        relationsFrom: [
          { type: ProductRelationType.UPSELL, related: relatedProduct },
          { type: ProductRelationType.RELATED, related: relatedProduct },
        ],
        metaTitle: null,
        metaDescription: null,
      });

      const result = await service.findBySlug('main-product');

      expect(result.related).toHaveLength(1);
      expect(result.upsell).toHaveLength(1);
      expect(result.crossSell).toHaveLength(0);
      expect(result.inStock).toBe(true);
    });
  });
});
