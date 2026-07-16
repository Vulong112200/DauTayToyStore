import { Module } from '@nestjs/common';
import { CartIdentityModule } from '../../common/cart-identity/cart-identity.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [CartIdentityModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
