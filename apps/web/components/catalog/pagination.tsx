'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function CatalogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function hrefForPage(target: number): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(target));
    return `${pathname}?${params.toString()}`;
  }

  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Phân trang">
      {page > 1 ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={hrefForPage(page - 1)}>Trước</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Trước
        </Button>
      )}
      <span className="text-sm text-muted-foreground">
        Trang {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Button variant="outline" size="sm" asChild>
          <Link href={hrefForPage(page + 1)}>Sau</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Sau
        </Button>
      )}
    </nav>
  );
}
