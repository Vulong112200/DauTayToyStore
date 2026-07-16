import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminOrderListItem,
  type AdminOrderQuery,
  type OrderView,
  type PaginatedResponse,
  type UpdateOrderStatusInput,
  adminOrderQuerySchema,
  updateOrderStatusInputSchema,
} from '@repo/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminOrdersService } from './admin-orders.service';

@ApiTags('admin-orders')
@ApiBearerAuth()
@Controller('admin/orders')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách đơn hàng' })
  findList(
    @Query(new ZodValidationPipe(adminOrderQuerySchema)) query: AdminOrderQuery,
  ): Promise<PaginatedResponse<AdminOrderListItem>> {
    return this.adminOrdersService.findList(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Chi tiết đơn hàng' })
  findById(@Param('id') id: string): Promise<OrderView> {
    return this.adminOrdersService.findById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '[Admin] Cập nhật trạng thái đơn hàng' })
  updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOrderStatusInputSchema)) body: UpdateOrderStatusInput,
  ): Promise<OrderView> {
    return this.adminOrdersService.updateStatus(id, body);
  }
}
