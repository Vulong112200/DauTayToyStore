import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleName } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthService } from './auth.service';
import { hashToken } from './utils/token-hash.util';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    role: { findUniqueOrThrow: jest.Mock };
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    passwordResetToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let configService: { get: jest.Mock };
  let auditLogService: { record: jest.Mock };
  let emailService: { sendPasswordResetEmail: jest.Mock };

  const configValues: Record<string, unknown> = {
    'jwt.accessSecret': 'access-secret-for-tests-min-32-characters',
    'jwt.accessExpiresIn': '15m',
    'jwt.refreshSecret': 'refresh-secret-for-tests-min-32-characters',
    'jwt.refreshExpiresIn': '30d',
    'google.clientId': 'test-google-client-id',
    corsOrigin: 'http://localhost:3000',
  };

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      role: { findUniqueOrThrow: jest.fn() },
      refreshToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      passwordResetToken: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
    jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
    configService = { get: jest.fn((key: string) => configValues[key]) };
    auditLogService = { record: jest.fn() };
    emailService = { sendPasswordResetEmail: jest.fn() };

    authService = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      configService as unknown as ConfigService<never, true>,
      auditLogService as unknown as AuditLogService,
      emailService as unknown as EmailService,
    );

    jwtService.signAsync.mockResolvedValue('signed.jwt.token');
  });

  describe('register', () => {
    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        authService.register(
          { email: 'taken@example.com', password: 'Password1', fullName: 'Nguyen Van A' },
          {},
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a user with hashed password and CUSTOMER role', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findUniqueOrThrow.mockResolvedValue({ id: 'role-customer', name: RoleName.CUSTOMER });
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'new@example.com',
        fullName: 'Nguyen Van A',
        phone: null,
        avatarUrl: null,
        isEmailVerified: false,
        createdAt: new Date('2026-01-01'),
        roles: [{ role: { name: RoleName.CUSTOMER } }],
      });
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.register(
        { email: 'new@example.com', password: 'Password1', fullName: 'Nguyen Van A' },
        { ipAddress: '127.0.0.1' },
      );

      expect(prisma.user.create).toHaveBeenCalled();
      const createArgs = prisma.user.create.mock.calls[0][0];
      expect(createArgs.data.passwordHash).not.toBe('Password1');
      expect(result.user.email).toBe('new@example.com');
      expect(result.user.roles).toEqual([RoleName.CUSTOMER]);
      expect(result.tokens.accessToken).toBe('signed.jwt.token');
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'user.register' }),
      );
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'whatever' }, {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const passwordHash = await argon2.hash('CorrectPassword1');
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        passwordHash,
        isActive: true,
        roles: [{ role: { name: RoleName.CUSTOMER } }],
      });

      await expect(
        authService.login({ email: 'user@example.com', password: 'WrongPassword' }, {}),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens for correct credentials', async () => {
      const passwordHash = await argon2.hash('CorrectPassword1');
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        fullName: 'Nguyen Van A',
        phone: null,
        avatarUrl: null,
        isEmailVerified: true,
        createdAt: new Date('2026-01-01'),
        passwordHash,
        isActive: true,
        roles: [{ role: { name: RoleName.CUSTOMER } }],
      });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await authService.login(
        { email: 'user@example.com', password: 'CorrectPassword1' },
        {},
      );

      expect(result.tokens.accessToken).toBe('signed.jwt.token');
      expect(result.tokens.refreshToken).toBe('signed.jwt.token');
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tokenHash: hashToken('signed.jwt.token') }),
        }),
      );
    });
  });

  describe('refresh', () => {
    it('rejects an invalid/expired JWT', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(authService.refresh('bad-token', {})).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a revoked refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(authService.refresh('revoked-token', {})).rejects.toThrow(UnauthorizedException);
    });

    it('rotates a valid refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 100000),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        fullName: 'Nguyen Van A',
        phone: null,
        avatarUrl: null,
        isEmailVerified: true,
        createdAt: new Date('2026-01-01'),
        isActive: true,
        roles: [{ role: { name: RoleName.CUSTOMER } }],
      });
      prisma.refreshToken.create.mockResolvedValue({});
      prisma.refreshToken.update.mockResolvedValue({});

      const result = await authService.refresh('valid-token', {});

      expect(result.tokens.accessToken).toBe('signed.jwt.token');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } }),
      );
    });
  });
});
