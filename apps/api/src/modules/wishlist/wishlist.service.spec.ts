import { NotFoundException } from '@nestjs/common';
import { PromotionContextService } from '../../common/promotion-context/promotion-context.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { WishlistService } from './wishlist.service';

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: {
    product: { findUnique: jest.Mock };
    wishlist: { upsert: jest.Mock };
    wishlistItem: { upsert: jest.Mock; deleteMany: jest.Mock; findMany: jest.Mock };
  };
  let promotionContext: { loadFlashSaleItems: jest.Mock };

  const wishlist = { id: 'wishlist-1' };

  beforeEach(() => {
    prisma = {
      product: { findUnique: jest.fn() },
      wishlist: { upsert: jest.fn().mockResolvedValue(wishlist) },
      wishlistItem: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    promotionContext = { loadFlashSaleItems: jest.fn().mockResolvedValue([]) };
    service = new WishlistService(
      prisma as unknown as PrismaService,
      promotionContext as unknown as PromotionContextService,
    );
  });

  describe('addItem', () => {
    it('throws NotFoundException when the product does not exist or is not published', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.addItem('user-1', { productId: 'missing' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('upserts the wishlist and the item', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p1', status: 'PUBLISHED' });

      await service.addItem('user-1', { productId: 'p1' });

      expect(prisma.wishlist.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(prisma.wishlistItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { wishlistId_productId: { wishlistId: 'wishlist-1', productId: 'p1' } },
        }),
      );
    });
  });

  describe('removeItem', () => {
    it('deletes the item scoped to the wishlist', async () => {
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 1 });

      await service.removeItem('user-1', 'p1');

      expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
        where: { wishlistId: 'wishlist-1', productId: 'p1' },
      });
    });
  });

  describe('getWishlist', () => {
    it('maps items to the wishlist view shape', async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([
        {
          productId: 'p1',
          addedAt: new Date('2026-01-01'),
          product: {
            id: 'p1',
            slug: 'lego-city',
            name: 'LEGO City',
            price: 100000,
            compareAtPrice: null,
            avgRating: 4.5,
            reviewCount: 3,
            brand: null,
            images: [],
            inventory: null,
            variants: [],
          },
        },
      ]);

      const result = await service.getWishlist('user-1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        productId: 'p1',
        addedAt: '2026-01-01T00:00:00.000Z',
        product: { slug: 'lego-city', inStock: true },
      });
    });
  });
});
