import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleName } from '@prisma/client';
import { AppConfiguration } from '../../../config/configuration';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { user: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    const configService = {
      get: jest.fn().mockReturnValue('access-secret'),
    } as unknown as ConfigService<AppConfiguration, true>;
    strategy = new JwtStrategy(configService, prisma as unknown as PrismaService);
  });

  it('throws UnauthorizedException when the user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 'missing', email: 'a@b.com' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when the user is deactivated', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', isActive: false, roles: [] });

    await expect(strategy.validate({ sub: 'u1', email: 'a@b.com' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('flattens and dedupes permission keys across all of the user’s roles', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'staff@dautaytoystore.vn',
      isActive: true,
      roles: [
        {
          role: {
            name: RoleName.STAFF,
            permissions: [
              { permission: { key: 'product:read' } },
              { permission: { key: 'product:update' } },
            ],
          },
        },
        {
          role: {
            name: RoleName.CUSTOMER,
            permissions: [{ permission: { key: 'product:update' } }],
          },
        },
      ],
    });

    const result = await strategy.validate({ sub: 'u1', email: 'staff@dautaytoystore.vn' });

    expect(result.roles).toEqual([RoleName.STAFF, RoleName.CUSTOMER]);
    expect(result.permissions.sort()).toEqual(['product:read', 'product:update']);
  });

  it('returns an empty permissions array for a user whose roles grant none', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'customer@example.com',
      isActive: true,
      roles: [{ role: { name: RoleName.CUSTOMER, permissions: [] } }],
    });

    const result = await strategy.validate({ sub: 'u1', email: 'customer@example.com' });

    expect(result.permissions).toEqual([]);
  });
});
