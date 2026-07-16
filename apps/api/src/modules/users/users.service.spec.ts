import { RoleName } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: { findUniqueOrThrow: jest.Mock; update: jest.Mock } };

  const userRow = {
    id: 'user-1',
    email: 'a@example.com',
    fullName: 'Nguyen Van A',
    phone: null,
    avatarUrl: null,
    isEmailVerified: true,
    createdAt: new Date('2026-01-01'),
    roles: [{ role: { name: RoleName.CUSTOMER } }],
  };

  beforeEach(() => {
    prisma = {
      user: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
    };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  describe('getProfile', () => {
    it('maps the user and its roles to a UserProfile', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(userRow);

      const result = await service.getProfile('user-1');

      expect(result).toEqual({
        id: 'user-1',
        email: 'a@example.com',
        fullName: 'Nguyen Van A',
        phone: null,
        avatarUrl: null,
        roles: [RoleName.CUSTOMER],
        isEmailVerified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    });
  });

  describe('updateProfile', () => {
    it('updates the user and returns the mapped profile', async () => {
      prisma.user.update.mockResolvedValue({ ...userRow, fullName: 'Nguyen Van B' });

      const result = await service.updateProfile('user-1', { fullName: 'Nguyen Van B' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { fullName: 'Nguyen Van B' },
        }),
      );
      expect(result.fullName).toBe('Nguyen Van B');
    });
  });
});
