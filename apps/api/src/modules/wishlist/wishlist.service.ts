import { Injectable, NotFoundException } from '@nestjs/common';
import type { AddWishlistItemInput, WishlistView } from '@repo/contracts';
import { PRODUCT_LIST_SELECT, toProductListItem } from '../catalog/products/product-list.util';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  async getWishlist(userId: string): Promise<WishlistView> {
    const wishlist = await this.getOrCreateWishlist(userId);
    return this.loadView(wishlist.id);
  }

  async addItem(userId: string, input: AddWishlistItemInput): Promise<WishlistView> {
    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true, status: true },
    });

    if (!product || product.status !== 'PUBLISHED') {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const wishlist = await this.getOrCreateWishlist(userId);

    await this.prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId: input.productId } },
      update: {},
      create: { wishlistId: wishlist.id, productId: input.productId },
    });

    return this.loadView(wishlist.id);
  }

  async removeItem(userId: string, productId: string): Promise<WishlistView> {
    const wishlist = await this.getOrCreateWishlist(userId);
    await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id, productId } });
    return this.loadView(wishlist.id);
  }

  private async getOrCreateWishlist(userId: string): Promise<{ id: string }> {
    return this.prisma.wishlist.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { id: true },
    });
  }

  private async loadView(wishlistId: string): Promise<WishlistView> {
    const items = await this.prisma.wishlistItem.findMany({
      where: { wishlistId },
      orderBy: { addedAt: 'desc' },
      include: { product: { select: PRODUCT_LIST_SELECT } },
    });

    return {
      items: items.map((item) => ({
        productId: item.productId,
        addedAt: item.addedAt.toISOString(),
        product: toProductListItem(item.product),
      })),
    };
  }
}
