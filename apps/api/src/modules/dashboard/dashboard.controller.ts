import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import type { DashboardSummary } from '@repo/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('admin-dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: '[Admin] Tổng quan số liệu' })
  getSummary(): Promise<DashboardSummary> {
    return this.dashboardService.getSummary();
  }
}
