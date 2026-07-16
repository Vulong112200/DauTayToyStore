import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type BlogPostDetail,
  type BlogPostListItem,
  type PaginatedResponse,
  type PaginationQuery,
  paginationQuerySchema,
} from '@repo/contracts';
import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { BlogService } from './blog.service';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách bài viết blog' })
  findList(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
  ): Promise<PaginatedResponse<BlogPostListItem>> {
    return this.blogService.findList(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Chi tiết bài viết blog' })
  findBySlug(@Param('slug') slug: string): Promise<BlogPostDetail> {
    return this.blogService.findBySlug(slug);
  }
}
