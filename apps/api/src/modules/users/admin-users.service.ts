import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import * as argon2 from 'argon2';
import type {
  AdminUpdateUserInput,
  AdminUserListItem,
  AdminUserQuery,
  CreateUserInput,
  PaginatedResponse,
  UpdateUserRolesInput,
} from '@repo/contracts';
import { PrismaService } from '../../infra/prisma/prisma.service';

/** Only a SUPER_ADMIN may grant ADMIN/SUPER_ADMIN — an ADMIN can manage STAFF/CUSTOMER only. */
const ELEVATED_ROLES: RoleName[] = [RoleName.ADMIN, RoleName.SUPER_ADMIN];

interface UserWithRoles {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: Date;
  roles: Array<{ role: { name: RoleName } }>;
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findList(query: AdminUserQuery): Promise<PaginatedResponse<AdminUserListItem>> {
    const where: Prisma.UserWhereInput = {
      ...(query.q && {
        OR: [
          { fullName: { contains: query.q, mode: 'insensitive' } },
          { email: { contains: query.q, mode: 'insensitive' } },
        ],
      }),
      ...(query.role && { roles: { some: { role: { name: query.role } } } }),
    };

    const [rows, totalItems] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { roles: { include: { role: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map((user) => this.toListItem(user)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async findById(id: string): Promise<AdminUserListItem> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return this.toListItem(user);
  }

  async create(actorRoles: RoleName[], input: CreateUserInput): Promise<AdminUserListItem> {
    this.assertCanAssignRoles(actorRoles, input.roles);

    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await argon2.hash(input.password);
    const roleRows = await this.prisma.role.findMany({ where: { name: { in: input.roles } } });

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        // Admin-created accounts skip the usual email-verification flow.
        isEmailVerified: true,
        roles: { create: roleRows.map((role) => ({ roleId: role.id })) },
      },
      include: { roles: { include: { role: true } } },
    });

    return this.toListItem(user);
  }

  async update(actorId: string, id: string, input: AdminUpdateUserInput): Promise<AdminUserListItem> {
    if (actorId === id && input.isActive === false) {
      throw new BadRequestException('Bạn không thể tự vô hiệu hoá tài khoản của mình');
    }

    const existing = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      include: { roles: { include: { role: true } } },
    });

    return this.toListItem(user);
  }

  async updateRoles(
    actorId: string,
    actorRoles: RoleName[],
    id: string,
    input: UpdateUserRolesInput,
  ): Promise<AdminUserListItem> {
    if (actorId === id) {
      throw new BadRequestException('Bạn không thể tự thay đổi vai trò của mình');
    }

    this.assertCanAssignRoles(actorRoles, input.roles);

    const existing = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const roleRows = await this.prisma.role.findMany({ where: { name: { in: input.roles } } });

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roleRows.map((role) => ({ userId: id, roleId: role.id })),
      }),
    ]);

    return this.findById(id);
  }

  private assertCanAssignRoles(actorRoles: RoleName[], targetRoles: RoleName[]): void {
    const isActorSuperAdmin = actorRoles.includes(RoleName.SUPER_ADMIN);
    const targetHasElevatedRole = targetRoles.some((role) => ELEVATED_ROLES.includes(role));
    if (targetHasElevatedRole && !isActorSuperAdmin) {
      throw new ForbiddenException('Chỉ SUPER_ADMIN mới có quyền gán vai trò ADMIN/SUPER_ADMIN');
    }
  }

  private toListItem(user: UserWithRoles): AdminUserListItem {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      roles: user.roles.map((entry) => entry.role.name),
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
