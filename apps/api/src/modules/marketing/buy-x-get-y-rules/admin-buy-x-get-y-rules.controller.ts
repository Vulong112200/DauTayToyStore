import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminBuyXGetYRule,
  type BuyXGetYRuleInput,
  buyXGetYRuleInputSchema,
} from '@repo/contracts';
import { AuditLog } from '../../../common/decorators/audit-log.decorator';
import { RequirePermissions } from '../../../common/decorators/require-permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminBuyXGetYRulesService } from './admin-buy-x-get-y-rules.service';

@ApiTags('admin-buy-x-get-y-rules')
@ApiBearerAuth()
@Controller('admin/buy-x-get-y-rules')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
@AuditLog('BuyXGetYRule')
export class AdminBuyXGetYRulesController {
  constructor(private readonly adminBuyXGetYRulesService: AdminBuyXGetYRulesService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách chương trình mua X tặng Y' })
  findAll(): Promise<AdminBuyXGetYRule[]> {
    return this.adminBuyXGetYRulesService.findAll();
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @RequirePermissions('marketing:manage')
  @ApiOperation({ summary: '[Admin] Tạo chương trình mua X tặng Y' })
  create(
    @Body(new ZodValidationPipe(buyXGetYRuleInputSchema)) body: BuyXGetYRuleInput,
  ): Promise<AdminBuyXGetYRule> {
    return this.adminBuyXGetYRulesService.create(body);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @RequirePermissions('marketing:manage')
  @ApiOperation({ summary: '[Admin] Cập nhật chương trình mua X tặng Y' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(buyXGetYRuleInputSchema)) body: BuyXGetYRuleInput,
  ): Promise<AdminBuyXGetYRule> {
    return this.adminBuyXGetYRulesService.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @RequirePermissions('marketing:manage')
  @ApiOperation({ summary: '[Admin] Xoá chương trình mua X tặng Y' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminBuyXGetYRulesService.remove(id);
    return { success: true };
  }
}
