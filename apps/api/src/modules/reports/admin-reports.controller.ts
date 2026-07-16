import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type OrderStatusBreakdownItem,
  type ReportRangeQuery,
  type RevenueReportPoint,
  type TopProductReportItem,
  reportRangeQuerySchema,
} from '@repo/contracts';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AdminReportsService } from './admin-reports.service';

@ApiTags('admin-reports')
@ApiBearerAuth()
@Controller('admin/reports')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN, RoleName.STAFF)
export class AdminReportsController {
  constructor(private readonly adminReportsService: AdminReportsService) {}

  @Get('revenue')
  @ApiOperation({ summary: '[Admin] Doanh thu theo thời gian' })
  revenueOverTime(
    @Query(new ZodValidationPipe(reportRangeQuerySchema)) query: ReportRangeQuery,
  ): Promise<RevenueReportPoint[]> {
    return this.adminReportsService.revenueOverTime(query);
  }

  @Get('top-products')
  @ApiOperation({ summary: '[Admin] Sản phẩm bán chạy nhất' })
  topProducts(): Promise<TopProductReportItem[]> {
    return this.adminReportsService.topProducts(10);
  }

  @Get('order-status-breakdown')
  @ApiOperation({ summary: '[Admin] Tỉ lệ đơn hàng theo trạng thái' })
  orderStatusBreakdown(): Promise<OrderStatusBreakdownItem[]> {
    return this.adminReportsService.orderStatusBreakdown();
  }
}
