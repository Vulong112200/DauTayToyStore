'use client';

import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuthStore } from '@/store/auth-store';

export function AdminTopbar() {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
        ← Về trang chủ
      </Link>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <span className="text-sm font-medium">{user?.fullName}</span>
      </div>
    </header>
  );
}
