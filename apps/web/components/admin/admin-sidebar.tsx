'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  FolderTree,
  Gift,
  History,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  Newspaper,
  Package,
  Settings,
  ShoppingBag,
  Tag,
  Ticket,
  Truck,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBag },
  { href: '/admin/products', label: 'Sản phẩm', icon: Package },
  { href: '/admin/inventory', label: 'Tồn kho', icon: Boxes },
  { href: '/admin/categories', label: 'Danh mục', icon: FolderTree },
  { href: '/admin/brands', label: 'Thương hiệu', icon: Tag },
  { href: '/admin/coupons', label: 'Mã giảm giá', icon: Ticket },
  { href: '/admin/flash-sales', label: 'Flash Sale', icon: Zap },
  { href: '/admin/gift-vouchers', label: 'Phiếu quà tặng', icon: Gift },
  { href: '/admin/combo-deals', label: 'Combo sản phẩm', icon: Layers },
  { href: '/admin/buy-x-get-y-rules', label: 'Mua X tặng Y', icon: Gift },
  { href: '/admin/free-shipping-rules', label: 'Miễn phí vận chuyển', icon: Truck },
  { href: '/admin/blog', label: 'Bài viết', icon: Newspaper },
  { href: '/admin/blog-categories', label: 'Danh mục blog', icon: FolderTree },
  { href: '/admin/banners', label: 'Banner', icon: ImageIcon },
  { href: '/admin/media', label: 'Thư viện media', icon: ImageIcon },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/reports', label: 'Báo cáo', icon: BarChart3 },
  { href: '/admin/audit-logs', label: 'Nhật ký hệ thống', icon: History },
  { href: '/admin/settings', label: 'Cấu hình', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/admin" className="font-display text-lg font-extrabold text-primary">
          🧸 Admin
        </Link>
      </div>
      <nav className="space-y-1 p-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/80 hover:bg-muted',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
