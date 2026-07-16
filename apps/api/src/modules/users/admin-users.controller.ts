import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import {
  type AdminUpdateUserInput,
  type AdminUserListItem,
  type AdminUserQuery,
  type CreateUserInput,
  type PaginatedResponse,
  type UpdateUserRolesInput,
  adminUpdateUserInputSchema,
  adminUserQuerySchema,
  createUserInputSchema,
  updateUserRolesInputSchema,
} from '@repo/contracts';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { AdminUsersService } from './admin-users.service';

@ApiTags('admin-users')
@ApiBearerAuth()
@Controller('admin/users')
@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
@AuditLog('User')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách người dùng' })
  findList(
    @Query(new ZodValidationPipe(adminUserQuerySchema)) query: AdminUserQuery,
  ): Promise<PaginatedResponse<AdminUserListItem>> {
    return this.adminUsersService.findList(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Chi tiết người dùng' })
  findById(@Param('id') id: string): Promise<AdminUserListItem> {
    return this.adminUsersService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: '[Admin] Tạo tài khoản mới (nhân viên/quản trị)' })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body(new ZodValidationPipe(createUserInputSchema)) body: CreateUserInput,
  ): Promise<AdminUserListItem> {
    return this.adminUsersService.create(actor.roles, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin] Cập nhật thông tin/vô hiệu hoá người dùng' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adminUpdateUserInputSchema)) body: AdminUpdateUserInput,
  ): Promise<AdminUserListItem> {
    return this.adminUsersService.update(actor.id, id, body);
  }

  @Patch(':id/roles')
  @ApiOperation({ summary: '[Admin] Gán lại vai trò cho người dùng' })
  updateRoles(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserRolesInputSchema)) body: UpdateUserRolesInput,
  ): Promise<AdminUserListItem> {
    return this.adminUsersService.updateRoles(actor.id, actor.roles, id, body);
  }
}
