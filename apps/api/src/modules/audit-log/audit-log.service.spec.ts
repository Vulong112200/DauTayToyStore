import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let prisma: {
    auditLog: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      auditLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    };
    service = new AuditLogService(prisma as unknown as PrismaService);
  });

  describe('record', () => {
    it('writes a row with the given fields', async () => {
      prisma.auditLog.create.mockResolvedValue({});

      await service.record({ action: 'user.login', entityType: 'User', actorId: 'u1' });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'u1',
          action: 'user.login',
          entityType: 'User',
          entityId: null,
          before: undefined,
          after: undefined,
          ipAddress: null,
          userAgent: null,
        },
      });
    });

    it('swallows errors so a failed write never breaks the caller', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.record({ action: 'user.login', entityType: 'User' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('findList', () => {
    it('applies actor/entityType/action/date-range filters', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      prisma.auditLog.count.mockResolvedValue(0);

      await service.findList({
        page: 1,
        pageSize: 20,
        actorId: 'u1',
        entityType: 'Product',
        action: 'Product.update',
        dateFrom: '2026-01-01T00:00:00.000Z',
        dateTo: '2026-02-01T00:00:00.000Z',
      });

      const [args] = prisma.auditLog.findMany.mock.calls[0];
      expect(args.where).toMatchObject({
        actorId: 'u1',
        entityType: 'Product',
        action: 'Product.update',
        createdAt: { gte: new Date('2026-01-01T00:00:00.000Z'), lte: new Date('2026-02-01T00:00:00.000Z') },
      });
    });

    it('maps rows to the admin view shape including the actor email', async () => {
      prisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          actorId: 'u1',
          actor: { email: 'admin@example.com' },
          action: 'Product.update',
          entityType: 'Product',
          entityId: 'p1',
          before: null,
          after: { name: 'LEGO' },
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
          createdAt: new Date('2026-01-01'),
        },
      ]);
      prisma.auditLog.count.mockResolvedValue(1);

      const result = await service.findList({ page: 1, pageSize: 20 });

      expect(result.items[0]).toEqual({
        id: 'log-1',
        actorId: 'u1',
        actorEmail: 'admin@example.com',
        action: 'Product.update',
        entityType: 'Product',
        entityId: 'p1',
        before: null,
        after: { name: 'LEGO' },
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    });
  });
});
