import { ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminProductsService } from './admin-products.service';

describe('AdminProductsService', () => {
  let service: AdminProductsService;
  let prisma: {
    product: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
    productCategory: { deleteMany: jest.Mock };
    productImage: { deleteMany: jest.Mock };
    productSpecification: { deleteMany: jest.Mock };
    productFaq: { deleteMany: jest.Mock };
  };

  const productInput = {
    name: 'LEGO City',
    slug: 'lego-city',
    sku: 'SKU-1',
    categoryIds: [],
    status: 'DRAFT' as const,
    price: 100000,
    quantityOnHand: 10,
    images: [],
    specifications: [],
    faqs: [],
  };

  const productRow = {
    id: 'p1',
    name: 'LEGO City',
    slug: 'lego-city',
    sku: 'SKU-1',
    barcode: null,
    brandId: null,
    status: 'DRAFT',
    shortDescription: null,
    description: null,
    price: 100000,
    compareAtPrice: null,
    material: null,
    origin: null,
    ageMin: null,
    ageMax: null,
    weightGrams: null,
    metaTitle: null,
    metaDescription: null,
    categories: [],
    images: [],
    specifications: [],
    faqs: [],
    inventory: { quantityOnHand: 10 },
  };

  beforeEach(() => {
    prisma = {
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productCategory: { deleteMany: jest.fn() },
      productImage: { deleteMany: jest.fn() },
      productSpecification: { deleteMany: jest.fn() },
      productFaq: { deleteMany: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          productCategory: prisma.productCategory,
          productImage: prisma.productImage,
          productSpecification: prisma.productSpecification,
          productFaq: prisma.productFaq,
          product: { update: prisma.product.update },
        }),
      ),
    };
    service = new AdminProductsService(prisma as unknown as PrismaService);
  });

  describe('findList', () => {
    it('applies status and search filters', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findList({ page: 1, pageSize: 20, status: 'PUBLISHED', q: 'lego' });

      const [args] = prisma.product.findMany.mock.calls[0];
      expect(args.where).toMatchObject({
        status: 'PUBLISHED',
        OR: [
          { name: { contains: 'lego', mode: 'insensitive' } },
          { sku: { contains: 'lego', mode: 'insensitive' } },
        ],
      });
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('throws ConflictException when slug or sku already exists', async () => {
      prisma.product.findFirst.mockResolvedValue({ slug: 'lego-city', sku: 'SKU-1' });

      await expect(service.create(productInput)).rejects.toThrow(ConflictException);
    });

    it('creates the product with nested collections', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue(productRow);

      const result = await service.create(productInput);

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'LEGO City', slug: 'lego-city' }),
        }),
      );
      expect(result.id).toBe('p1');
      expect(result.quantityOnHand).toBe(10);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', productInput)).rejects.toThrow(NotFoundException);
    });

    it('replaces nested collections and updates the product', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', publishedAt: null });
      prisma.product.findFirst.mockResolvedValue(null);
      prisma.product.update.mockResolvedValue(productRow);

      await service.update('p1', productInput);

      expect(prisma.productImage.deleteMany).toHaveBeenCalledWith({ where: { productId: 'p1' } });
      expect(prisma.product.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('archives instead of hard-deleting', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1' });
      prisma.product.update.mockResolvedValue({});

      await service.remove('p1');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: 'ARCHIVED' },
      });
    });
  });
});
