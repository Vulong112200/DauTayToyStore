'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { type RegisterInput, registerSchema } from '@repo/contracts';
import { FormError } from '@/components/auth/form-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CART_QUERY_KEY } from '@/hooks/use-cart';
import { ApiError } from '@/lib/api-client';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth-store';

export function RegisterForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await authApi.register(values);
      setSession(response.user, response.tokens);
      // The API may have just merged a guest cart into this new account's cart —
      // drop the cached (pre-signup) cart so the next read reflects the merge.
      await queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      router.push('/');
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Đăng ký thất bại');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={serverError} />

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Họ và tên</Label>
        <Input
          id="fullName"
          autoComplete="name"
          placeholder="Nguyễn Văn A"
          aria-invalid={!!errors.fullName}
          {...register('fullName')}
        />
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Số điện thoại (tuỳ chọn)</Label>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="0912345678"
          aria-invalid={!!errors.phone}
          {...register('phone')}
        />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
      </Button>
    </form>
  );
}
