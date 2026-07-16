import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type SiteSettings,
  type UpdateSiteSettingsInput,
  updateSiteSettingsSchema,
} from '@repo/contracts';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminSettingsService } from './admin-settings.service';

@ApiTags('admin-settings')
@ApiBearerAuth()
@Controller('admin/settings')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
@RequirePermissions('settings:read')
@AuditLog('Settings')
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Xem cấu hình cửa hàng' })
  getSettings(): Promise<SiteSettings> {
    return this.adminSettingsService.getSettings();
  }

  @Patch()
  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @RequirePermissions('settings:manage')
  @ApiOperation({ summary: '[Admin] Cập nhật cấu hình cửa hàng' })
  updateSettings(
    @Body(new ZodValidationPipe(updateSiteSettingsSchema)) body: UpdateSiteSettingsInput,
  ): Promise<SiteSettings> {
    return this.adminSettingsService.updateSettings(body);
  }
}
