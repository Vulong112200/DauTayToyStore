import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Đăng ký',
  description: 'Tạo tài khoản DauTayToy Store để mua sắm, theo dõi đơn hàng và nhận ưu đãi.',
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Tạo tài khoản mới"
      description="Đăng ký để nhận nhiều ưu đãi hấp dẫn từ DauTayToy Store"
      footer={{ question: 'Đã có tài khoản?', linkLabel: 'Đăng nhập', href: '/login' }}
    >
      <RegisterForm />
    </AuthCard>
  );
}
