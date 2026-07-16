import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

/**
 * Runs after `RolesGuard` (see `app.module.ts` registration order) and is purely additive: a
 * route with no `@RequirePermissions()` metadata is unaffected — `RolesGuard` alone still gates
 * it exactly as before. Only routes explicitly opted in get a second, finer-grained check against
 * the requesting user's flattened `Permission.key`s (resolved once per request in
 * `JwtStrategy.validate`, the same place `roles` is already resolved).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) throw new ForbiddenException('Yêu cầu đăng nhập');

    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );
    if (!hasAllPermissions) {
      throw new ForbiddenException('Bạn không có quyền thực hiện hành động này');
    }

    return true;
  }
}
