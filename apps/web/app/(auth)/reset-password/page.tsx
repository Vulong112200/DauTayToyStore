import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = {
  title: 'Đặt lại mật khẩu',
  description: 'Đặt lại mật khẩu cho tài khoản DauTayToy Store của bạn.',
};

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Đặt lại mật khẩu" description="Nhập mật khẩu mới cho tài khoản của bạn">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Đang tải...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
