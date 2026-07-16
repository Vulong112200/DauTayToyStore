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

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
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
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không hợp lệ hoặc đã bị vô hiệu hoá');
    }

    const permissions = new Set<string>();
    for (const userRole of user.roles) {
      for (const rolePermission of userRole.role.permissions) {
        permissions.add(rolePermission.permission.key);
      }
    }

    return {
      id: user.id,
      email: user.email,
      roles: user.roles.map((userRole) => userRole.role.name) as RoleName[],
      permissions: [...permissions],
    };
  }
}
