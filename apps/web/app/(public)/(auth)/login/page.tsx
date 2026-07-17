import type { Metadata } from 'next';
import { Suspense } from 'react';
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
      {/* useSearchParams() inside LoginForm (to read ?redirect) requires a Suspense
          boundary, or `next build` bails the whole route out of static prerendering. */}
      <Suspense fallback={<p className="text-center text-muted-foreground">Đang tải...</p>}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
