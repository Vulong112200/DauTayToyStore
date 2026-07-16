import type { Metadata } from 'next';
import { AdminGuard } from '@/components/admin/admin-guard';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminTopbar } from '@/components/admin/admin-topbar';

export const metadata: Metadata = {
  title: { default: 'Quản trị', template: '%s | Quản trị DauTayToy' },
  robots: { index: false, follow: false },
};

// Admin pages are inherently per-session (behind a client-side auth/role
// guard reading localStorage) — never statically prerenderable, and trying
// to do so fails at build time since browser-only APIs aren't available
// during the server prerender pass.
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <AdminTopbar />
          <main className="flex-1 bg-muted/20 p-6">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
