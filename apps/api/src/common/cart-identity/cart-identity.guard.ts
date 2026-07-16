import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AppConfiguration } from '../../config/configuration';
import { CartIdentity } from './cart-identity';

export const CART_SESSION_HEADER = 'x-cart-session';

/**
 * Resolves the caller's cart identity — either the authenticated user (Bearer
 * token) or a guest session id header. Shared by any feature that needs to
 * find "the current cart" (Cart, Orders/checkout), so it lives under
 * common/ rather than inside a single feature module.
 */
@Injectable()
export class CartIdentityGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfiguration, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { cartIdentity?: CartIdentity }>();

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = await this.jwtService.verifyAsync<{ sub: string }>(
          authHeader.slice('Bearer '.length),
          { secret: this.configService.get('jwt.accessSecret', { infer: true }) },
        );
        request.cartIdentity = { userId: payload.sub };
        return true;
      } catch {
        // Invalid/expired access token — fall back to guest session identity below.
      }
    }

    const sessionHeader = request.headers[CART_SESSION_HEADER];
    const sessionId = Array.isArray(sessionHeader) ? sessionHeader[0] : sessionHeader;

    if (sessionId) {
      request.cartIdentity = { sessionId };
      return true;
    }

    throw new BadRequestException(
      `Yêu cầu đăng nhập hoặc gửi header "${CART_SESSION_HEADER}" để định danh giỏ hàng`,
    );
  }
}
