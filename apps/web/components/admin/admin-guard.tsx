'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthHydrated } from '@/hooks/use-auth-hydrated';
import { isAdminUser } from '@/lib/auth';
import { useAuthStore } from '@/store/auth-store';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  React.useEffect(() => {
    if (hydrated && !user) {
      router.replace('/login');
    }
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdminUser(user)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-medium">Bạn không có quyền truy cập trang quản trị</p>
        <Link href="/" className="text-primary hover:underline">
          Về trang chủ
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
