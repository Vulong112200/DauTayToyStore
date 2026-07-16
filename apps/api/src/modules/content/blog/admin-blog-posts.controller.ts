import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminBlogPostDetail,
  type AdminBlogPostListItem,
  type AdminBlogPostQuery,
  type BlogPostInput,
  type PaginatedResponse,
  adminBlogPostQuerySchema,
  blogPostInputSchema,
} from '@repo/contracts';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminBlogPostsService } from './admin-blog-posts.service';

@ApiTags('admin-blog-posts')
@ApiBearerAuth()
@Controller('admin/blog-posts')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
export class AdminBlogPostsController {
  constructor(private readonly adminBlogPostsService: AdminBlogPostsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách bài viết' })
  findList(
    @Query(new ZodValidationPipe(adminBlogPostQuerySchema)) query: AdminBlogPostQuery,
  ): Promise<PaginatedResponse<AdminBlogPostListItem>> {
    return this.adminBlogPostsService.findList(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Chi tiết bài viết' })
  findById(@Param('id') id: string): Promise<AdminBlogPostDetail> {
    return this.adminBlogPostsService.findById(id);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Tạo bài viết mới' })
  create(
    @Body(new ZodValidationPipe(blogPostInputSchema)) body: BlogPostInput,
  ): Promise<AdminBlogPostDetail> {
    return this.adminBlogPostsService.create(body);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Cập nhật bài viết' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(blogPostInputSchema)) body: BlogPostInput,
  ): Promise<AdminBlogPostDetail> {
    return this.adminBlogPostsService.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Xoá bài viết' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminBlogPostsService.remove(id);
    return { success: true };
  }
}
