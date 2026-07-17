import { Module } from '@nestjs/common';
import { CartIdentityModule } from '../../common/cart-identity/cart-identity.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [CartIdentityModule, PaymentsModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, AdminOrdersService],
  exports: [OrdersService, AdminOrdersService],
})
export class OrdersModule {}
