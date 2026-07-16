import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AddCartItemInput, CartItemView, CartView } from '@repo/contracts';
import { CartIdentity } from '../../common/cart-identity/cart-identity';
import { resolveAvailableStock } from '../../common/utils/inventory.util';
import { PrismaService } from '../../infra/prisma/prisma.service';

const ITEM_INCLUDE = {
  product: {
    select: {
      name: true,
      slug: true,
      price: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
      inventory: { select: { quantityOnHand: true, quantityReserved: true } },
    },
  },
  variant: {
    select: {
      name: true,
      priceOverride: true,
      imageUrl: true,
      inventory: { select: { quantityOnHand: true, quantityReserved: true } },
    },
  },
} satisfies Prisma.CartItemInclude;

type CartItemRow = Prisma.CartItemGetPayload<{ include: typeof ITEM_INCLUDE }>;

function toItemView(item: CartItemRow): CartItemView {
  const unitPrice = item.variant?.priceOverride ?? item.product.price;
  const availableStock = item.variant
    ? resolveAvailableStock(item.variant.inventory)
    : resolveAvailableStock(item.product.inventory);

  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    productName: item.product.name,
    productSlug: item.product.slug,
    variantName: item.variant?.name ?? null,
    imageUrl: item.variant?.imageUrl ?? item.product.images[0]?.url ?? null,
    unitPrice,
    quantity: item.quantity,
    lineTotal: unitPrice * item.quantity,
    availableStock,
  };
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(identity: CartIdentity): Promise<CartView> {
    const cart = await this.getOrCreateCart(identity);
    return this.loadCartView(cart.id);
  }

  async addItem(identity: CartIdentity, input: AddCartItemInput): Promise<CartView> {
    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true, status: true, inventory: { select: { quantityOnHand: true, quantityReserved: true } } },
    });

    if (!product || product.status !== 'PUBLISHED') {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    let availableStock = resolveAvailableStock(product.inventory);

    if (input.variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: input.variantId },
        select: {
          productId: true,
          isActive: true,
          inventory: { select: { quantityOnHand: true, quantityReserved: true } },
        },
      });

      if (!variant || variant.productId !== product.id || !variant.isActive) {
        throw new NotFoundException('Không tìm thấy biến thể sản phẩm');
      }

      availableStock = resolveAvailableStock(variant.inventory);
    }

    const cart = await this.getOrCreateCart(identity);

    const existing = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: input.productId, variantId: input.variantId ?? null },
    });

    const desiredQuantity = (existing?.quantity ?? 0) + input.quantity;
    if (desiredQuantity > availableStock) {
      throw new BadRequestException('Số lượng vượt quá hàng có sẵn trong kho');
    }

    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: desiredQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: input.productId,
          variantId: input.variantId ?? null,
          quantity: input.quantity,
        },
      });
    }

    return this.loadCartView(cart.id);
  }

  async updateItemQuantity(
    identity: CartIdentity,
    itemId: string,
    quantity: number,
  ): Promise<CartView> {
    const cart = await this.getOrCreateCart(identity);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: ITEM_INCLUDE,
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    const availableStock = item.variant
      ? resolveAvailableStock(item.variant.inventory)
      : resolveAvailableStock(item.product.inventory);

    if (quantity > availableStock) {
      throw new BadRequestException('Số lượng vượt quá hàng có sẵn trong kho');
    }

    await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });

    return this.loadCartView(cart.id);
  }

  async removeItem(identity: CartIdentity, itemId: string): Promise<CartView> {
    const cart = await this.getOrCreateCart(identity);
    const { count } = await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cartId: cart.id },
    });

    if (count === 0) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    return this.loadCartView(cart.id);
  }

  private async getOrCreateCart(identity: CartIdentity): Promise<{ id: string }> {
    if (identity.userId) {
      return this.prisma.cart.upsert({
        where: { userId: identity.userId },
        update: {},
        create: { userId: identity.userId },
        select: { id: true },
      });
    }

    if (identity.sessionId) {
      return this.prisma.cart.upsert({
        where: { sessionId: identity.sessionId },
        update: {},
        create: { sessionId: identity.sessionId },
        select: { id: true },
      });
    }

    throw new BadRequestException('Thiếu thông tin định danh giỏ hàng');
  }

  private async loadCartView(cartId: string): Promise<CartView> {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
      orderBy: { createdAt: 'asc' },
      include: ITEM_INCLUDE,
    });

    const views = items.map(toItemView);

    return {
      id: cartId,
      items: views,
      subtotal: views.reduce((sum, item) => sum + item.lineTotal, 0),
      itemCount: views.reduce((sum, item) => sum + item.quantity, 0),
    };
  }
}
