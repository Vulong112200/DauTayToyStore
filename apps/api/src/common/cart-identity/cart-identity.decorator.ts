import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';
import { CartIdentity } from './cart-identity';

export const CurrentCartIdentity = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CartIdentity => {
    const request = ctx.switchToHttp().getRequest<Request & { cartIdentity?: CartIdentity }>();
    return request.cartIdentity as CartIdentity;
  },
);
