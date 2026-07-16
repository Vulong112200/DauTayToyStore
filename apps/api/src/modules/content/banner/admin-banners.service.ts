import { Injectable, NotFoundException } from '@nestjs/common';
import type { Banner } from '@prisma/client';
import type { AdminBanner, BannerInput } from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class AdminBannersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminBanner[]> {
    const banners = await this.prisma.banner.findMany({
      orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }],
    });
    return banners.map((banner) => this.toView(banner));
  }

  async create(input: BannerInput): Promise<AdminBanner> {
    const banner = await this.prisma.banner.create({
      data: {
        title: input.title,
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl,
        position: input.position,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      },
    });

    return this.toView(banner);
  }

  async update(id: string, input: BannerInput): Promise<AdminBanner> {
    await this.ensureExists(id);

    const banner = await this.prisma.banner.update({
      where: { id },
      data: {
        title: input.title,
        imageUrl: input.imageUrl,
        linkUrl: input.linkUrl ?? null,
        position: input.position,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      },
    });

    return this.toView(banner);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.banner.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const banner = await this.prisma.banner.findUnique({ where: { id }, select: { id: true } });
    if (!banner) {
      throw new NotFoundException('Không tìm thấy banner');
    }
  }

  private toView(banner: Banner): AdminBanner {
    return {
      id: banner.id,
      title: banner.title,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      position: banner.position,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      startsAt: banner.startsAt?.toISOString() ?? null,
      endsAt: banner.endsAt?.toISOString() ?? null,
    };
  }
}
