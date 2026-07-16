import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CartIdentityGuard } from './cart-identity.guard';

@Module({
  imports: [JwtModule.register({})],
  providers: [CartIdentityGuard],
  // Re-export JwtModule too: Nest resolves a class passed to @UseGuards() by
  // constructing it fresh in the consuming controller's own module context,
  // so that module needs CartIdentityGuard's dependencies (JwtService) visible
  // through the import chain — not just the guard class itself.
  exports: [CartIdentityGuard, JwtModule],
})
export class CartIdentityModule {}
