import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Đăng nhập',
  description: 'Đăng nhập vào tài khoản DauTayToy Store để mua sắm và theo dõi đơn hàng.',
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Chào mừng trở lại!"
      description="Đăng nhập để tiếp tục mua sắm tại DauTayToy Store"
      footer={{ question: 'Chưa có tài khoản?', linkLabel: 'Đăng ký ngay', href: '/register' }}
    >
      <LoginForm />
    </AuthCard>
  );
}
