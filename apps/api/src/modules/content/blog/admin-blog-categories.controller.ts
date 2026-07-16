import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminBlogCategory,
  type BlogCategoryInput,
  blogCategoryInputSchema,
} from '@repo/contracts';
import { AuditLog } from '../../../common/decorators/audit-log.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminBlogCategoriesService } from './admin-blog-categories.service';

@ApiTags('admin-blog-categories')
@ApiBearerAuth()
@Controller('admin/blog-categories')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
@AuditLog('BlogCategory')
export class AdminBlogCategoriesController {
  constructor(private readonly adminBlogCategoriesService: AdminBlogCategoriesService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách danh mục blog' })
  findAll(): Promise<AdminBlogCategory[]> {
    return this.adminBlogCategoriesService.findAll();
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Tạo danh mục blog mới' })
  create(
    @Body(new ZodValidationPipe(blogCategoryInputSchema)) body: BlogCategoryInput,
  ): Promise<AdminBlogCategory> {
    return this.adminBlogCategoriesService.create(body);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Cập nhật danh mục blog' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(blogCategoryInputSchema)) body: BlogCategoryInput,
  ): Promise<AdminBlogCategory> {
    return this.adminBlogCategoriesService.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Xoá danh mục blog' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminBlogCategoriesService.remove(id);
    return { success: true };
  }
}
