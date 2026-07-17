'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AddressBook } from '@/components/profile/address-book';
import { OrderHistoryList } from '@/components/profile/order-history-list';
import { ProfileInfoForm } from '@/components/profile/profile-info-form';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth-store';

export function ProfileView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    if (tokens?.refreshToken) {
      try {
        await authApi.logout(tokens.refreshToken);
      } catch {
        // Best-effort server-side revoke — clear the local session regardless.
      }
    }
    clearSession();
    // Drop all cached queries so per-user data (wishlist, orders, profile) from
    // this session can't leak into the next login and is refetched cleanly.
    queryClient.clear();
    router.push('/');
    router.refresh();
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-lg font-medium">Đăng nhập để xem thông tin tài khoản</p>
        <Button asChild>
          <Link href="/login">Đăng nhập</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <section>
          <h2 className="font-display text-lg font-bold">Thông tin cá nhân</h2>
          <div className="mt-4">
            <ProfileInfoForm />
          </div>
        </section>

        <section>
          <AddressBook />
        </section>
      </div>

      <div>
        <h2 className="font-display text-lg font-bold">Lịch sử đơn hàng</h2>
        <div className="mt-4">
          <OrderHistoryList />
        </div>
        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
        </Button>
      </div>
    </div>
  );
}
