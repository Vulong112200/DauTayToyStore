import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartIdentityGuard } from './guards/cart-identity.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [CartController],
  providers: [CartService, CartIdentityGuard],
  exports: [CartService],
})
export class CartModule {}
