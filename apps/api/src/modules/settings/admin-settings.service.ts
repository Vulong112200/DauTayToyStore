import { Injectable } from '@nestjs/common';
import type { SiteSettings, UpdateSiteSettingsInput } from '@repo/contracts';
import { PrismaService } from '../../infra/prisma/prisma.service';

const SETTINGS_KEY = 'site';

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'DauTayToy Store',
  freeShippingThreshold: 500_000,
  flatShippingFee: 30_000,
};

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<SiteSettings> {
    const row = await this.prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<SiteSettings>) ?? {}) };
  }

  async updateSettings(input: UpdateSiteSettingsInput): Promise<SiteSettings> {
    const current = await this.getSettings();
    const merged = { ...current, ...input };

    await this.prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      create: { key: SETTINGS_KEY, value: merged },
      update: { value: merged },
    });

    return merged;
  }
}
