import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { type AdminBrand, type BrandInput, brandInputSchema } from '@repo/contracts';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminBrandsService } from './admin-brands.service';

@ApiTags('admin-brands')
@ApiBearerAuth()
@Controller('admin/brands')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
export class AdminBrandsController {
  constructor(private readonly adminBrandsService: AdminBrandsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách thương hiệu' })
  findAll(): Promise<AdminBrand[]> {
    return this.adminBrandsService.findAll();
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Tạo thương hiệu mới' })
  create(@Body(new ZodValidationPipe(brandInputSchema)) body: BrandInput): Promise<AdminBrand> {
    return this.adminBrandsService.create(body);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Cập nhật thương hiệu' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(brandInputSchema)) body: BrandInput,
  ): Promise<AdminBrand> {
    return this.adminBrandsService.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Xoá thương hiệu' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminBrandsService.remove(id);
    return { success: true };
  }
}
