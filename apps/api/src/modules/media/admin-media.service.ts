import { randomUUID } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MediaType, Prisma } from '@prisma/client';
import type { AdminMediaAsset, AdminMediaQuery, PaginatedResponse } from '@repo/contracts';
import { R2Service } from '../../infra/r2/r2.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AdminMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2Service: R2Service,
  ) {}

  async upload(
    file: Express.Multer.File,
    uploadedBy: string | null,
  ): Promise<AdminMediaAsset> {
    const extension = file.originalname.includes('.')
      ? file.originalname.slice(file.originalname.lastIndexOf('.'))
      : '';
    const key = `media/${randomUUID()}${extension}`;

    const url = await this.r2Service.upload(key, file.buffer, file.mimetype);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        key,
        url,
        type: this.resolveType(file.mimetype),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedBy,
      },
    });

    return this.toView(asset);
  }

  async findList(query: AdminMediaQuery): Promise<PaginatedResponse<AdminMediaAsset>> {
    const where: Prisma.MediaAssetWhereInput = {
      ...(query.type && { type: query.type }),
    };

    const [rows, totalItems] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toView(row)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async remove(id: string): Promise<void> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id }, select: { key: true } });
    if (!asset) {
      throw new NotFoundException('Không tìm thấy tệp');
    }

    await this.r2Service.remove(asset.key);
    await this.prisma.mediaAsset.delete({ where: { id } });
  }

  private resolveType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    return MediaType.DOCUMENT;
  }

  private toView(asset: {
    id: string;
    key: string;
    url: string;
    type: MediaType;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    altText: string | null;
    createdAt: Date;
  }): AdminMediaAsset {
    return {
      id: asset.id,
      key: asset.key,
      url: asset.url,
      type: asset.type,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      width: asset.width,
      height: asset.height,
      altText: asset.altText,
      createdAt: asset.createdAt.toISOString(),
    };
  }
}
