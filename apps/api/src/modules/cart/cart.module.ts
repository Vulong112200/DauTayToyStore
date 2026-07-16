import { Module } from '@nestjs/common';
import { CartIdentityModule } from '../../common/cart-identity/cart-identity.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [CartIdentityModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
