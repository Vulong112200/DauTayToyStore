import { PrismaService } from '../../infra/prisma/prisma.service';
import { AdminSettingsService } from './admin-settings.service';

describe('AdminSettingsService', () => {
  let service: AdminSettingsService;
  let prisma: { setting: { findUnique: jest.Mock; upsert: jest.Mock } };

  beforeEach(() => {
    prisma = { setting: { findUnique: jest.fn(), upsert: jest.fn() } };
    service = new AdminSettingsService(prisma as unknown as PrismaService);
  });

  describe('getSettings', () => {
    it('returns defaults when no row exists yet', async () => {
      prisma.setting.findUnique.mockResolvedValue(null);

      const result = await service.getSettings();

      expect(result).toEqual({
        siteName: 'DauTayToy Store',
        freeShippingThreshold: 500_000,
        flatShippingFee: 30_000,
      });
    });

    it('merges the stored value over the defaults', async () => {
      prisma.setting.findUnique.mockResolvedValue({
        key: 'site',
        value: { siteName: 'Custom Store', freeShippingThreshold: 300_000 },
      });

      const result = await service.getSettings();

      expect(result).toEqual({
        siteName: 'Custom Store',
        freeShippingThreshold: 300_000,
        flatShippingFee: 30_000,
      });
    });
  });

  describe('updateSettings', () => {
    it('upserts the merged settings under the "site" key', async () => {
      prisma.setting.findUnique.mockResolvedValue(null);

      const result = await service.updateSettings({ flatShippingFee: 25_000 });

      expect(prisma.setting.upsert).toHaveBeenCalledWith({
        where: { key: 'site' },
        create: {
          key: 'site',
          value: { siteName: 'DauTayToy Store', freeShippingThreshold: 500_000, flatShippingFee: 25_000 },
        },
        update: {
          value: { siteName: 'DauTayToy Store', freeShippingThreshold: 500_000, flatShippingFee: 25_000 },
        },
      });
      expect(result.flatShippingFee).toBe(25_000);
    });

    it('clears an optional contact field when passed null', async () => {
      prisma.setting.findUnique.mockResolvedValue({
        key: 'site',
        value: { siteName: 'Custom Store', contactEmail: 'old@example.com' },
      });

      const result = await service.updateSettings({ contactEmail: null });

      const [args] = prisma.setting.upsert.mock.calls[0];
      expect(args.update.value.contactEmail).toBeNull();
      expect(result.contactEmail).toBeNull();
    });
  });
});
