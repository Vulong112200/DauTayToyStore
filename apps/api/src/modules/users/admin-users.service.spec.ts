import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    role: { findMany: jest.Mock };
    userRole: { deleteMany: jest.Mock; createMany: jest.Mock };
    $transaction: jest.Mock;
  };

  const userRow = {
    id: 'u1',
    email: 'staff@example.com',
    fullName: 'Nguyen Van Staff',
    phone: null,
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date('2026-01-01'),
    roles: [{ role: { name: RoleName.STAFF } }],
  };

  beforeEach(() => {
    prisma = {
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: { findMany: jest.fn().mockResolvedValue([]) },
      userRole: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn(async (ops: unknown[]) => ops),
    };
    service = new AdminUsersService(prisma as unknown as PrismaService);
  });

  describe('findList', () => {
    it('applies search and role filters', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findList({ page: 1, pageSize: 20, q: 'staff', role: RoleName.STAFF });

      const [args] = prisma.user.findMany.mock.calls[0];
      expect(args.where).toMatchObject({
        OR: [
          { fullName: { contains: 'staff', mode: 'insensitive' } },
          { email: { contains: 'staff', mode: 'insensitive' } },
        ],
        roles: { some: { role: { name: RoleName.STAFF } } },
      });
    });
  });

  describe('create', () => {
    const input = {
      email: 'new@example.com',
      password: 'Password1',
      fullName: 'New Staff',
      roles: [RoleName.STAFF],
    };

    it('throws ForbiddenException when a non-SUPER_ADMIN tries to grant an elevated role', async () => {
      await expect(
        service.create([RoleName.ADMIN], { ...input, roles: [RoleName.ADMIN] }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a SUPER_ADMIN to grant ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findMany.mockResolvedValue([{ id: 'role-admin', name: RoleName.ADMIN }]);
      prisma.user.create.mockResolvedValue({ ...userRow, roles: [{ role: { name: RoleName.ADMIN } }] });

      const result = await service.create([RoleName.SUPER_ADMIN], {
        ...input,
        roles: [RoleName.ADMIN],
      });

      expect(result.roles).toEqual([RoleName.ADMIN]);
    });

    it('throws ConflictException when the email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create([RoleName.SUPER_ADMIN], input)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('throws BadRequestException when deactivating yourself', async () => {
      await expect(
        service.update('u1', 'u1', { isActive: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('admin1', 'missing', { fullName: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates allowed fields', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue(userRow);

      await service.update('admin1', 'u1', { fullName: 'Updated Name', isActive: false });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          data: { fullName: 'Updated Name', isActive: false },
        }),
      );
    });

    it('clears phone when passed null', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue(userRow);

      await service.update('admin1', 'u1', { phone: null });

      const [args] = prisma.user.update.mock.calls[0];
      expect(args.data).toEqual({ phone: null });
    });

    it('leaves phone untouched when it is not provided (undefined)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue(userRow);

      await service.update('admin1', 'u1', { fullName: 'Only name' });

      const [args] = prisma.user.update.mock.calls[0];
      expect(args.data).not.toHaveProperty('phone');
    });
  });

  describe('updateRoles', () => {
    it('throws BadRequestException when changing your own roles', async () => {
      await expect(
        service.updateRoles('u1', [RoleName.SUPER_ADMIN], 'u1', { roles: [RoleName.STAFF] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when an ADMIN tries to grant SUPER_ADMIN', async () => {
      await expect(
        service.updateRoles('admin1', [RoleName.ADMIN], 'u2', { roles: [RoleName.SUPER_ADMIN] }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the target user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRoles('admin1', [RoleName.SUPER_ADMIN], 'missing', {
          roles: [RoleName.STAFF],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('replaces the roles in a transaction', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u2' }) // existence check
        .mockResolvedValueOnce(userRow); // findById at the end
      prisma.role.findMany.mockResolvedValue([{ id: 'role-staff', name: RoleName.STAFF }]);

      await service.updateRoles('admin1', [RoleName.SUPER_ADMIN], 'u2', {
        roles: [RoleName.STAFF],
      });

      expect(prisma.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u2' } });
      expect(prisma.userRole.createMany).toHaveBeenCalledWith({
        data: [{ userId: 'u2', roleId: 'role-staff' }],
      });
    });
  });
});
