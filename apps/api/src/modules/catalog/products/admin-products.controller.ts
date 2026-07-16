import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminProductDetail,
  type AdminProductListItem,
  type AdminProductQuery,
  type PaginatedResponse,
  type ProductInput,
  adminProductQuerySchema,
  productInputSchema,
} from '@repo/contracts';
import { AuditLog } from '../../../common/decorators/audit-log.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminProductsService } from './admin-products.service';

@ApiTags('admin-products')
@ApiBearerAuth()
@Controller('admin/products')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
@AuditLog('Product')
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách sản phẩm (mọi trạng thái)' })
  findList(
    @Query(new ZodValidationPipe(adminProductQuerySchema)) query: AdminProductQuery,
  ): Promise<PaginatedResponse<AdminProductListItem>> {
    return this.adminProductsService.findList(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Chi tiết sản phẩm để chỉnh sửa' })
  findById(@Param('id') id: string): Promise<AdminProductDetail> {
    return this.adminProductsService.findById(id);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Tạo sản phẩm mới' })
  create(
    @Body(new ZodValidationPipe(productInputSchema)) body: ProductInput,
  ): Promise<AdminProductDetail> {
    return this.adminProductsService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Cập nhật sản phẩm' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(productInputSchema)) body: ProductInput,
  ): Promise<AdminProductDetail> {
    return this.adminProductsService.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Lưu trữ (ẩn) sản phẩm' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminProductsService.remove(id);
    return { success: true };
  }
}
