import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminCategory,
  type CategoryInput,
  categoryInputSchema,
} from '@repo/contracts';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminCategoriesService } from './admin-categories.service';

@ApiTags('admin-categories')
@ApiBearerAuth()
@Controller('admin/categories')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
export class AdminCategoriesController {
  constructor(private readonly adminCategoriesService: AdminCategoriesService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách danh mục (bao gồm cả không hoạt động)' })
  findAll(): Promise<AdminCategory[]> {
    return this.adminCategoriesService.findAll();
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Tạo danh mục mới' })
  create(
    @Body(new ZodValidationPipe(categoryInputSchema)) body: CategoryInput,
  ): Promise<AdminCategory> {
    return this.adminCategoriesService.create(body);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Cập nhật danh mục' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(categoryInputSchema)) body: CategoryInput,
  ): Promise<AdminCategory> {
    return this.adminCategoriesService.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Xoá danh mục' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminCategoriesService.remove(id);
    return { success: true };
  }
}
