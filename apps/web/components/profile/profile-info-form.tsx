'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type UpdateProfileInput, updateProfileSchema } from '@repo/contracts';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProfile, useUpdateProfile } from '@/hooks/use-profile';
import { ApiError } from '@/lib/api-client';

export function ProfileInfoForm() {
  const { data: profile, isLoading } = useProfile(true);
  const updateProfile = useUpdateProfile();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateProfileInput>({ resolver: zodResolver(updateProfileSchema) });

  React.useEffect(() => {
    if (profile) reset({ fullName: profile.fullName, phone: profile.phone ?? undefined });
  }, [profile, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSuccess(false);
    try {
      await updateProfile.mutateAsync(values);
      setSuccess(true);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Không thể cập nhật thông tin');
    }
  });

  if (isLoading || !profile) {
    return <p className="text-sm text-muted-foreground">Đang tải...</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={serverError} />
      {success && (
        <p className="rounded-lg bg-pastel-mint px-3 py-2 text-sm">Đã cập nhật thông tin!</p>
      )}

      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input value={profile.email} disabled />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Họ và tên</Label>
          <Input id="fullName" aria-invalid={!!errors.fullName} {...register('fullName')} />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Số điện thoại</Label>
          <Input id="phone" aria-invalid={!!errors.phone} {...register('phone')} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
      </div>

      <Button type="submit" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
      </Button>
    </form>
  );
}
