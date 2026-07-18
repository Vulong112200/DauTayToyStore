import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse, ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from '@repo/contracts';
import { RoleName } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { AppConfiguration } from '../../config/configuration';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CartService } from '../cart/cart.service';
import { EmailService } from '../notifications/email.service';
import { parseDurationToMs } from '../../common/utils/duration.util';
import { hashToken } from './utils/token-hash.util';

interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfiguration, true>,
    private readonly auditLogService: AuditLogService,
    private readonly emailService: EmailService,
    private readonly cartService: CartService,
  ) {
    this.googleClient = new OAuth2Client(this.configService.get('google.clientId', { infer: true }));
  }

  async register(
    input: RegisterInput,
    meta: RequestMetadata,
    guestCartSessionId?: string,
  ): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await argon2.hash(input.password);
    const customerRole = await this.prisma.role.findUniqueOrThrow({
      where: { name: RoleName.CUSTOMER },
    });

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        roles: { create: [{ roleId: customerRole.id }] },
      },
      include: { roles: { include: { role: true } } },
    });

    await this.auditLogService.record({
      actorId: user.id,
      action: 'user.register',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await this.mergeGuestCartIfNeeded(user.id, guestCartSessionId);

    return this.buildAuthResponse(user, meta);
  }

  async login(
    input: LoginInput,
    meta: RequestMetadata,
    guestCartSessionId?: string,
  ): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { roles: { include: { role: true } } },
    });

    if (!user || !user.passwordHash || !user.isActive) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, input.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditLogService.record({
      actorId: user.id,
      action: 'user.login',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await this.mergeGuestCartIfNeeded(user.id, guestCartSessionId);

    return this.buildAuthResponse(user, meta);
  }

  async loginWithGoogle(
    idToken: string,
    meta: RequestMetadata,
    guestCartSessionId?: string,
  ): Promise<AuthResponse> {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.configService.get('google.clientId', { infer: true }),
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('Không thể xác thực tài khoản Google');
    }

    const customerRole = await this.prisma.role.findUniqueOrThrow({
      where: { name: RoleName.CUSTOMER },
    });

    let user = await this.prisma.user.findUnique({
      where: { email: payload.email },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: payload.email,
          fullName: payload.name ?? payload.email,
          avatarUrl: payload.picture,
          authProvider: 'GOOGLE',
          googleId: payload.sub,
          isEmailVerified: payload.email_verified ?? true,
          roles: { create: [{ roleId: customerRole.id }] },
        },
        include: { roles: { include: { role: true } } },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: payload.sub, authProvider: 'GOOGLE' },
        include: { roles: { include: { role: true } } },
      });
    }

    // A deactivated account must not be able to sign in via Google either — password login
    // (loginWithPassword) and token refresh both reject !isActive, so mirror that here rather
    // than letting a banned user mint fresh refresh tokens and trigger a cart merge.
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    }

    await this.auditLogService.record({
      actorId: user.id,
      action: 'user.login.google',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await this.mergeGuestCartIfNeeded(user.id, guestCartSessionId);

    return this.buildAuthResponse(user, meta);
  }

  async refresh(refreshToken: string, meta: RequestMetadata): Promise<AuthResponse> {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const tokenHash = hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã bị thu hồi');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không hợp lệ');
    }

    const response = await this.buildAuthResponse(user, meta);

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date(), replacedBy: hashToken(response.tokens.refreshToken) },
    });

    return response;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      this.logger.log(`Password reset requested for unknown email: ${input.email}`);
      return;
    }

    const rawToken = randomUUID();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + parseDurationToMs('1h'));

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const resetUrl = `${this.configService.get('corsOrigin', { infer: true })}/reset-password?token=${rawToken}`;

    await this.emailService.sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      resetUrl,
    });
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = hashToken(input.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }

    const passwordHash = await argon2.hash(input.password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /** Never lets a merge failure block the login/register response itself — same
   * never-break-the-caller philosophy as AuditLogService.record. */
  private async mergeGuestCartIfNeeded(userId: string, sessionId: string | undefined): Promise<void> {
    if (!sessionId) return;

    try {
      await this.cartService.mergeGuestCartIntoUserCart(userId, sessionId);
    } catch (error) {
      this.logger.error(
        'Failed to merge guest cart into user cart',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async buildAuthResponse(
    user: {
      id: string;
      email: string;
      fullName: string;
      phone: string | null;
      avatarUrl: string | null;
      isEmailVerified: boolean;
      createdAt: Date;
      roles: Array<{ role: { name: RoleName } }>;
    },
    meta: RequestMetadata,
  ): Promise<AuthResponse> {
    const roles = user.roles.map((userRole) => userRole.role.name);

    const accessExpiresIn = this.configService.get('jwt.accessExpiresIn', { infer: true });
    const refreshExpiresIn = this.configService.get('jwt.refreshExpiresIn', { infer: true });

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.configService.get('jwt.accessSecret', { infer: true }),
        expiresIn: accessExpiresIn,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id },
      {
        secret: this.configService.get('jwt.refreshSecret', { infer: true }),
        expiresIn: refreshExpiresIn,
      },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + parseDurationToMs(refreshExpiresIn)),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        roles,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt.toISOString(),
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: Math.floor(parseDurationToMs(accessExpiresIn) / 1000),
      },
    };
  }
}
