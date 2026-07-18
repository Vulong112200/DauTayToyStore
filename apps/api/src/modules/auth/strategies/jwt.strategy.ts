import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { RoleName } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfiguration } from '../../../config/configuration';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AuthenticatedUser } from '../types/authenticated-user';

interface AccessTokenPayload {
  sub: string;
  email: string;
}

// `validate` runs on EVERY authenticated request and used to fire a 4-level-deep
// user→roles→role→role_permissions→permissions include each time (~4-5 SQL
// round-trips), uncached — the dominant per-request DB cost, badly amplified when
// the DB is cross-region and the pooled connection is narrow. We now memoize the
// resolved identity per-user for a short TTL: a burst of requests from one signed-in
// user (page load fires cart/wishlist/profile/orders/addresses at once) collapses to
// a single auth query. Trade-off: a role/permission change for a user takes effect
// after at most AUTH_CACHE_TTL_MS instead of on the very next request — an accepted
// staleness window (see CLAUDE.md). Per-instance Map, so it resets on redeploy/restart.
const AUTH_CACHE_TTL_MS = 60_000;

interface CachedIdentity {
  expiresAt: number;
  value: AuthenticatedUser;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly identityCache = new Map<string, CachedIdentity>();

  constructor(
    configService: ConfigService<AppConfiguration, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.accessSecret', { infer: true }),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    const now = Date.now();
    const cached = this.identityCache.get(payload.sub);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });

    if (!user || !user.isActive) {
      // Never cache a rejection — a reactivated/undeleted account must work on its
      // next request, and a disabled account must fail every request immediately.
      this.identityCache.delete(payload.sub);
      throw new UnauthorizedException('Tài khoản không hợp lệ hoặc đã bị vô hiệu hoá');
    }

    const permissions = new Set<string>();
    for (const userRole of user.roles) {
      for (const rolePermission of userRole.role.permissions) {
        permissions.add(rolePermission.permission.key);
      }
    }

    const identity: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      roles: user.roles.map((userRole) => userRole.role.name) as RoleName[],
      permissions: [...permissions],
    };

    this.identityCache.set(payload.sub, { expiresAt: now + AUTH_CACHE_TTL_MS, value: identity });
    return identity;
  }
}
