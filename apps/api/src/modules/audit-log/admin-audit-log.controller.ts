import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminAuditLogItem,
  type AdminAuditLogQuery,
  type PaginatedResponse,
  adminAuditLogQuerySchema,
} from '@repo/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditLogService } from './audit-log.service';

@ApiTags('admin-audit-logs')
@ApiBearerAuth()
@Controller('admin/audit-logs')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
export class AdminAuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách nhật ký hệ thống' })
  findList(
    @Query(new ZodValidationPipe(adminAuditLogQuerySchema)) query: AdminAuditLogQuery,
  ): Promise<PaginatedResponse<AdminAuditLogItem>> {
    return this.auditLogService.findList(query);
  }
}
