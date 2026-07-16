import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminCoupon,
  type AdminCouponQuery,
  type CouponInput,
  type PaginatedResponse,
  adminCouponQuerySchema,
  couponInputSchema,
} from '@repo/contracts';
import { AuditLog } from '../../../common/decorators/audit-log.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminCouponsService } from './admin-coupons.service';

@ApiTags('admin-coupons')
@ApiBearerAuth()
@Controller('admin/coupons')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
@RequirePermissions('marketing:read')
@AuditLog('Coupon')
export class AdminCouponsController {
  constructor(private readonly adminCouponsService: AdminCouponsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách mã giảm giá' })
  findList(
    @Query(new ZodValidationPipe(adminCouponQuerySchema)) query: AdminCouponQuery,
  ): Promise<PaginatedResponse<AdminCoupon>> {
    return this.adminCouponsService.findList(query);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @RequirePermissions('marketing:manage')
  @ApiOperation({ summary: '[Admin] Tạo mã giảm giá mới' })
  create(
    @Body(new ZodValidationPipe(couponInputSchema)) body: CouponInput,
  ): Promise<AdminCoupon> {
    return this.adminCouponsService.create(body);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @RequirePermissions('marketing:manage')
  @ApiOperation({ summary: '[Admin] Cập nhật mã giảm giá' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(couponInputSchema)) body: CouponInput,
  ): Promise<AdminCoupon> {
    return this.adminCouponsService.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @RequirePermissions('marketing:manage')
  @ApiOperation({ summary: '[Admin] Xoá mã giảm giá' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminCouponsService.remove(id);
    return { success: true };
  }
}
