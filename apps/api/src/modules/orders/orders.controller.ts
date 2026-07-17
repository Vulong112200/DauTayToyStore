import { Body, Controller, Get, Ip, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type CheckoutInput,
  type CheckoutResult,
  type OrderListItem,
  type OrderTrackQuery,
  type OrderView,
  checkoutSchema,
  orderTrackQuerySchema,
} from '@repo/contracts';
import { CartIdentity } from '../../common/cart-identity/cart-identity';
import { CurrentCartIdentity } from '../../common/cart-identity/cart-identity.decorator';
import { CartIdentityGuard } from '../../common/cart-identity/cart-identity.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Public()
  @UseGuards(CartIdentityGuard)
  @ApiOperation({ summary: 'Đặt hàng từ giỏ hàng hiện tại (khách vãng lai hoặc đã đăng nhập)' })
  checkout(
    @CurrentCartIdentity() identity: CartIdentity,
    @Body(new ZodValidationPipe(checkoutSchema)) body: CheckoutInput,
    @Ip() ipAddr: string,
  ): Promise<CheckoutResult> {
    return this.ordersService.checkout(identity, body, ipAddr);
  }

  @Get('track')
  @Public()
  @ApiOperation({ summary: 'Tra cứu đơn hàng theo mã đơn hàng và email (không cần đăng nhập)' })
  track(
    @Query(new ZodValidationPipe(orderTrackQuerySchema)) query: OrderTrackQuery,
  ): Promise<OrderView> {
    return this.ordersService.trackByNumberAndEmail(query.orderNumber, query.email);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Danh sách đơn hàng của tôi' })
  listMine(@CurrentUser() user: AuthenticatedUser): Promise<OrderListItem[]> {
    return this.ordersService.listForUser(user.id);
  }

  @Get(':orderNumber')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chi tiết một đơn hàng của tôi' })
  getMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('orderNumber') orderNumber: string,
  ): Promise<OrderView> {
    return this.ordersService.getForUser(user.id, orderNumber);
  }
}
