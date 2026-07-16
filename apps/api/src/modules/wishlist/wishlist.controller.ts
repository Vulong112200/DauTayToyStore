import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type AddWishlistItemInput,
  type WishlistView,
  addWishlistItemSchema,
} from '@repo/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@ApiBearerAuth()
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách yêu thích' })
  getWishlist(@CurrentUser() user: AuthenticatedUser): Promise<WishlistView> {
    return this.wishlistService.getWishlist(user.id);
  }

  @Post('items')
  @ApiOperation({ summary: 'Thêm sản phẩm vào danh sách yêu thích' })
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(addWishlistItemSchema)) body: AddWishlistItemInput,
  ): Promise<WishlistView> {
    return this.wishlistService.addItem(user.id, body);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Xoá sản phẩm khỏi danh sách yêu thích' })
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ): Promise<WishlistView> {
    return this.wishlistService.removeItem(user.id, productId);
  }
}
