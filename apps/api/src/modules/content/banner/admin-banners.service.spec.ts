import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { AdminBannersService } from './admin-banners.service';

describe('AdminBannersService', () => {
  let service: AdminBannersService;
  let prisma: {
    banner: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const input = {
    title: 'Khai trương',
    imageUrl: 'https://example.com/banner.jpg',
    position: 'HOME_HERO' as const,
    sortOrder: 0,
    isActive: true,
  };

  const bannerRow = {
    id: 'b1',
    title: 'Khai trương',
    imageUrl: 'https://example.com/banner.jpg',
    linkUrl: null,
    position: 'HOME_HERO' as const,
    sortOrder: 0,
    isActive: true,
    startsAt: null,
    endsAt: null,
  };

  beforeEach(() => {
    prisma = {
      banner: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new AdminBannersService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a banner and maps timestamps to ISO strings', async () => {
      prisma.banner.create.mockResolvedValue(bannerRow);

      const result = await service.create(input);

      expect(result).toEqual({
        id: 'b1',
        title: 'Khai trương',
        imageUrl: 'https://example.com/banner.jpg',
        linkUrl: null,
        position: 'HOME_HERO',
        sortOrder: 0,
        isActive: true,
        startsAt: null,
        endsAt: null,
      });
    });

    it('converts startsAt/endsAt strings into Date objects for Prisma', async () => {
      prisma.banner.create.mockResolvedValue(bannerRow);

      await service.create({
        ...input,
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-02-01T00:00:00.000Z',
      });

      const [args] = prisma.banner.create.mock.calls[0];
      expect(args.data.startsAt).toBeInstanceOf(Date);
      expect(args.data.endsAt).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the banner does not exist', async () => {
      prisma.banner.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', input)).rejects.toThrow(NotFoundException);
    });

    it('updates an existing banner', async () => {
      prisma.banner.findUnique.mockResolvedValue({ id: 'b1' });
      prisma.banner.update.mockResolvedValue(bannerRow);

      const result = await service.update('b1', input);

      expect(result.id).toBe('b1');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the banner does not exist', async () => {
      prisma.banner.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('hard-deletes an existing banner', async () => {
      prisma.banner.findUnique.mockResolvedValue({ id: 'b1' });

      await service.remove('b1');

      expect(prisma.banner.delete).toHaveBeenCalledWith({ where: { id: 'b1' } });
    });
  });
});
