import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminFlashSaleDetail,
  type AdminFlashSaleListItem,
  type FlashSaleInput,
  flashSaleInputSchema,
} from '@repo/contracts';
import { AuditLog } from '../../../common/decorators/audit-log.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminFlashSalesService } from './admin-flash-sales.service';

@ApiTags('admin-flash-sales')
@ApiBearerAuth()
@Controller('admin/flash-sales')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
@AuditLog('FlashSale')
export class AdminFlashSalesController {
  constructor(private readonly adminFlashSalesService: AdminFlashSalesService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách flash sale' })
  findAll(): Promise<AdminFlashSaleListItem[]> {
    return this.adminFlashSalesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Chi tiết flash sale' })
  findById(@Param('id') id: string): Promise<AdminFlashSaleDetail> {
    return this.adminFlashSalesService.findById(id);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @RequirePermissions('marketing:manage')
  @ApiOperation({ summary: '[Admin] Tạo flash sale mới' })
  create(
    @Body(new ZodValidationPipe(flashSaleInputSchema)) body: FlashSaleInput,
  ): Promise<AdminFlashSaleDetail> {
    return this.adminFlashSalesService.create(body);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @RequirePermissions('marketing:manage')
  @ApiOperation({ summary: '[Admin] Cập nhật flash sale' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(flashSaleInputSchema)) body: FlashSaleInput,
  ): Promise<AdminFlashSaleDetail> {
    return this.adminFlashSalesService.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @RequirePermissions('marketing:manage')
  @ApiOperation({ summary: '[Admin] Xoá flash sale' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminFlashSalesService.remove(id);
    return { success: true };
  }
}
