import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminInventoryItem,
  type AdminInventoryQuery,
  type PaginatedResponse,
  type UpdateInventoryInput,
  adminInventoryQuerySchema,
  updateInventoryInputSchema,
} from '@repo/contracts';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { InventoryService } from './inventory.service';

@ApiTags('admin-inventory')
@ApiBearerAuth()
@Controller('admin/inventory')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
@AuditLog('Inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách tồn kho' })
  findList(
    @Query(new ZodValidationPipe(adminInventoryQuerySchema)) query: AdminInventoryQuery,
  ): Promise<PaginatedResponse<AdminInventoryItem>> {
    return this.inventoryService.findList(query);
  }

  @Patch(':productId')
  @ApiOperation({ summary: '[Admin] Điều chỉnh tồn kho sản phẩm' })
  update(
    @Param('productId') productId: string,
    @Body(new ZodValidationPipe(updateInventoryInputSchema)) body: UpdateInventoryInput,
  ): Promise<AdminInventoryItem> {
    return this.inventoryService.update(productId, body);
  }
}
