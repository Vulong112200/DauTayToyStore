import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type AddCartItemInput,
  type ApplyCartCouponInput,
  type CartView,
  type UpdateCartItemInput,
  addCartItemSchema,
  applyCartCouponSchema,
  updateCartItemSchema,
} from '@repo/contracts';
import { CartIdentity } from '../../common/cart-identity/cart-identity';
import { CurrentCartIdentity } from '../../common/cart-identity/cart-identity.decorator';
import { CartIdentityGuard } from '../../common/cart-identity/cart-identity.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CartService } from './cart.service';

@ApiTags('cart')
@Controller('cart')
@Public()
@UseGuards(CartIdentityGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy giỏ hàng hiện tại' })
  getCart(@CurrentCartIdentity() identity: CartIdentity): Promise<CartView> {
    return this.cartService.getCart(identity);
  }

  @Post('items')
  @ApiOperation({ summary: 'Thêm sản phẩm vào giỏ hàng' })
  addItem(
    @CurrentCartIdentity() identity: CartIdentity,
    @Body(new ZodValidationPipe(addCartItemSchema)) body: AddCartItemInput,
  ): Promise<CartView> {
    return this.cartService.addItem(identity, body);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Cập nhật số lượng sản phẩm trong giỏ hàng' })
  updateItem(
    @CurrentCartIdentity() identity: CartIdentity,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(updateCartItemSchema)) body: UpdateCartItemInput,
  ): Promise<CartView> {
    return this.cartService.updateItemQuantity(identity, itemId, body.quantity);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Xoá sản phẩm khỏi giỏ hàng' })
  removeItem(
    @CurrentCartIdentity() identity: CartIdentity,
    @Param('itemId') itemId: string,
  ): Promise<CartView> {
    return this.cartService.removeItem(identity, itemId);
  }

  @Post('coupon')
  @ApiOperation({ summary: 'Áp dụng mã giảm giá vào giỏ hàng' })
  applyCoupon(
    @CurrentCartIdentity() identity: CartIdentity,
    @Body(new ZodValidationPipe(applyCartCouponSchema)) body: ApplyCartCouponInput,
  ): Promise<CartView> {
    return this.cartService.applyCoupon(identity, body.code);
  }

  @Delete('coupon')
  @ApiOperation({ summary: 'Gỡ mã giảm giá khỏi giỏ hàng' })
  removeCoupon(@CurrentCartIdentity() identity: CartIdentity): Promise<CartView> {
    return this.cartService.removeCoupon(identity);
  }
}
