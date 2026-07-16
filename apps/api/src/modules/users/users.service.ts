import { Injectable } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import type { UpdateProfileInput, UserProfile } from '@repo/contracts';
import { PrismaService } from '../../infra/prisma/prisma.service';

interface UserWithRoles {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  createdAt: Date;
  roles: Array<{ role: { name: RoleName } }>;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });
    return this.toProfile(user);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { ...input },
      include: { roles: { include: { role: true } } },
    });
    return this.toProfile(user);
  }

  private toProfile(user: UserWithRoles): UserProfile {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      roles: user.roles.map((entry) => entry.role.name),
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
