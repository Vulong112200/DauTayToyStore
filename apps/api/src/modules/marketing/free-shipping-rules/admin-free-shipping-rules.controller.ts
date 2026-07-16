import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminFreeShippingRule,
  type FreeShippingRuleInput,
  freeShippingRuleInputSchema,
} from '@repo/contracts';
import { AuditLog } from '../../../common/decorators/audit-log.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminFreeShippingRulesService } from './admin-free-shipping-rules.service';

@ApiTags('admin-free-shipping-rules')
@ApiBearerAuth()
@Controller('admin/free-shipping-rules')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
@AuditLog('FreeShippingRule')
export class AdminFreeShippingRulesController {
  constructor(private readonly adminFreeShippingRulesService: AdminFreeShippingRulesService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách quy tắc miễn phí vận chuyển' })
  findAll(): Promise<AdminFreeShippingRule[]> {
    return this.adminFreeShippingRulesService.findAll();
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Tạo quy tắc miễn phí vận chuyển' })
  create(
    @Body(new ZodValidationPipe(freeShippingRuleInputSchema)) body: FreeShippingRuleInput,
  ): Promise<AdminFreeShippingRule> {
    return this.adminFreeShippingRulesService.create(body);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Cập nhật quy tắc miễn phí vận chuyển' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(freeShippingRuleInputSchema)) body: FreeShippingRuleInput,
  ): Promise<AdminFreeShippingRule> {
    return this.adminFreeShippingRulesService.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Xoá quy tắc miễn phí vận chuyển' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminFreeShippingRulesService.remove(id);
    return { success: true };
  }
}
