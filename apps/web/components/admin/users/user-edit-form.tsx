'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  type AdminUpdateUserInput,
  type AdminUserListItem,
  RoleName,
  adminUpdateUserInputSchema,
} from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ROLE_OPTIONS: { value: RoleName; label: string }[] = [
  { value: RoleName.SUPER_ADMIN, label: 'Super Admin' },
  { value: RoleName.ADMIN, label: 'Admin' },
  { value: RoleName.STAFF, label: 'Nhân viên' },
  { value: RoleName.CUSTOMER, label: 'Khách hàng' },
];

const ELEVATED_ROLES: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.ADMIN];

export function UserEditForm({
  user,
  isSuperAdmin,
  isSelf,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  user: AdminUserListItem;
  isSuperAdmin: boolean;
  isSelf: boolean;
  onSubmit: (input: AdminUpdateUserInput, roles: RoleName[]) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminUpdateUserInput & { roles: RoleName[] }>({
    resolver: zodResolver(adminUpdateUserInputSchema),
    defaultValues: {
      fullName: user.fullName,
      phone: user.phone ?? undefined,
      isActive: user.isActive,
      roles: user.roles as RoleName[],
    },
  });

  const submit = handleSubmit(({ roles, ...input }) => onSubmit(input, roles));

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border p-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`fullName-${user.id}`}>Họ và tên</Label>
          <Input
            id={`fullName-${user.id}`}
            aria-invalid={!!errors.fullName}
            {...register('fullName')}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`phone-${user.id}`}>Số điện thoại</Label>
          <Input id={`phone-${user.id}`} {...register('phone')} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id={`isActive-${user.id}`}
            disabled={isSelf}
            className="h-4 w-4 rounded border-input"
            {...register('isActive')}
          />
          <Label htmlFor={`isActive-${user.id}`} className="mb-0">
            Đang hoạt động
            {isSelf && <span className="ml-1 text-xs text-muted-foreground">(không thể tự khoá)</span>}
          </Label>
        </div>
      </div>

      <div>
        <Label>Vai trò</Label>
        <div className="mt-2 flex flex-wrap gap-4">
          {ROLE_OPTIONS.map((option) => {
            const isDisabled = isSelf || (!isSuperAdmin && ELEVATED_ROLES.includes(option.value));
            return (
              <label
                key={option.value}
                className="flex items-center gap-2 text-sm data-[disabled=true]:opacity-50"
                data-disabled={isDisabled}
              >
                <input
                  type="checkbox"
                  value={option.value}
                  disabled={isDisabled}
                  className="h-4 w-4 rounded border-input"
                  {...register('roles')}
                />
                {option.label}
              </label>
            );
          })}
        </div>
        {isSelf && (
          <p className="mt-1 text-xs text-muted-foreground">
            Bạn không thể tự thay đổi vai trò của chính mình.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Huỷ
        </Button>
      </div>
    </form>
  );
}
