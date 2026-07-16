import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminGiftVoucher,
  type AdminGiftVoucherQuery,
  type GiftVoucherInput,
  type PaginatedResponse,
  type UpdateGiftVoucherInput,
  adminGiftVoucherQuerySchema,
  giftVoucherInputSchema,
  updateGiftVoucherInputSchema,
} from '@repo/contracts';
import { AuditLog } from '../../../common/decorators/audit-log.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminGiftVouchersService } from './admin-gift-vouchers.service';

@ApiTags('admin-gift-vouchers')
@ApiBearerAuth()
@Controller('admin/gift-vouchers')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
@AuditLog('GiftVoucher')
export class AdminGiftVouchersController {
  constructor(private readonly adminGiftVouchersService: AdminGiftVouchersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách phiếu quà tặng' })
  findList(
    @Query(new ZodValidationPipe(adminGiftVoucherQuerySchema)) query: AdminGiftVoucherQuery,
  ): Promise<PaginatedResponse<AdminGiftVoucher>> {
    return this.adminGiftVouchersService.findList(query);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Tạo phiếu quà tặng mới' })
  create(
    @Body(new ZodValidationPipe(giftVoucherInputSchema)) body: GiftVoucherInput,
  ): Promise<AdminGiftVoucher> {
    return this.adminGiftVouchersService.create(body);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Cập nhật phiếu quà tặng' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGiftVoucherInputSchema)) body: UpdateGiftVoucherInput,
  ): Promise<AdminGiftVoucher> {
    return this.adminGiftVouchersService.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Xoá phiếu quà tặng' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminGiftVouchersService.remove(id);
    return { success: true };
  }
}
