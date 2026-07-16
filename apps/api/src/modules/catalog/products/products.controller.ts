import { Controller, Get, Param, Query, UsePipes } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginatedResponse, ProductDetail, ProductListItem, ProductListQuery } from '@repo/contracts';
import { productListQuerySchema } from '@repo/contracts';
import { Public } from '../../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách sản phẩm (lọc, sắp xếp, phân trang)' })
  @UsePipes(new ZodValidationPipe(productListQuerySchema))
  findList(@Query() query: ProductListQuery): Promise<PaginatedResponse<ProductListItem>> {
    return this.productsService.findList(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Chi tiết sản phẩm theo slug' })
  findBySlug(@Param('slug') slug: string): Promise<ProductDetail> {
    return this.productsService.findBySlug(slug);
  }
}
