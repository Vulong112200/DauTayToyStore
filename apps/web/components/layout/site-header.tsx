'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, LayoutDashboard, Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { isAdminUser } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

const NAV_LINKS = [
  { href: '/', label: 'Trang chủ' },
  { href: '/categories', label: 'Danh mục' },
  { href: '/products', label: 'Sản phẩm' },
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'Hỏi đáp' },
  { href: '/about', label: 'Giới thiệu' },
  { href: '/contact', label: 'Liên hệ' },
];

export function SiteHeader() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const user = useAuthStore((state) => state.user);
  const { data: cart } = useCart();
  const { data: wishlist } = useWishlist(!!user);
  const itemCount = cart?.itemCount ?? 0;
  const wishlistCount = wishlist?.items.length ?? 0;
  const isAdmin = isAdminUser(user);

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = searchTerm.trim();
    router.push(trimmed ? `/products?q=${encodeURIComponent(trimmed)}` : '/products');
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-display text-xl font-extrabold text-primary">
          <Image
            src="/logo.jpg"
            alt="Dâu Tây Toys"
            width={40}
            height={40}
            className="rounded-full"
            priority
          />
          Dâu Tây Toys
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Điều hướng chính">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form
          onSubmit={handleSearchSubmit}
          className="hidden flex-1 max-w-sm items-center rounded-xl border border-input bg-muted/50 px-3 py-2 md:flex"
        >
          <Search className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm đồ chơi cho bé..."
            aria-label="Tìm kiếm sản phẩm"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </form>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              asChild
              aria-label="Trang quản trị"
              className="hidden sm:inline-flex"
            >
              <Link href="/admin">
                <LayoutDashboard className="h-5 w-5" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label={`Danh sách yêu thích, ${wishlistCount} sản phẩm`}
            className="relative"
          >
            <Link href="/wishlist">
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label={`Giỏ hàng, ${itemCount} sản phẩm`} className="relative">
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            aria-label="Tài khoản"
            className="hidden sm:inline-flex"
          >
            <Link href={user ? '/profile' : '/login'}>
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden border-t border-border transition-[max-height] duration-300 lg:hidden',
          mobileOpen ? 'max-h-96' : 'max-h-0 border-t-0',
        )}
      >
        <nav className="container flex flex-col gap-1 py-3" aria-label="Điều hướng di động">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={user ? '/profile' : '/login'}
            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
            onClick={() => setMobileOpen(false)}
          >
            {user ? 'Tài khoản của tôi' : 'Đăng nhập / Đăng ký'}
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => setMobileOpen(false)}
            >
              Trang quản trị
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
