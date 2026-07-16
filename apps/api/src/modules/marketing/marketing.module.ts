import { Module } from '@nestjs/common';
import { AdminBuyXGetYRulesController } from './buy-x-get-y-rules/admin-buy-x-get-y-rules.controller';
import { AdminBuyXGetYRulesService } from './buy-x-get-y-rules/admin-buy-x-get-y-rules.service';
import { AdminComboDealsController } from './combo-deals/admin-combo-deals.controller';
import { AdminComboDealsService } from './combo-deals/admin-combo-deals.service';
import { AdminCouponsController } from './coupons/admin-coupons.controller';
import { AdminCouponsService } from './coupons/admin-coupons.service';
import { AdminFlashSalesController } from './flash-sales/admin-flash-sales.controller';
import { AdminFlashSalesService } from './flash-sales/admin-flash-sales.service';
import { AdminFreeShippingRulesController } from './free-shipping-rules/admin-free-shipping-rules.controller';
import { AdminFreeShippingRulesService } from './free-shipping-rules/admin-free-shipping-rules.service';
import { AdminGiftVouchersController } from './gift-vouchers/admin-gift-vouchers.controller';
import { AdminGiftVouchersService } from './gift-vouchers/admin-gift-vouchers.service';

@Module({
  controllers: [
    AdminCouponsController,
    AdminFlashSalesController,
    AdminGiftVouchersController,
    AdminComboDealsController,
    AdminBuyXGetYRulesController,
    AdminFreeShippingRulesController,
  ],
  providers: [
    AdminCouponsService,
    AdminFlashSalesService,
    AdminGiftVouchersService,
    AdminComboDealsService,
    AdminBuyXGetYRulesService,
    AdminFreeShippingRulesService,
  ],
  exports: [AdminCouponsService],
})
export class MarketingModule {}
