import { Injectable, NotFoundException } from '@nestjs/common';
import type { Address } from '@prisma/client';
import type { AddressInput, AddressView } from '@repo/contracts';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<AddressView[]> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return addresses.map(this.toView);
  }

  async create(userId: string, input: AddressInput): Promise<AddressView> {
    if (input.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    const address = await this.prisma.address.create({
      data: { userId, ...input },
    });

    return this.toView(address);
  }

  async update(userId: string, addressId: string, input: AddressInput): Promise<AddressView> {
    await this.ensureOwnership(userId, addressId);

    if (input.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.update({
      where: { id: addressId },
      data: { ...input },
    });

    return this.toView(address);
  }

  async remove(userId: string, addressId: string): Promise<void> {
    const { count } = await this.prisma.address.deleteMany({ where: { id: addressId, userId } });
    if (count === 0) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }
  }

  private async ensureOwnership(userId: string, addressId: string): Promise<void> {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
      select: { id: true },
    });
    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }
  }

  private toView(address: Address): AddressView {
    return {
      id: address.id,
      type: address.type,
      recipient: address.recipient,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      ward: address.ward,
      district: address.district,
      province: address.province,
      postalCode: address.postalCode,
      isDefault: address.isDefault,
    };
  }
}
