import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Brand } from '@prisma/client';
import type { AdminBrand, BrandInput } from '@repo/contracts';
import { PrismaService } from '../../../infra/prisma/prisma.service';

@Injectable()
export class AdminBrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<AdminBrand[]> {
    const brands = await this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
    return brands.map((brand) => this.toView(brand));
  }

  async create(input: BrandInput): Promise<AdminBrand> {
    await this.assertUniqueSlug(input.slug);

    const brand = await this.prisma.brand.create({
      data: {
        name: input.name,
        slug: input.slug,
        logoUrl: input.logoUrl ?? null,
        description: input.description ?? null,
        originCountry: input.originCountry ?? null,
        isActive: input.isActive,
      },
    });

    return this.toView(brand);
  }

  async update(id: string, input: BrandInput): Promise<AdminBrand> {
    await this.ensureExists(id);
    await this.assertUniqueSlug(input.slug, id);

    const brand = await this.prisma.brand.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        // `?? null` so clearing an optional field in the form resets it —
        // Prisma treats `undefined` on `.update()` as "leave untouched".
        logoUrl: input.logoUrl ?? null,
        description: input.description ?? null,
        originCountry: input.originCountry ?? null,
        isActive: input.isActive,
      },
    });

    return this.toView(brand);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.brand.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const brand = await this.prisma.brand.findUnique({ where: { id }, select: { id: true } });
    if (!brand) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }
  }

  private async assertUniqueSlug(slug: string, excludeId?: string): Promise<void> {
    const conflict = await this.prisma.brand.findFirst({
      where: { slug, ...(excludeId && { id: { not: excludeId } }) },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('Slug đã được sử dụng');
    }
  }

  private toView(brand: Brand): AdminBrand {
    return {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      logoUrl: brand.logoUrl,
      description: brand.description,
      originCountry: brand.originCountry,
      isActive: brand.isActive,
    };
  }
}
