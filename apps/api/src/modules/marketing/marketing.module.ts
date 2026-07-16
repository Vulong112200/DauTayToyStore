import { Module } from '@nestjs/common';
import { AdminCouponsController } from './coupons/admin-coupons.controller';
import { AdminCouponsService } from './coupons/admin-coupons.service';
import { AdminFlashSalesController } from './flash-sales/admin-flash-sales.controller';
import { AdminFlashSalesService } from './flash-sales/admin-flash-sales.service';

@Module({
  controllers: [AdminCouponsController, AdminFlashSalesController],
  providers: [AdminCouponsService, AdminFlashSalesService],
  exports: [AdminCouponsService],
})
export class MarketingModule {}
