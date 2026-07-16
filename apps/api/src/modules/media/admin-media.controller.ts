import {
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminMediaAsset,
  type AdminMediaQuery,
  type PaginatedResponse,
  adminMediaQuerySchema,
} from '@repo/contracts';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { AdminMediaService } from './admin-media.service';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

@ApiTags('admin-media')
@ApiBearerAuth()
@Controller('admin/media')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
@AuditLog('MediaAsset')
export class AdminMediaController {
  constructor(private readonly adminMediaService: AdminMediaService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách tệp trong thư viện' })
  findList(
    @Query(new ZodValidationPipe(adminMediaQuerySchema)) query: AdminMediaQuery,
  ): Promise<PaginatedResponse<AdminMediaAsset>> {
    return this.adminMediaService.findList(query);
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[Admin] Tải tệp lên thư viện' })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() actor: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE_BYTES })],
      }),
    )
    file: Express.Multer.File,
  ): Promise<AdminMediaAsset> {
    return this.adminMediaService.upload(file, actor.id);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @ApiOperation({ summary: '[Admin] Xoá tệp khỏi thư viện' })
  async remove(@Param('id') id: string): Promise<{ success: true }> {
    await this.adminMediaService.remove(id);
    return { success: true };
  }
}
