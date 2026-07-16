import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminComboDealDetail,
  type AdminComboDealListItem,
  type ComboDealInput,
  comboDealInputSchema,
} from '@repo/contracts';
import { AuditLog } from '../../../common/decorators/audit-log.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminComboDealsService } from './admin-combo-deals.service';

@ApiTags('admin-combo-deals')
@ApiBearerAuth()
@Controller('admin/combo-deals')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
@AuditLog('ComboDeal')
export class AdminComboDealsController {
  constructor(private readonly adminComboDealsService: AdminComboDealsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách combo' })
  findAll(): Promise<AdminComboDealListItem[]> {
    return this.adminComboDealsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Chi tiết combo' })
  findById(@Param('id') id: string): Promise<AdminComboDealDetail> {
    return this.adminComboDealsService.findById(id);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Tạo combo mới' })
  create(
    @Body(new ZodValidationPipe(comboDealInputSchema)) body: ComboDealInput,
  ): Promise<AdminComboDealDetail> {
    return this.adminComboDealsService.create(body);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Cập nhật combo' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(comboDealInputSchema)) body: ComboDealInput,
  ): Promise<AdminComboDealDetail> {
    return this.adminComboDealsService.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Xoá combo' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminComboDealsService.remove(id);
    return { success: true };
  }
}
