import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { type AdminBanner, type BannerInput, bannerInputSchema } from '@repo/contracts';
import { Roles } from '../../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AdminBannersService } from './admin-banners.service';

@ApiTags('admin-banners')
@ApiBearerAuth()
@Controller('admin/banners')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
export class AdminBannersController {
  constructor(private readonly adminBannersService: AdminBannersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách banner' })
  findAll(): Promise<AdminBanner[]> {
    return this.adminBannersService.findAll();
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Tạo banner mới' })
  create(
    @Body(new ZodValidationPipe(bannerInputSchema)) body: BannerInput,
  ): Promise<AdminBanner> {
    return this.adminBannersService.create(body);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Cập nhật banner' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(bannerInputSchema)) body: BannerInput,
  ): Promise<AdminBanner> {
    return this.adminBannersService.update(id, body);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Xoá banner' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminBannersService.remove(id);
    return { success: true };
  }
}
