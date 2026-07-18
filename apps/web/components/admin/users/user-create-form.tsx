'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type CreateUserInput, RoleName, createUserInputSchema } from '@repo/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';

const ROLE_OPTIONS: { value: RoleName; label: string }[] = [
  { value: RoleName.SUPER_ADMIN, label: 'Super Admin' },
  { value: RoleName.ADMIN, label: 'Admin' },
  { value: RoleName.STAFF, label: 'Nhân viên' },
  { value: RoleName.CUSTOMER, label: 'Khách hàng' },
];

const ELEVATED_ROLES: RoleName[] = [RoleName.SUPER_ADMIN, RoleName.ADMIN];

export function UserCreateForm({
  isSuperAdmin,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  isSuperAdmin: boolean;
  onSubmit: (input: CreateUserInput) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserInputSchema),
    defaultValues: { roles: [RoleName.STAFF] },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border border-border p-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Họ và tên</Label>
          <Input id="fullName" aria-invalid={!!errors.fullName} {...register('fullName')} />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mật khẩu</Label>
          <PasswordInput id="password" aria-invalid={!!errors.password} {...register('password')} />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Số điện thoại (tuỳ chọn)</Label>
          <Input id="phone" {...register('phone')} />
        </div>
      </div>

      <div>
        <Label>Vai trò</Label>
        <div className="mt-2 flex flex-wrap gap-4">
          {ROLE_OPTIONS.map((option) => {
            const isDisabled = !isSuperAdmin && ELEVATED_ROLES.includes(option.value);
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
        {errors.roles && <p className="mt-1 text-xs text-destructive">{errors.roles.message}</p>}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang tạo...' : 'Tạo người dùng'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Huỷ
          </Button>
        )}
      </div>
    </form>
  );
}
