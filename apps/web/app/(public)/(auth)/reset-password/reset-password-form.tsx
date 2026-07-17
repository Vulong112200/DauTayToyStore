'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type ResetPasswordInput, resetPasswordSchema } from '@repo/contracts';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/api/auth';

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDone, setIsDone] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(values);
      setIsDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Không thể đặt lại mật khẩu');
    } finally {
      setIsSubmitting(false);
    }
  });

  if (!token) {
    return (
      <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
        Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu liên kết mới.
      </p>
    );
  }

  if (isDone) {
    return (
      <p className="rounded-lg bg-pastel-mint px-4 py-3 text-sm text-foreground">
        Đặt lại mật khẩu thành công! Đang chuyển đến trang đăng nhập...
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={serverError} />
      <input type="hidden" {...register('token')} />

      <div className="space-y-1.5">
        <Label htmlFor="password">Mật khẩu mới</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
      </Button>
    </form>
  );
}
