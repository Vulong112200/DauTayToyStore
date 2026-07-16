import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = {
  title: 'Quên mật khẩu',
  description: 'Khôi phục mật khẩu tài khoản DauTayToy Store của bạn.',
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Quên mật khẩu?"
      description="Nhập email để nhận liên kết đặt lại mật khẩu"
      footer={{ question: 'Đã nhớ mật khẩu?', linkLabel: 'Đăng nhập', href: '/login' }}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
