import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { R2Service } from '../../infra/r2/r2.service';
import { AdminMediaService } from './admin-media.service';

describe('AdminMediaService', () => {
  let service: AdminMediaService;
  let prisma: {
    mediaAsset: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };
  let r2Service: { upload: jest.Mock; remove: jest.Mock };

  const assetRow = {
    id: 'a1',
    key: 'media/a1.png',
    url: 'https://media.example.com/media/a1.png',
    type: 'IMAGE' as const,
    mimeType: 'image/png',
    sizeBytes: 1024,
    width: null,
    height: null,
    altText: null,
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    prisma = {
      mediaAsset: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    r2Service = { upload: jest.fn(), remove: jest.fn() };
    service = new AdminMediaService(
      prisma as unknown as PrismaService,
      r2Service as unknown as R2Service,
    );
  });

  describe('upload', () => {
    it('uploads the buffer to R2 and stores a MediaAsset row', async () => {
      r2Service.upload.mockResolvedValue('https://media.example.com/media/a1.png');
      prisma.mediaAsset.create.mockResolvedValue(assetRow);

      const file = {
        originalname: 'photo.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('data'),
      } as Express.Multer.File;

      const result = await service.upload(file, 'user-1');

      expect(r2Service.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^media\/.+\.png$/),
        file.buffer,
        'image/png',
      );
      expect(prisma.mediaAsset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'IMAGE', mimeType: 'image/png', uploadedBy: 'user-1' }),
        }),
      );
      expect(result.id).toBe('a1');
    });

    it('classifies non-image/video mime types as DOCUMENT', async () => {
      r2Service.upload.mockResolvedValue('https://media.example.com/media/a1.pdf');
      prisma.mediaAsset.create.mockResolvedValue({ ...assetRow, type: 'DOCUMENT' });

      const file = {
        originalname: 'invoice.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        buffer: Buffer.from('data'),
      } as Express.Multer.File;

      await service.upload(file, null);

      const [args] = prisma.mediaAsset.create.mock.calls[0];
      expect(args.data.type).toBe('DOCUMENT');
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the asset does not exist', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes from R2 and the database', async () => {
      prisma.mediaAsset.findUnique.mockResolvedValue({ key: 'media/a1.png' });

      await service.remove('a1');

      expect(r2Service.remove).toHaveBeenCalledWith('media/a1.png');
      expect(prisma.mediaAsset.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    });
  });

  describe('findList', () => {
    it('filters by type when provided', async () => {
      prisma.mediaAsset.findMany.mockResolvedValue([]);
      prisma.mediaAsset.count.mockResolvedValue(0);

      await service.findList({ page: 1, pageSize: 24, type: 'IMAGE' });

      const [args] = prisma.mediaAsset.findMany.mock.calls[0];
      expect(args.where).toEqual({ type: 'IMAGE' });
    });
  });
});
